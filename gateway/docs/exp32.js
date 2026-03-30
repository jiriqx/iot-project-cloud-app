const server = new Server();
const lightControl = new LightControl();

lightControl.on('change', (data) => {
  if (data.value === 'on') {
    fetch('http://192.168.0.10/api/state', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: 'light-1',
        value: 'on'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  if (data.value === 'off') {
    fetch('http://192.168.0.10/api/state', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: 'light-1',
        value: 'on'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

server.get('/api/:state', (req, res) => {
  const state = req.params.state;
  if (state === 'on') {
    lightControl.setValue('on');
  }
  if (state === 'off') {
    lightControl.setValue('off');
  }
});
