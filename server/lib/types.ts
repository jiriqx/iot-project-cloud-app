/**
 * MQTT Topic conventions:
 *   ESP32  -> server: {gatewayId}/{deviceId}/state    payload: "state=on" | "state=off"
 *   server -> ESP32: {gatewayId}/{deviceId}/command  payload: "command=on" | "command=off"
 *   server -> ESP32: {gatewayId}/{deviceId}/config   payload: "timeoutMs=5000"
 */

export interface CommandPayload {
  command: 'on' | 'off';
}

export interface ConfigPayload {
  timeoutMs: number;
}

export type OutgoingPayload = CommandPayload | ConfigPayload;
