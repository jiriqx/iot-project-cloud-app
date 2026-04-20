import mqtt from 'mqtt';
import { connectDb, StateChange } from './db';

// --- Configuration ---

const MQTT_HOST = process.env.MQTT_HOST!;
const MQTT_PORT = Number(process.env.MQTT_PORT ?? 8883);
const MQTT_USERNAME = process.env.MQTT_USERNAME!;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD!;

// --- MQTT Subscriber ---
// Listens for state changes from all ESP32 devices and saves them to DB.
// Topic: {gatewayId}/{deviceId}/state  payload: "state=on" | "state=off"

async function start() {
  await connectDb();

  const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
  });

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    client.subscribe('+/+/state', (err) => {
      if (err) console.error('[MQTT] Subscribe error:', err);
      else console.log('[MQTT] Subscribed to +/+/state');
    });
  });

  client.on('message', async (topic: string, raw: Buffer) => {
    const [gatewayId, deviceId] = topic.split('/');
    const value = raw.toString().split('=')[1]; // "state=on" -> "on"
    const state = value === 'on';

    console.log(`[MQTT] ${gatewayId}/${deviceId} -> state=${value}`);

    await StateChange.create({ gatewayId, deviceId, state });
  });

  client.on('error', (err) => console.error('[MQTT] Error:', err));
}

start().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
