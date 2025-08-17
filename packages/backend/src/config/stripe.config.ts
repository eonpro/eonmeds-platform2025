import Stripe from "stripe";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

// Load environment variables
dotenv.config();

// Stripe configuration
export const stripeConfig = {
  apiKey: process.env.STRIPE_SECRET_KEY || "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
};

// Validate Stripe configuration
export function validateStripeConfig(): boolean {
  if (!stripeConfig.apiKey) {
    logger.error("❌ STRIPE_SECRET_KEY is not configured");
    return false;
  }

  // Webhook secret is optional for now (needed for Phase 4)
  if (!stripeConfig.webhookSecret) {
    logger.warn("⚠️  STRIPE_WEBHOOK_SECRET is not configured (needed for webhooks)");
  }

  // Check if using test keys (recommended for development)
  if (stripeConfig.apiKey.startsWith("sk_test_")) {
    logger.info("✅ Using Stripe TEST mode");
  } else if (stripeConfig.apiKey.startsWith("sk_live_")) {
    logger.warn("⚠️  Using Stripe LIVE mode - be careful!");
  } else {
    logger.error("❌ Invalid Stripe API key format");
    return false;
  }

  return true;
}

// Initialize Stripe client
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!validateStripeConfig()) {
      throw new Error("Stripe configuration is invalid");
    }

    stripeClient = new Stripe(stripeConfig.apiKey, {
      apiVersion: stripeConfig.apiVersion,
      typescript: true,
      // Add telemetry metadata
      appInfo: {
        name: "eonmeds-platform",
        version: "1.0.0",
      },
    });

    logger.info("✅ Stripe client initialized");
  }

  return stripeClient;
}

// Export types for use in other files
export type { Stripe };
