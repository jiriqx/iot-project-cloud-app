const server = new Server();

server.post('/api/state', (req, res) => {
  proxy({
    host: '37.50.0.48',
  }, req, res);
});

server.post('/api/command', (req, res) => {
  proxy({
    host: '37.50.0.48',
  }, req, res);
});
