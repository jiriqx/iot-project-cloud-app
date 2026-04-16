import * as dotenv from "dotenv";
import * as mqtt from "mqtt";
import { Buffer } from "buffer";

dotenv.config();

const host = process.env.HIVEMQ_HOST!;
const port = Number(process.env.HIVEMQ_PORT!);
const username = process.env.HIVEMQ_USERNAME!;
const password = process.env.HIVEMQ_PASSWORD!;
const topic = process.env.HIVEMQ_TOPIC!;
const clientId = process.env.HIVEMQ_CLIENT_ID ?? `DevClient-${Date.now()}`;

const options: mqtt.IClientOptions = {
  protocol: "mqtts",
  host,
  port,
  clientId,
  username,
  password,
  rejectUnauthorized: true,
  reconnectPeriod: 2000,
  connectTimeout: 30_000,
};

console.log(`Connecting to mqtts://${host}:${port} with username '${username}' on topic '${topic}' ...`);
const client = mqtt.connect(options);

client.on("connect", () => {
  console.log("Connected to Azure Event Grid MQTT.");
  client.subscribe(topic, { qos: 1 }, (err: Error | null) => {
    if (err) {
      console.error("Subscribe failed:", err.message);
      return;
    }
    console.log(`Subscribed to topic: ${topic}`);
  });
});

client.on("message", (receivedTopic: string, payload: Buffer) => {
  const message = payload.toString("utf8");
  console.log(`[${new Date().toISOString()}] ${receivedTopic}: ${message}`);
});

client.on("reconnect", () => {
  console.log("Reconnecting to MQTT broker...");
});

client.on("error", (err: Error) => {
  console.error("MQTT client error:", err.message);
});

client.on("close", () => {
  console.log("MQTT connection closed.");
});

process.on("SIGINT", () => {
  console.log("Disconnecting MQTT client...");
  client.end(true, () => process.exit(0));
});

