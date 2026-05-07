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

/* ── WiFi credentials (set via idf.py menuconfig) ────────────────────── */
#define WIFI_SSID           CONFIG_WIFI_SSID
#define WIFI_PASS           CONFIG_WIFI_PASSWORD
#define WIFI_MAXIMUM_RETRY  5

/* ── MQTT broker (set via idf.py menuconfig) ─────────────────────────── */
#define MQTT_BROKER_URI     CONFIG_MQTT_BROKER_URI
#define MQTT_USERNAME       CONFIG_MQTT_USERNAME
#define MQTT_PASSWORD       CONFIG_MQTT_PASSWORD
#define MQTT_GATEWAY_ID     CONFIG_MQTT_GATEWAY_ID

static const char *TAG = "mqtt-demo";

/* MAC address string buffer: "AA:BB:CC:DD:EE:FF" + null */
static char device_mac[18];

/* Topic buffers for subscribe/publish */
static char topic_subscribe[64];   /* iot/v1/{gatewayId}/{mac}/command */
static char topic_state[64];       /* iot/v1/{gatewayId}/{mac}/state  */

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
    ESP_LOGI(TAG, "Subscribe topic: %s", topic_subscribe);
    ESP_LOGI(TAG, "Publish topic:   %s", topic_state);
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

static void mqtt_event_handler(void *handler_args, esp_event_base_t base,
                                int32_t event_id, void *event_data)
{
    esp_mqtt_event_handle_t  event  = (esp_mqtt_event_handle_t)event_data;
    esp_mqtt_client_handle_t client = event->client;

    switch ((esp_mqtt_event_id_t)event_id) {
        case MQTT_EVENT_CONNECTED:
            ESP_LOGI(TAG, "MQTT connected to broker");

            /* Report initial state as off */
            esp_mqtt_client_publish(client, topic_state, "state=off", 0, 1, 0);
            ESP_LOGI(TAG, "Published to %s: state=off", topic_state);

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
    ESP_ERROR_CHECK(esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID,
                                                   mqtt_event_handler, NULL));
    ESP_ERROR_CHECK(esp_mqtt_client_start(client));
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

    get_device_mac();
    build_topics();

    wifi_init_sta();
    mqtt_start();
}
