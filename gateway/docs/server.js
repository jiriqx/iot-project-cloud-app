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

  const lookupTable = {
    'gateway-1': {
      'light-1': '60.1.1.90'
    }
  }

  if (command === 'on') {
    fetch(`http://${lookupTable[gatewayId][deviceId]}/api/on`);
  }

  if (command === 'off') {
    fetch(`http://${lookupTable[gatewayId][deviceId]}/api/off`);
  }
});
