#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "nvs_flash.h"
#include "esp_netif.h"
#include "mqtt_client.h"
#include "esp_crt_bundle.h"
#include "driver/gpio.h"
#include "esp_timer.h"

/* ── WiFi credentials (set via idf.py menuconfig) ────────────────────── */
#define WIFI_SSID           CONFIG_WIFI_SSID
#define WIFI_PASS           CONFIG_WIFI_PASSWORD
#define WIFI_MAXIMUM_RETRY  5

/* ── MQTT broker (set via idf.py menuconfig) ─────────────────────────── */
#define MQTT_BROKER_URI     CONFIG_MQTT_BROKER_URI
#define MQTT_USERNAME       CONFIG_MQTT_USERNAME
#define MQTT_PASSWORD       CONFIG_MQTT_PASSWORD
#define MQTT_GATEWAY_ID     CONFIG_MQTT_GATEWAY_ID

/* ── GPIO Pins ────────────────────────────────────────────────────────── */
#define PIR_PIN             GPIO_NUM_26
#define RELAY_PIN           GPIO_NUM_25

/* ── Relay timing ─────────────────────────────────────────────────────── */
#define KEEP_ON_DURATION_MS 10000  /* 10 seconds */

static const char *TAG = "mqtt-demo";

/* Relay state tracking */
static int64_t relay_off_time = 0;    /* Timestamp (us) when relay should turn off */
static bool relay_is_active = false;  /* Whether the relay is currently ON */

/* MAC address string buffer: "AA:BB:CC:DD:EE:FF" + null */
static char device_mac[18];

/* Topic buffers for subscribe/publish */
static char topic_subscribe[64];   /* iot/v1/{gatewayId}/{mac}/command */
static char topic_state[64];       /* iot/v1/{gatewayId}/{mac}/state  */
static char topic_ping[64];        /* iot/v1/{gatewayId}/{mac}/ping   */

/* MQTT client handle for ping task */
static esp_mqtt_client_handle_t mqtt_client = NULL;

static void get_device_mac(void)
{
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    snprintf(device_mac, sizeof(device_mac),
             "%02X:%02X:%02X:%02X:%02X:%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    ESP_LOGI(TAG, "Device MAC: %s", device_mac);
}

static void build_topics(void)
{
    snprintf(topic_subscribe, sizeof(topic_subscribe),
             "iot/v1/%s/%s/command", MQTT_GATEWAY_ID, device_mac);
    snprintf(topic_state, sizeof(topic_state),
             "iot/v1/%s/%s/state", MQTT_GATEWAY_ID, device_mac);
    snprintf(topic_ping, sizeof(topic_ping),
             "iot/v1/%s/%s/ping", MQTT_GATEWAY_ID, device_mac);
    ESP_LOGI(TAG, "Subscribe topic: %s", topic_subscribe);
    ESP_LOGI(TAG, "Publish topic:   %s", topic_state);
    ESP_LOGI(TAG, "Ping topic:      %s", topic_ping);
}

static EventGroupHandle_t s_wifi_event_group;
#define WIFI_CONNECTED_BIT  BIT0
#define WIFI_FAIL_BIT       BIT1
static int s_retry_num = 0;

/* ── WiFi ──────────────────────────────────────────────────────────────*/

static void wifi_event_handler(void *arg, esp_event_base_t event_base,
                                int32_t event_id, void *event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        if (s_retry_num < WIFI_MAXIMUM_RETRY) {
            esp_wifi_connect();
            s_retry_num++;
            ESP_LOGW(TAG, "WiFi disconnected, retrying (%d/%d)...", s_retry_num, WIFI_MAXIMUM_RETRY);
        } else {
            xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT);
            ESP_LOGE(TAG, "WiFi connection failed after %d retries", WIFI_MAXIMUM_RETRY);
        }
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        ESP_LOGI(TAG, "Got IP: " IPSTR, IP2STR(&event->ip_info.ip));
        s_retry_num = 0;
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

static void wifi_init_sta(void)
{
    s_wifi_event_group = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID,
                                                        &wifi_event_handler, NULL, &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP,
                                                        &wifi_event_handler, NULL, &instance_got_ip));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid     = WIFI_SSID,
            .password = WIFI_PASS,
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "Connecting to WiFi SSID: %s ...", WIFI_SSID);

    EventBits_t bits = xEventGroupWaitBits(s_wifi_event_group,
                                           WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
                                           pdFALSE, pdFALSE, portMAX_DELAY);
    if (bits & WIFI_CONNECTED_BIT) {
        ESP_LOGI(TAG, "Connected to WiFi: %s", WIFI_SSID);
    } else {
        ESP_LOGE(TAG, "Failed to connect to WiFi: %s", WIFI_SSID);
    }
}

