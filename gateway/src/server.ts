import mqtt from 'mqtt';
import { connectDb, saveStateChange, savePing, getTimeoutForDevice } from './db';

const MQTT_HOST = process.env.MQTT_HOST!;
const MQTT_PORT = Number(process.env.MQTT_PORT ?? 1883);
const MQTT_USERNAME = process.env.MQTT_USERNAME!;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD!;

const TOPIC_STATE = 'iot/v1/+/+/state';
const TOPIC_PING = 'iot/v1/+/+/ping';

const GATEWAY_ID = 'gateway-1';
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

async function start() {
  await connectDb();
  const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    protocol: 'mqtts',
  });

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    client.subscribe(TOPIC_STATE, (err) => {
      if (err) console.error('[MQTT] Subscribe error (state):', err);
      else console.log(`[MQTT] Subscribed to ${TOPIC_STATE}`);
    });
    client.subscribe(TOPIC_PING, (err) => {
      if (err) console.error('[MQTT] Subscribe error (ping):', err);
      else console.log(`[MQTT] Subscribed to ${TOPIC_PING}`);
    });
  });

  client.on('message', async (topic: string, raw: Buffer) => {
    const parts = topic.split('/'); // ['iot', 'v1', gatewayId, deviceMac, type]
    const [, , gatewayId, deviceMac, msgType] = parts;

    if (msgType === 'ping') {
      console.log(`[MQTT] Ping from ${deviceMac}`);
      try {
        const lastPing = await savePing(deviceMac);
        console.log('[DB] Ping saved');

        // Check if device was offline (gap > 5 minutes)
        const now = Date.now();
        const wasOffline = !lastPing || (now - lastPing.getTime()) > OFFLINE_THRESHOLD_MS;

        if (wasOffline) {
          console.log(`[MQTT] Device ${deviceMac} came online, sending config...`);
          const timeout = await getTimeoutForDevice(deviceMac);
          if (timeout != null) {
            const configTopic = `iot/v1/${GATEWAY_ID}/${deviceMac}/config`;
            client.publish(configTopic, `timeout=${timeout}`, { qos: 1 }, (err) => {
              if (err) console.error('[MQTT] Failed to publish config:', err);
              else console.log(`[MQTT] Published config to ${configTopic}: timeout=${timeout}`);
            });
          }
        }
      } catch (err) {
        console.error('[DB] Failed to save ping:', err);
      }
      return;
    }

    // state message — payload: "state=on" or "state=on,trigger=manual"
    const payload = raw.toString();
    const params = Object.fromEntries(
      payload.split(',').map((p) => {
        const [k, v] = p.split('=');
        return [k, v];
      })
    );
    const state = params.state === 'on';
    const trigger = params.trigger ?? 'auto';

    console.log(`[MQTT] ${gatewayId}/${deviceMac} -> state=${params.state} trigger=${trigger}`);

    try {
      await saveStateChange(gatewayId, deviceMac, state, trigger);
      console.log('[DB] State change saved');
    } catch (err) {
      console.error('[DB] Failed to save state change:', err);
    }
  });

  client.on('error', (err) => console.error('[MQTT] Error:', err));
  client.on('close', () => console.log('MQTT connection closed'));
  client.on('offline', () => console.log('MQTT client offline'));
  client.on('reconnect', () => console.log('MQTT reconnecting...'));
}

start();
