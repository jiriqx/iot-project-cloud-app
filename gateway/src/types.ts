/**
 * Sent by ESP32 to the gateway to report a state change.
 * METHOD: POST
 * PATH: /api/state
 */
export interface WebServerStateRequest {
  value: 'on' | 'off';
  deviceId: string;
}

/**
 * Sent by the cloud server to the gateway via MQTT to control a device.
 */
export interface WebServerCommandRequest {
  command: 'on' | 'off';
  deviceId: string;
  gatewayId: string;
}

/**
 * ESP32 HTTP server endpoint.
 * METHOD: POST
 * PATH: /api/:state  (state = 'on' | 'off')
 *
 * TCP/IP fallback protocol:
 *   Payload: single byte  — 0 = off, 1 = on
 */
