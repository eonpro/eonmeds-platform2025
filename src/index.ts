import app from "./app";
import pool from "./config/database";

const PORT = process.env.PORT || 3000;

// Start server
const server = app.listen(PORT, () => {
  console.log(`
    🚀 EONMeds API Server is running!
    
    📍 Local: http://localhost:${PORT}
    📍 Health: http://localhost:${PORT}/health
    📍 API: http://localhost:${PORT}/api/v1
    
    🌍 Environment: ${process.env.NODE_ENV}
    🔐 CORS Origin: ${process.env.CORS_ORIGIN}
  `);
});

// Graceful shutdown
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function shutdown() {
  console.log("\n🛑 Shutting down gracefully...");

  server.close(() => {
    console.log("HTTP server closed");
  });

  // Close database connection
  await pool.end();
  console.log("Database connection closed");

  process.exit(0);
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  shutdown();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  shutdown();
});
