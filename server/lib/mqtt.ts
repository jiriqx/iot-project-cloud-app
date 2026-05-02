import mqtt from 'mqtt';
import type { CommandPayload, ConfigPayload } from './types';

const MQTT_HOST = process.env.MQTT_HOST!;
const MQTT_PORT = Number(process.env.MQTT_PORT ?? 8883);
const MQTT_USERNAME = process.env.MQTT_USERNAME!;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD!;

let client: mqtt.MqttClient | null = null;

function parsePayload(payload: string): Record<string, string> {
  return Object.fromEntries(
    payload.split(';').map((pair) => pair.split('=') as [string, string])
  );
}

function getClient(): mqtt.MqttClient {
  if (client) return client;

  if (!MQTT_HOST) {
    throw new Error('[MQTT] MQTT_HOST is not set — skipping connection');
  }

  client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
  });

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    client!.subscribe('+/+/state', (err) => {
      if (err) console.error('[MQTT] Subscribe error:', err);
      else console.log('[MQTT] Subscribed to +/+/state');
    });
  });

  client.on('message', (topic, raw) => {
    const [gatewayId, deviceId] = topic.split('/');
    const payload = parsePayload(raw.toString());
    console.log(`[MQTT] state from gateway=${gatewayId} device=${deviceId}:`, payload);
    // TODO: save to database
  });

  client.on('error', (err) => console.error('[MQTT] Error:', err));

  return client;
}

export function publishCommand(gatewayId: string, deviceId: string, payload: CommandPayload): void {
  const topic = `${gatewayId}/${deviceId}/command`;
  const message = `command=${payload.command}`;
  getClient().publish(topic, message, (err) => {
    if (err) console.error('[MQTT] Publish error:', err);
    else console.log(`[MQTT] Published to ${topic}: ${message}`);
  });
}

export function publishConfig(gatewayId: string, deviceId: string, payload: ConfigPayload): void {
  const topic = `${gatewayId}/${deviceId}/config`;
  const message = `timeoutMs=${payload.timeoutMs}`;
  getClient().publish(topic, message, (err) => {
    if (err) console.error('[MQTT] Publish error:', err);
    else console.log(`[MQTT] Published to ${topic}: ${message}`);
  });
}

export function startMqttSubscriber(): void {
  if (!MQTT_HOST) {
    console.warn('[MQTT] MQTT_HOST not set, skipping MQTT connection');
    return;
  }
  getClient();
}
