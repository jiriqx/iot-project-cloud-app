import * as http from 'http';
import mqtt from 'mqtt';
import type { WebServerCommandRequest, WebServerStateRequest } from './types';

// --- Configuration ---

const MQTT_HOST = 'x1d65c51.ala.eu-central-1.emqxsl.com';
const MQTT_PORT = 8883;
const MQTT_USERNAME = 'administrator';
const MQTT_PASSWORD = 'wrswPB5hPH54jzU';

const GATEWAY_ID = 'gateway-1';
const GATEWAY_HTTP_PORT = 3001;

// TODO: update to the deployed cloud server URL
const CLOUD_SERVER_URL = 'http://localhost:3000';

// Maps deviceId to its local IP address on this network.
// Update this when adding new devices.
const deviceIpLookup: Record<string, string> = {
  'light-1': '192.168.0.100',
};

// --- MQTT Subscriber ---
// The gateway connects OUT to the broker (no public IP needed).
// It listens on a topic named after its own ID.

const mqttClient = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
});

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe(GATEWAY_ID, (err) => {
    if (err) console.error('Subscribe error:', err);
    else console.log(`Listening on MQTT topic: ${GATEWAY_ID}`);
  });
});

mqttClient.on('message', (_topic: string, payload: Buffer) => {
  const message: WebServerCommandRequest = JSON.parse(payload.toString());
  const { command, deviceId } = message;

  const deviceIp = deviceIpLookup[deviceId];
  if (!deviceIp) {
    console.error(`Unknown deviceId: ${deviceId}`);
    return;
  }

  console.log(`Forwarding command "${command}" to ${deviceId} at ${deviceIp}`);

  // Forward command to ESP32 via local HTTP
  fetch(`http://${deviceIp}/api/${command}`, { method: 'POST' })
    .catch((err) => console.error('ESP32 request failed:', err));
});

mqttClient.on('error', (err) => console.error('MQTT error:', err));

// --- HTTP Server ---
// Receives state updates from ESP32 and forwards them to the cloud server.

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/state') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    const stateRequest: WebServerStateRequest = JSON.parse(body);
    console.log('Received state from ESP32:', stateRequest);

    fetch(`${CLOUD_SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stateRequest),
    }).catch((err) => console.error('Cloud server request failed:', err));

    res.writeHead(200);
    res.end();
  });
});

server.listen(GATEWAY_HTTP_PORT, () => {
  console.log(`Gateway HTTP server listening on port ${GATEWAY_HTTP_PORT}`);
});
