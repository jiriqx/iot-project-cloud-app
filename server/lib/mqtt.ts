import mqtt from 'mqtt';
import prisma from './prisma';
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
    client!.subscribe('iot/v1/+/+/state', (err) => {
      if (err) console.error('[MQTT] Subscribe error:', err);
      else console.log('[MQTT] Subscribed to iot/v1/+/+/state');
    });
  });

  /*client.on('message', async (topic, raw) => {
    const parts = topic.split('/'); // ['iot', 'v1', gatewayId, deviceMac, 'state']
    const [, , gatewayId, deviceMac] = parts;
    const payload = parsePayload(raw.toString());
    console.log(`[MQTT] state from gateway=${gatewayId} deviceMac=${deviceMac}:`, payload);

    const state = payload.state === 'on';
    const trigger = payload.trigger ?? 'auto';

    try {
      const node = await prisma.node.findUnique({ where: { mac: deviceMac } });
      if (node) {
        await prisma.lightEvent.create({
          data: {
            zoneId: node.zoneId,
            nodeId: node.id,
            eventType: state ? 'on' : 'off',
            trigger,
          },
        });
        console.log(`[MQTT] LightEvent saved for ${deviceMac}`);
      } else {
        console.warn(`[MQTT] Node with mac '${deviceMac}' not found, skipping event`);
      }
    } catch (err) {
      console.error('[MQTT] Failed to save LightEvent:', err);
    }
  });*/

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

// delete
export function publishConfig(gatewayId: string, deviceMac: string, payload: ConfigPayload): void {
  const topic = `iot/v1/${gatewayId}/${deviceMac}/config`;
  const message = `timeoutMs=${payload.timeoutMs}`;
  getClient().publish(topic, message, (err) => {
    if (err) console.error('[MQTT] Publish error:', err);
    else console.log(`[MQTT] Published to ${topic}: ${message}`);
  });
}

// delete
export function startMqttSubscriber(): void {
  if (!MQTT_HOST) {
    console.warn('[MQTT] MQTT_HOST not set, skipping MQTT connection');
    return;
  }
  getClient();
}
