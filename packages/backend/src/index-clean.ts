import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool, testDatabaseConnection } from "./config/database";
import { DatabaseService } from "./services/database.service";

// Load environment variables
dotenv.config();

// Import routes
import patientRoutes from "./routes/patient.routes";
import practitionerRoutes from "./routes/practitioner.routes";
import appointmentRoutes from "./routes/appointment.routes";
import documentRoutes from "./routes/document.routes";
import auditRoutes from "./routes/audit.routes";
import authRoutes from "./routes/auth.routes";
import aiRoutes from "./routes/ai.routes";
import webhookRoutes from "./routes/webhook.routes";
import invoiceRoutes from "./routes/invoice.routes";
import paymentRoutes from "./routes/payment.routes";
import packageRoutes from "./routes/package.routes";

// Import middleware
import { errorHandler } from "./middleware/error";
import { requestLogger } from "./middleware/logger";

const app: Application = express();
const PORT = process.env.PORT || 3002;

// Initialize database service
const dbService = new DatabaseService(pool);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  });
});

// API routes
const apiV1 = express.Router();

// Mount routes
apiV1.use("/auth", authRoutes);
apiV1.use("/patients", patientRoutes);
apiV1.use("/practitioners", practitionerRoutes);
apiV1.use("/appointments", appointmentRoutes);
apiV1.use("/documents", documentRoutes);
apiV1.use("/audit", auditRoutes);
apiV1.use("/ai", aiRoutes);
apiV1.use("/webhooks", webhookRoutes);
apiV1.use("/invoices", invoiceRoutes);
apiV1.use("/payments", paymentRoutes);
apiV1.use("/packages", packageRoutes);

app.use("/api/v1", apiV1);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource was not found",
  });
});

// Initialize application
async function initializeApp() {
  try {
    console.log("🚀 Starting EONMeds Backend...");

    // Test database connection
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error("Failed to connect to database");
    }

    console.log("✅ Database connected successfully");

    // Initialize database schema
    await dbService.initializeDatabase();

    // Verify database integrity
    const { isValid, issues } = await dbService.verifyDatabaseIntegrity();
    if (!isValid) {
      console.error("❌ Database integrity issues found:", issues);
      throw new Error("Database integrity check failed");
    }

    console.log("✅ Database integrity verified");

    // Migrate existing data if needed
    await dbService.migrateExistingData();

    // Start server
    app.listen(PORT, () => {
      console.log(`
🏥 EONMeds Backend API
📡 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}
🔐 Auth0 Domain: ${process.env.AUTH0_DOMAIN ? "✓ Configured" : "✗ Missing"}
💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? "✓ Configured" : "✗ Missing"}
📊 Database: ✓ Connected and verified
      `);
    });
  } catch (error) {
    console.error("❌ Failed to initialize application:", error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the application
initializeApp();
