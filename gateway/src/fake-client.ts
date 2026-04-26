import mqtt from 'mqtt';

const MQTT_HOST     = process.env.MQTT_HOST!;
const MQTT_PORT     = Number(process.env.MQTT_PORT ?? 1883);
const MQTT_USERNAME = process.env.MQTT_USERNAME!;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD!;

const GATEWAY_ID = 'gateway-1';
const DEVICE_ID  = 'light-1';
const topic   = `iot/v1/${GATEWAY_ID}/${DEVICE_ID}/state`;
const message = 'state=on';

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
});

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.publish(topic, message, (err) => {
    if (err) console.error('Publish failed:', err);
    else console.log(`Published to ${topic}: ${message}`);
    client.end();
  });
});

client.on('error', (err) => console.error('MQTT error:', err));