/* ── MQTT ──────────────────────────────────────────────────────────────*/

static void ping_task(void *arg)
{
    (void)arg;
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(60000)); /* 60 seconds */
        if (mqtt_client) {
            esp_mqtt_client_publish(mqtt_client, topic_ping, "ping", 0, 0, 0);
            ESP_LOGI(TAG, "Ping sent to %s", topic_ping);
        }
    }
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base,
                                int32_t event_id, void *event_data)
{
    esp_mqtt_event_handle_t  event  = (esp_mqtt_event_handle_t)event_data;
    esp_mqtt_client_handle_t client = event->client;

    switch ((esp_mqtt_event_id_t)event_id) {
        case MQTT_EVENT_CONNECTED:
            ESP_LOGI(TAG, "MQTT connected to broker");

            /* Report initial state as on (auto trigger — boot) */
            esp_mqtt_client_publish(client, topic_state, "state=on,trigger=auto", 0, 1, 0);
            ESP_LOGI(TAG, "Published to %s: state=on,trigger=auto", topic_state);

            /* Send first ping immediately */
            esp_mqtt_client_publish(client, topic_ping, "ping", 0, 0, 0);
            ESP_LOGI(TAG, "Initial ping sent to %s", topic_ping);

            /* Subscribe to command topic */
            esp_mqtt_client_subscribe(client, topic_subscribe, 1);
            ESP_LOGI(TAG, "Subscribed to topic: \"%s\"", topic_subscribe);
            break;

        case MQTT_EVENT_DISCONNECTED:
            ESP_LOGW(TAG, "MQTT disconnected");
            break;

        case MQTT_EVENT_SUBSCRIBED:
            ESP_LOGI(TAG, "Subscription confirmed, msg_id=%d", event->msg_id);
            break;

        case MQTT_EVENT_DATA:
            /* Print topic and payload; both are NOT null-terminated */
            ESP_LOGI(TAG, "--- Message received ---");
            ESP_LOGI(TAG, "Topic : %.*s", event->topic_len, event->topic);
            ESP_LOGI(TAG, "Data  : %.*s", event->data_len,  event->data);

            /* Handle command: "command=on" or "command=off" — control relay and report state */
            if (event->data_len > 0 && event->data_len < 32) {
                char cmd[32];
                int len = event->data_len < (int)sizeof(cmd) - 1 ? event->data_len : (int)sizeof(cmd) - 1;
                memcpy(cmd, event->data, len);
                cmd[len] = '\0';

                /* Parse "command=<value>" format */
                char *value = strchr(cmd, '=');
                if (value) {
                    value++; /* skip '=' */
                } else {
                    value = cmd; /* fallback: plain "on"/"off" */
                }

                if (strcmp(value, "on") == 0) {
                    gpio_set_level(RELAY_PIN, 1);
                    relay_is_active = true;
                    relay_off_time = esp_timer_get_time() + (KEEP_ON_DURATION_MS * 1000LL);
                    esp_mqtt_client_publish(client, topic_state, "state=on,trigger=manual", 0, 1, 0);
                    ESP_LOGI(TAG, "Command 'on' received, relay ON");
                } else if (strcmp(value, "off") == 0) {
                    gpio_set_level(RELAY_PIN, 0);
                    relay_is_active = false;
                    esp_mqtt_client_publish(client, topic_state, "state=off,trigger=manual", 0, 1, 0);
                    ESP_LOGI(TAG, "Command 'off' received, relay OFF");
                }
            }
            break;

        case MQTT_EVENT_ERROR:
            ESP_LOGE(TAG, "MQTT error");
            if (event->error_handle->error_type == MQTT_ERROR_TYPE_TCP_TRANSPORT) {
                ESP_LOGE(TAG, "  TLS error       : 0x%x", event->error_handle->esp_tls_last_esp_err);
                ESP_LOGE(TAG, "  TLS stack error : 0x%x", event->error_handle->esp_tls_stack_err);
                ESP_LOGE(TAG, "  Transport error : %s",
                         strerror(event->error_handle->esp_transport_sock_errno));
            }
            break;

        default:
            break;
    }
}

