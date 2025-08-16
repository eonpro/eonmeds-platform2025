import express from "express";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Basic middleware
app.use(express.json());

// Health check endpoint
<<<<<<< HEAD
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
=======
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
  });
});

// Basic route
<<<<<<< HEAD
app.get('/', (_req, res) => {
  res.json({
    message: 'EONMeds Backend API - Minimal Version',
    version: '1.0.0',
    status: 'running',
=======
app.get("/", (_req, res) => {
  res.json({
    message: "EONMeds Backend API - Minimal Version",
    version: "1.0.0",
    status: "running",
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
