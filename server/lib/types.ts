/**
 * MQTT Topic conventions (MAC-based device identification):
 *   ESP32  -> server: iot/v1/{gatewayId}/{deviceMac}/state    payload: "state=on" | "state=off"
 *   server -> ESP32:  iot/v1/{gatewayId}/{deviceMac}/command  payload: "command=on" | "command=off"
 *   server -> ESP32:  iot/v1/{gatewayId}/{deviceMac}/config   payload: "timeoutMs=5000"
 */

export interface CommandPayload {
  command: 'on' | 'off';
}

export interface ConfigPayload {
  timeoutMs: number;
}

export type OutgoingPayload = CommandPayload | ConfigPayload;
