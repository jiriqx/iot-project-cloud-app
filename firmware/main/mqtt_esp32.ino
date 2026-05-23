#include <stdio.h>
#include <string.h>
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "nvs_flash.h"
#include "esp_netif.h"
#include "mqtt_client.h"
#include "esp_crt_bundle.h"

// ── HARDCODED CONFIGURATION ──────────────────────────────────────────────
#define WIFI_SSID           "WIFI_SSID"
#define WIFI_PASS           "WIFI_PASS"
#define WIFI_MAXIMUM_RETRY  5

#define MQTT_BROKER_URI     "mqtts://MQTT_BROKER_URI:8883"
#define MQTT_USERNAME       "MQTT_USERNAME"
#define MQTT_PASSWORD       "MQTT_PASSWORD"
#define MQTT_GATEWAY_ID     "MQTT_GATEWAY_ID"

// ── PINS ─────────────────────────────────────────────────────────────────
const int pirPin = 26;
const int relePin = 25;

// ── MQTT & SYSTEM VARIABLES ──────────────────────────────────────────────
static const char *TAG = "mqtt-demo";
static char device_mac[18];
static char topic_subscribe[64];
static char topic_state[64];
static char topic_ping[64];

static esp_mqtt_client_handle_t mqtt_client = NULL;
static EventGroupHandle_t s_wifi_event_group;
#define WIFI_CONNECTED_BIT  BIT0
#define WIFI_FAIL_BIT       BIT1
static int s_retry_num = 0;

// ── NEW TIME TRACKING VARIABLES FOR THE 10s DELAY ────────────────────────
unsigned long relayOffTime = 0;       // Timestamp of when the relay should turn off
const unsigned long keepOnDuration = 10000; // 10 seconds in milliseconds
bool relayIsActive = false;           // Tracks if the relay is currently ON

// (Background WiFi & MQTT functions omitted for brevity, keep them exactly as they were)
static void get_device_mac(void) { uint8_t mac[6]; esp_read_mac(mac, ESP_MAC_WIFI_STA); snprintf(device_mac, sizeof(device_mac), "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]); }
static void build_topics(void) { snprintf(topic_subscribe, sizeof(topic_subscribe), "iot/v1/%s/%s/command", MQTT_GATEWAY_ID, device_mac); snprintf(topic_state, sizeof(topic_state), "iot/v1/%s/%s/state", MQTT_GATEWAY_ID, device_mac); snprintf(topic_ping, sizeof(topic_ping), "iot/v1/%s/%s/ping", MQTT_GATEWAY_ID, device_mac); }
static void wifi_event_handler(void *arg, esp_event_base_t event_base, int32_t event_id, void *event_data) { if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) { esp_wifi_connect(); } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) { if (s_retry_num < WIFI_MAXIMUM_RETRY) { esp_wifi_connect(); s_retry_num++; } else { xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT); } } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) { s_retry_num = 0; xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT); } }
static void wifi_init_sta(void) { s_wifi_event_group = xEventGroupCreate(); esp_netif_init(); esp_event_loop_create_default(); esp_netif_create_default_wifi_sta(); wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT(); esp_wifi_init(&cfg); esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, NULL); esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, NULL); wifi_config_t wifi_config = {}; strcpy((char*)wifi_config.sta.ssid, WIFI_SSID); strcpy((char*)wifi_config.sta.password, WIFI_PASS); wifi_config.sta.threshold.authmode = WIFI_AUTH_WPA2_PSK; esp_wifi_set_mode(WIFI_MODE_STA); esp_wifi_set_config(WIFI_IF_STA, &wifi_config); esp_wifi_start(); xEventGroupWaitBits(s_wifi_event_group, WIFI_CONNECTED_BIT | WIFI_FAIL_BIT, pdFALSE, pdFALSE, portMAX_DELAY); }
static void ping_task(void *arg) { while (1) { vTaskDelay(pdMS_TO_TICKS(60000)); if (mqtt_client) { esp_mqtt_client_publish(mqtt_client, topic_ping, "ping", 0, 0, 0); } } }
static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) { esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data; esp_mqtt_client_handle_t client = event->client; if (event_id == MQTT_EVENT_CONNECTED) { esp_mqtt_client_publish(client, topic_state, "state=ready,trigger=auto", 0, 1, 0); esp_mqtt_client_subscribe(client, topic_subscribe, 1); } else if (event_id == MQTT_EVENT_DATA) { if (event->data_len > 0 && event->data_len < 16) { char cmd[16] = {0}; memcpy(cmd, event->data, event->data_len); if (strcmp(cmd, "on") == 0) { digitalWrite(relePin, HIGH); relayIsActive = true; relayOffTime = millis() + keepOnDuration; esp_mqtt_client_publish(client, topic_state, "state=on,trigger=manual", 0, 1, 0); } else if (strcmp(cmd, "off") == 0) { digitalWrite(relePin, LOW); relayIsActive = false; esp_mqtt_client_publish(client, topic_state, "state=off,trigger=manual", 0, 1, 0); } } } }
static void mqtt_start(void) { esp_mqtt_client_config_t mqtt_cfg = {}; mqtt_cfg.broker.address.uri = MQTT_BROKER_URI; mqtt_cfg.broker.verification.crt_bundle_attach = esp_crt_bundle_attach; mqtt_cfg.credentials.username = MQTT_USERNAME; mqtt_cfg.credentials.authentication.password = MQTT_PASSWORD; mqtt_client = esp_mqtt_client_init(&mqtt_cfg); esp_mqtt_client_register_event(mqtt_client, (esp_mqtt_event_id_t)ESP_EVENT_ANY_ID, mqtt_event_handler, NULL); esp_mqtt_client_start(mqtt_client); xTaskCreate(ping_task, "ping_task", 4096, NULL, 5, NULL); }

void setup() {
  Serial.begin(115200);
  delay(500); // Give serial time to stabilize
  Serial.println("\n--- ESP32 Booting Up ---");
  pinMode(pirPin, INPUT);
  pinMode(relePin, OUTPUT);
  digitalWrite(relePin, LOW);

  esp_err_t ret = nvs_flash_init();
  if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
      nvs_flash_erase();
      nvs_flash_init();
  }
  get_device_mac();
  build_topics();
  wifi_init_sta();
  mqtt_start();
}

// ── STANDARD ARDUINO LOOP ────────────────────────────────────────────────
void loop() {
  int pirState = digitalRead(pirPin);
  unsigned long currentTime = millis();

  // 1. If motion is detected, turn/keep the relay ON and reset the timer
  if (pirState == HIGH) {
    relayOffTime = currentTime + keepOnDuration; // Push shutdown time 10s into the future

    if (!relayIsActive) {
      Serial.println("Motion detected! Relay ON.");
      digitalWrite(relePin, HIGH);
      relayIsActive = true;

      if (mqtt_client) {
          esp_mqtt_client_publish(mqtt_client, topic_state, "state=motion_detected,relay=on", 0, 1, 0);
      }
    }
  }

  // 2. If no motion, check if the 10-second window has finally expired
  if (relayIsActive && (currentTime >= relayOffTime)) {
    Serial.println("10 seconds passed since last motion. Relay OFF.");
    digitalWrite(relePin, LOW);
    relayIsActive = false;

    if (mqtt_client) {
        esp_mqtt_client_publish(mqtt_client, topic_state, "state=no_motion,relay=off", 0, 1, 0);
    }
  }

  // A tiny, non-blocking delay just to let the CPU breathe
  delay(50);
}