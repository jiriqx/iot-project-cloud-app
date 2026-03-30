const mqttProducer = new MQTTProducer();
const db = new DB();
const server = new Server();

server.post('/api/state', (req, res) => {
  const value = req.body.value;
  const deviceId = req.body.deviceId;

  db.saveState(deviceId, value);
});

server.post('/api/command', (req, res) => {
  const command = req.body.command;
  const gatewayId = req.body.gatewayId;
  const deviceId = req.body.deviceId;

  mqttProducer.publish(gatewayId, {
    deviceId,
    value: command
  });
});
