<<<<<<< HEAD
import { Router, Request, Response } from 'express';
=======
import { Router, Request, Response } from "express";
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
import {
  createPaymentIntent,
  chargeInvoice,
  getPaymentMethods,
  detachPaymentMethod,
<<<<<<< HEAD
} from '../controllers/payment.controller';
=======
} from "../controllers/payment.controller";
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
import {
  handleStripeWebhook,
  handleChargeSucceeded,
  handleCheckoutSessionCompleted,
<<<<<<< HEAD
} from '../controllers/stripe-webhook.controller';
import express from 'express';
=======
} from "../controllers/stripe-webhook.controller";
import express from "express";
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33

const router = Router();

// Payment routes (these use JSON body parser)
router.post("/charge-invoice", chargeInvoice);
router.post("/create-payment-intent", createPaymentIntent);
router.get("/patients/:patientId/cards", getPaymentMethods);
router.delete("/payment-methods/:paymentMethodId", detachPaymentMethod);

// Stripe webhook - MUST be before any body parsing middleware
// The raw body is required for signature verification
<<<<<<< HEAD
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// TEST ONLY: Webhook test endpoint that bypasses signature verification
if (process.env.NODE_ENV !== 'production') {
  router.post('/webhook/stripe/test', async (req: Request, res: Response) => {
    console.log('📨 TEST: Stripe webhook received:', req.body.type);
=======
router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

// TEST ONLY: Webhook test endpoint that bypasses signature verification
if (process.env.NODE_ENV !== "production") {
  router.post("/webhook/stripe/test", async (req: Request, res: Response) => {
    console.log("📨 TEST: Stripe webhook received:", req.body.type);
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33

    try {
      // Process based on event type
      switch (req.body.type) {
        case "charge.succeeded":
          await handleChargeSucceeded(req.body.data.object);
          break;

<<<<<<< HEAD
        case 'checkout.session.completed':
=======
        case "checkout.session.completed":
>>>>>>> 359f4b14e96ab063f3b7ea40b7d90ddb9502ca33
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
