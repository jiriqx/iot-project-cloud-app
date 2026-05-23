/**
 * Sent by ESP8266 to the gateway to report a state change.
 */
export interface WebServerStateRequest {
  value: 'on' | 'off';
  deviceMac: string;
}

/**
 * Sent by the cloud server to the gateway via MQTT to control a device.
 */
export interface WebServerCommandRequest {
  command: 'on' | 'off';
  deviceMac: string;
  gatewayId: string;
}
