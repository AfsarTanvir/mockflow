import http from 'http';

const PORT = process.env.APP_PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      message: 'MockFlow API is running',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    })
  );
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`✅ MockFlow API running on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log('📚 API Documentation will be available soon');
});
