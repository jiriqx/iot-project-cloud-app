import mqtt from 'mqtt';
import type { CommandPayload } from './types';

const MQTT_HOST = process.env.MQTT_HOST!;
const MQTT_PORT = Number(process.env.MQTT_PORT ?? 8883);
const MQTT_USERNAME = process.env.MQTT_USERNAME!;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD!;

let client: mqtt.MqttClient | null = null;

export function getClient(): mqtt.MqttClient {
  if (client) return client;

  if (!MQTT_HOST) {
    throw new Error('[MQTT] MQTT_HOST is not set — skipping connection');
  }

  client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
  });

  client.on('error', (err) => console.error('[MQTT] Error:', err));

  return client;
}

export function publishCommand(gatewayId: string, deviceMac: string, payload: CommandPayload): void {
  const topic = `iot/v1/${gatewayId}/${deviceMac}/command`;
  const message = `command=${payload.command}`;
  getClient().publish(topic, message, (err) => {
    if (err) console.error('[MQTT] Publish error:', err);
    else console.log(`[MQTT] Published to ${topic}: ${message}`);
  });
}
