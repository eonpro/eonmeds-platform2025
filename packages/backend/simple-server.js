const express = require("express");
const app = express();

// Railway provides PORT, we must use it
const PORT = process.env.PORT || 3002;

console.log("=== EONMeds Simple Server Starting ===");
console.log("Environment PORT:", process.env.PORT);
console.log("Using PORT:", PORT);
console.log(
  "All env vars:",
  Object.keys(process.env).filter(
    (k) => k.includes("PORT") || k.includes("RAILWAY"),
  ),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "EONMeds Backend is running!",
    version: "simple-1.0",
    port: PORT,
  });
});

// HeyFlow webhook endpoint
app.post("/api/v1/webhook/heyflow", (req, res) => {
  console.log("=== HeyFlow Webhook Received ===");
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  // For now, just acknowledge receipt
  res.status(200).json({
    success: true,
    message: "Webhook received",
    timestamp: new Date().toISOString(),
  });
});

// Catch all 404
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: ["GET /", "GET /health", "POST /api/v1/webhook/heyflow"],
  });
});

// Listen on all interfaces (0.0.0.0) for Railway
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server successfully started on 0.0.0.0:${PORT}`);
  console.log(`Health check available at: http://0.0.0.0:${PORT}/health`);
  console.log(
    `Webhook endpoint at: http://0.0.0.0:${PORT}/api/v1/webhook/heyflow`,
  );
});

// Handle server errors
server.on("error", (error) => {
  console.error("❌ Server error:", error);
  process.exit(1);
});
