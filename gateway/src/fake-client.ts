import mqtt from 'mqtt';
import type { WebServerCommandRequest } from './types';

// --- Configuration ---

const MQTT_HOST = 'x1d65c51.ala.eu-central-1.emqxsl.com';
const MQTT_PORT = 8883;
const MQTT_USERNAME = 'administrator';
const MQTT_PASSWORD = 'wrswPB5hPH54jzU';

const GATEWAY_ID = 'gateway-1';

// --- Publish a test command ---
// Simulates what the cloud server would send to the gateway.
// Change command to 'off' to test turning off.

const command: WebServerCommandRequest = {
  command: 'on',
  deviceId: 'light-1',
  gatewayId: GATEWAY_ID,
};

const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
});

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.publish(GATEWAY_ID, JSON.stringify(command), (err) => {
    if (err) console.error('Publish failed:', err);
    else console.log('Published command:', command);
    client.end();
  });
});

client.on('error', (err) => console.error('MQTT error:', err));
