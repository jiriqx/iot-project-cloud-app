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

## Infrastructure
- Gateway is running on a VM in Azure
- Contact `krystof.matejka@unicornuniversity.net` for access

**Buildout:**
- Create a VM
- Install git, nvm
- Clone repository, install dependencies, add .evn
- `scp infrastructure/gateway.service azureuser@20.86.33.41:/home/azureuser`
- `ssh-copy-id -i infrastructure/github_actions_key.pub -i ~/.ssh/key azureuser@20.86.33.41`
- `ssh azureuser@20.86.33.41 -i ~/.ssh/key`
- `sudo cp gateway.service /etc/systemd/system/`
- `sudo systemctl daemon-reload`
- `sudo systemctl enable gateway`
- `sudo systemctl start gateway`

**Manual deployment:**
- `ssh azureuser@20.86.33.41 -i ~/.ssh/key`
- `cd app`
- `git pull`
- `sudo systemctl restart gateway`

**Service health:**
- Status: `systemctl status gateway`
- Logs: `journalctl -u gateway -f`
