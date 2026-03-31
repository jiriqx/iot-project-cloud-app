import * as dotenv from "dotenv";
import * as mqtt from "mqtt";

dotenv.config();

const host = process.env.HIVEMQ_HOST!;
const port = Number(process.env.HIVEMQ_PORT!);
const username = process.env.HIVEMQ_USERNAME!;
const password = process.env.HIVEMQ_PASSWORD!;
const topic = process.env.HIVEMQ_TOPIC!;
const clientId = process.env.HIVEMQ_CLIENT_ID ?? `DevProducer-${Date.now()}`;

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

console.log(`Connecting to mqtts://${host}:${port} with username '${username}' ...`);
const client = mqtt.connect(options);

client.on("connect", () => {
  console.log("Connected to HiveMQ broker.");

  // Publish a test message
  const payload = {
    timestamp: new Date().toISOString(),
    message: "Hello from DevProducer",
    deviceId: "gateway-1",
  };

  client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) {
      console.error("Publish failed:", err.message);
    } else {
      console.log(`Published message to topic '${topic}': ${JSON.stringify(payload)}`);
    }

    // Keep connection open to send more messages if needed
    console.log("Type messages and press Enter to publish. Type 'quit' to exit.");
    setupInteractivePublish();
  });
});

client.on("error", (err: Error) => {
  console.error("MQTT client error:", err.message);
});

client.on("close", () => {
  console.log("MQTT connection closed.");
});

function setupInteractivePublish() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askForMessage = () => {
    rl.question("Enter message (or 'quit' to exit): ", (input: string) => {
      if (input.toLowerCase() === "quit") {
        console.log("Disconnecting...");
        rl.close();
        client.end(true, () => process.exit(0));
        return;
      }

      const payload = {
        timestamp: new Date().toISOString(),
        message: input,
        deviceId: "gateway-1",
      };

      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error("Publish failed:", err.message);
        } else {
          console.log(`✓ Published: ${input}`);
        }
        askForMessage();
      });
    });
  };

  askForMessage();
}

process.on("SIGINT", () => {
  console.log("\nDisconnecting MQTT client...");
  client.end(true, () => process.exit(0));
});