static void mqtt_start(void)
{
    esp_mqtt_client_config_t mqtt_cfg = {
        .broker = {
            .address = {
                .uri = MQTT_BROKER_URI,
            },
            .verification = {
                /* Use ESP-IDF's bundled Mozilla root CA certificates —
                   covers Let's Encrypt used by HiveMQ Cloud.           */
                .crt_bundle_attach = esp_crt_bundle_attach,
            },
        },
        .credentials = {
            .username = MQTT_USERNAME,
            .authentication = {
                .password = MQTT_PASSWORD,
            },
        },
    };

    esp_mqtt_client_handle_t client = esp_mqtt_client_init(&mqtt_cfg);
    mqtt_client = client;
    ESP_ERROR_CHECK(esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID,
                                                   mqtt_event_handler, NULL));
    ESP_ERROR_CHECK(esp_mqtt_client_start(client));

    /* Start periodic ping task */
    xTaskCreate(ping_task, "ping_task", 2048, NULL, 5, NULL);
}

/* ── Sensor loop task ──────────────────────────────────────────────────*/

static void sensor_loop_task(void *arg)
{
    (void)arg;
    while (1) {
        int pir_state = gpio_get_level(PIR_PIN);
        int64_t current_time = esp_timer_get_time();

        /* If motion is detected, turn/keep the relay ON and reset the timer */
        if (pir_state == 1) {
            relay_off_time = current_time + (KEEP_ON_DURATION_MS * 1000LL);

            if (!relay_is_active) {
                ESP_LOGI(TAG, "Motion detected! Relay ON.");
                gpio_set_level(RELAY_PIN, 1);
                relay_is_active = true;

                if (mqtt_client) {
                    esp_mqtt_client_publish(mqtt_client, topic_state,
                                           "state=on,trigger=motion", 0, 1, 0);
                }
            }
        }

        /* If no motion, check if the 10-second window has expired */
        if (relay_is_active && (current_time >= relay_off_time)) {
            ESP_LOGI(TAG, "10 seconds passed since last motion. Relay OFF.");
            gpio_set_level(RELAY_PIN, 0);
            relay_is_active = false;

            if (mqtt_client) {
                esp_mqtt_client_publish(mqtt_client, topic_state,
                                       "state=off,trigger=motion", 0, 1, 0);
            }
        }

        vTaskDelay(pdMS_TO_TICKS(50));
    }
}

/* ── Entry point ───────────────────────────────────────────────────────*/

void app_main(void)
{
    /* NVS is required by the WiFi driver */
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    /* Configure GPIO pins */
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << RELAY_PIN),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&io_conf);
    gpio_set_level(RELAY_PIN, 0);

    io_conf.pin_bit_mask = (1ULL << PIR_PIN);
    io_conf.mode = GPIO_MODE_INPUT;
    gpio_config(&io_conf);

    get_device_mac();
    build_topics();

    wifi_init_sta();
    mqtt_start();

    /* Start sensor loop task */
    xTaskCreate(sensor_loop_task, "sensor_loop", 4096, NULL, 5, NULL);
}
