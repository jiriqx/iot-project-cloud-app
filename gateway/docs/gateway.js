const mqttListener = new MqttListener();
const server = new Server();

mqttListener.listen('gateway-1', (payload) => {
  const { deviceId, value } = payload;

  const lookupTable = {
    'light-1': '192.168.0.1'
  }

  if (value === 'on') {
    fetch(`https://${lookupTable[deviceId]}/api/on`);
  }
  if (value === 'off') {
    fetch(`https://${lookupTable[deviceId]}/api/off`);
  }
});

server.post('/api/state', (req, res) => {
  proxy({
    host: '37.50.0.48',
  }, req, res);
});
