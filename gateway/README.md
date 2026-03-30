# Gateway

The gateway is a physical middleware layer that manages a cluster of connected end nodes. It reads messages from the MQTT broker, distributes payloads to end devices, and serves as a proxy for communication between the end devices and the server.

## Use Cases

**From server to node:**

1. The server publishes a message to the MQTT broker.
2. The message contains the gateway ID, node ID, and payload.
3. The gateway reads messages intended for it and forwards the payload to the target end node.

Benefit: this enables communication from the server to nodes without assigning a public IP address to each node.

**From node to server:**

1. A node sends a message to the local gateway.
2. The gateway resolves the server IP address, encrypts the message, and forwards it to the server.

Benefit: only the gateway needs to handle DNS resolution and encryption.
