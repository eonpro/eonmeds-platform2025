import { Router, Request, Response } from "express";
import {
  createPaymentIntent,
  chargeInvoice,
  getPaymentMethods,
  detachPaymentMethod,
} from "../controllers/payment.controller";
import {
  handleStripeWebhook,
  handleChargeSucceeded,
  handleCheckoutSessionCompleted,
} from "../controllers/stripe-webhook.controller";
import express from "express";

const router = Router();

// Payment routes (these use JSON body parser)
router.post("/charge-invoice", chargeInvoice);
router.post("/create-payment-intent", createPaymentIntent);
router.get("/patients/:patientId/cards", getPaymentMethods);
router.delete("/payment-methods/:paymentMethodId", detachPaymentMethod);

// Stripe webhook - MUST be before any body parsing middleware
// The raw body is required for signature verification
router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

// TEST ONLY: Webhook test endpoint that bypasses signature verification
if (process.env.NODE_ENV !== "production") {
  router.post("/webhook/stripe/test", async (req: Request, res: Response) => {
    console.log("📨 TEST: Stripe webhook received:", req.body.type);

    try {
      // Process based on event type
      switch (req.body.type) {
        case "charge.succeeded":
          await handleChargeSucceeded(req.body.data.object);
          break;

        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(req.body.data.object);
          break;

        default:
          console.log("Unhandled test event type:", req.body.type);
      }

      res.json({ received: true, test: true });
    } catch (error) {
      console.error("Test webhook error:", error);
      res.status(500).json({ error: "Test webhook failed" });
    }
  });
}

export default router;
