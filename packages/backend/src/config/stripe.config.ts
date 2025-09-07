import Stripe from "stripe";
import { ENV } from "./env";
import { logger } from "../lib/logger";

const KEY = process.env.STRIPE_SECRET_KEY || "";
const MODE = process.env.STRIPE_MODE || (KEY.startsWith("sk_test_") ? "test" : "live");

function mask(k?: string) {
  if (!k) return "";
  return k.length <= 12 ? "****" : k.slice(0, 8) + "..." + k.slice(-4);
}

// One-time masked log at boot
console.info("STRIPE_BOOT", {
  nodeEnv: process.env.NODE_ENV,
  stripeMode: MODE,
  keyMasked: mask(KEY),
});

// Stripe configuration
export const stripeConfig = {
  apiKey: ENV.STRIPE_SECRET_KEY,
  webhookSecret: ENV.STRIPE_WEBHOOK_SECRET,
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
    if (!KEY) {
      throw new Error("STRIPE_SECRET_KEY missing at runtime");
    }
    
    if (!validateStripeConfig()) {
      throw new Error("Stripe configuration is invalid");
    }

    stripeClient = new Stripe(KEY, {
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
