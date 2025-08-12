import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Basic middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Basic route
app.get('/', (_req, res) => {
  res.json({
    message: 'EONMeds Backend API - Minimal Version',
    version: '1.0.0',
    status: 'running',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
