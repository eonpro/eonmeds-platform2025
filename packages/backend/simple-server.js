const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

console.log('Starting simple server...');
console.log('Port:', PORT);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'EONMeds Backend is starting up...' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}); 