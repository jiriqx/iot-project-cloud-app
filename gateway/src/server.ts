import mqtt from 'mqtt';
import { saveStateChange } from '../../lib/db';

const MQTT_HOST     = process.env.MQTT_HOST!;
const MQTT_PORT     = Number(process.env.MQTT_PORT ?? 1883);
const MQTT_USERNAME = process.env.MQTT_USERNAME!;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD!;

// Topic: iot/v1/{gatewayId}/{deviceId}/state  payload: "state=on" | "state=off"
const TOPIC = 'iot/v1/+/+/state';

function start() {
  const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
  });

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    client.subscribe(TOPIC, (err) => {
      if (err) console.error('[MQTT] Subscribe error:', err);
      else console.log(`[MQTT] Subscribed to ${TOPIC}`);
    });
  });

  client.on('message', async (topic: string, raw: Buffer) => {
    const parts = topic.split('/'); // ['iot', 'v1', gatewayId, deviceId, 'state']
    const [, , gatewayId, deviceId] = parts;
    const value = raw.toString().split('=')[1]; // "state=on" -> "on"
    const state = value === 'on';

    console.log(`[MQTT] ${gatewayId}/${deviceId} -> state=${value}`);

    try {
      await saveStateChange(gatewayId, deviceId, state);
      console.log('[DB] State change saved');
    } catch (err) {
      console.error('[DB] Failed to save state change:', err);
    }
  });

  client.on('error', (err) => console.error('[MQTT] Error:', err));
}

start();
