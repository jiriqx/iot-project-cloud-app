import * as http from 'http';
import mqtt from 'mqtt';

// --- Configuration ---

const MQTT_HOST = process.env.MQTT_HOST!;
const MQTT_PORT = Number(process.env.MQTT_PORT ?? 8883);
const MQTT_USERNAME = process.env.MQTT_USERNAME!;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD!;

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
// Topic: {gatewayId}/{deviceId}/command  payload: "command=on" | "command=off"
// Topic: {gatewayId}/{deviceId}/config   payload: "timeoutMs=5000"

const mqttClient = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
});

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe(`${GATEWAY_ID}/+/command`, (err) => {
    if (err) console.error('Subscribe error:', err);
    else console.log(`Listening on MQTT topic: ${GATEWAY_ID}/+/command`);
  });
});

mqttClient.on('message', (topic: string, raw: Buffer) => {
  const [, deviceId] = topic.split('/');
  const payload = raw.toString(); // e.g. "command=on"
  const value = payload.split('=')[1];

  const deviceIp = deviceIpLookup[deviceId];
  if (!deviceIp) {
    console.error(`Unknown deviceId: ${deviceId}`);
    return;
  }

  console.log(`Forwarding "${payload}" to ${deviceId} at ${deviceIp}`);

  fetch(`http://${deviceIp}/api/${value}`, { method: 'POST' })
    .catch((err) => console.error('ESP32 request failed:', err));
});

mqttClient.on('error', (err) => console.error('MQTT error:', err));

// --- HTTP Server ---
// Receives state updates from ESP32 and forwards them to the cloud server.
// Topic: {gatewayId}/{deviceId}/state  payload: "state=on" | "state=off"

const server = http.createServer((req, res) => {
  const match = req.url?.match(/^\/api\/([^/]+)\/state$/);
  if (req.method !== 'POST' || !match) {
    res.writeHead(404);
    res.end();
    return;
  }

  const deviceId = match[1];
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    console.log(`Received state from ESP32 device=${deviceId}: ${body}`);

    fetch(`${CLOUD_SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: `${GATEWAY_ID}/${deviceId}/${body}`,
    }).catch((err) => console.error('Cloud server request failed:', err));

    res.writeHead(200);
    res.end();
  });
});

server.listen(GATEWAY_HTTP_PORT, () => {
  console.log(`Gateway HTTP server listening on port ${GATEWAY_HTTP_PORT}`);
});
