import { Router, Request, Response } from "express";
import { validateStripeConfig } from "../config/stripe.config";
import { stripeService } from "../services/stripe.service";
import { ENV } from "../config/env";

const router = Router();

/**
 * GET /api/v1/stripe-test/health
 * Check if Stripe is properly configured
 */
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const isValid = validateStripeConfig();
    
    res.json({
      status: isValid ? "healthy" : "unhealthy",
      configured: isValid,
      mode: ENV.STRIPE_SECRET_KEY.startsWith("sk_test_") ? "test" : "live",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/stripe-test/customer
 * Test creating a Stripe customer
 */
router.post("/customer", async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        error: "Email and name are required",
      });
    }

    // Create test customer
    const customer = await stripeService.createCustomer({
      patientId: `TEST-${Date.now()}`,
      email,
      name,
    });

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: new Date(customer.created * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      type: error.type,
    });
  }
});

/**
 * POST /api/v1/stripe-test/payment-intent
 * Test creating a payment intent
 */
router.post("/payment-intent", async (req: Request, res: Response) => {
  try {
    const { customerId, amount, description } = req.body;

    if (!customerId || !amount) {
      return res.status(400).json({
        error: "customerId and amount are required",
      });
    }

    const paymentIntent = await stripeService.createPaymentIntent({
      customer: customerId,
      amount,
      currency: 'usd',
      metadata: { description: description || "Test payment" }
    });

    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      type: error.type,
    });
  }
});

export default router;
