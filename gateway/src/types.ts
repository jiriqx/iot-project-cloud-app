/**
 * METHOD: POST
 * PATH: /api/state
 * Payload
 */

interface WebServerStateRequest {
  value: 'on' | 'off';
  deviceId: string;
}

interface WebServerCommandRequest {
  command: 'on' | 'off';
  deviceId: string;
  gatewayId: string;
}

interface Gateway {

}

interface Esp32 {

}

/*
Protocol: TCP/IP
Payload: INT[]
0 = on
1 = off
*/

/**
 * METHOD: POST
 * PATH: /api/:state
 * state: on | off
 */
