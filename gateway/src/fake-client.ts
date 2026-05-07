import mqtt from 'mqtt';

const MQTT_HOST = process.env.MQTT_HOST!;
const MQTT_PORT = Number(process.env.MQTT_PORT ?? 1883);
const MQTT_USERNAME = process.env.MQTT_USERNAME!;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD!;

const GATEWAY_ID = 'gateway-1';
const DEVICE_ID = '30-E3-A4-DF-C2-E4';
const topicState = `iot/v1/${GATEWAY_ID}/${DEVICE_ID}/state`;
const topicCommand = `iot/v1/gateway-1/70:4B:CA:46:BF:AC/command`;
const message = 'state=on';

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  connectTimeout: 5000,
  protocol: 'mqtts',
});

console.log(`Connecting to mqtt://${MQTT_HOST}:${MQTT_PORT}...`);

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.publish(topicState, message, (err) => {
    if (err) console.error('Publish failed:', err);
    else console.log(`Published to ${topicState}: ${message}`);
    client.end();
  });
});

client.on('error', (err) => console.error('MQTT error:', err));
client.on('close', () => console.log('MQTT connection closed'));
client.on('offline', () => console.log('MQTT client offline'));
client.on('reconnect', () => console.log('MQTT reconnecting...'));
