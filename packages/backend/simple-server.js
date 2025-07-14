const express = require('express');
const app = express();

// Railway provides PORT, we must use it
const PORT = process.env.PORT || 3002;

console.log('=== EONMeds Simple Server Starting ===');
console.log('Environment PORT:', process.env.PORT);
console.log('Using PORT:', PORT);
console.log('All env vars:', Object.keys(process.env).filter(k => k.includes('PORT') || k.includes('RAILWAY')));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'EONMeds Backend is running!',
    version: 'simple-1.0',
    port: PORT
  });
});

// Listen on all interfaces (0.0.0.0) for Railway
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully started on 0.0.0.0:${PORT}`);
  console.log(`Health check available at: http://0.0.0.0:${PORT}/health`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
}); 