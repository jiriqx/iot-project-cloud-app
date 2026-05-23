idf_component_register(SRCS "mqtt-demo.c"
                    INCLUDE_DIRS "."
                    REQUIRES nvs_flash esp_wifi esp_event esp_netif esp-tls espressif__mqtt esp_driver_gpio esp_timer)
