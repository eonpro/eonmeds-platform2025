import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../controllers/stripe-webhook.controller';
import { bypassAuth } from '../middleware/bypass-auth';

const router = Router();

// IMPORTANT: Stripe webhooks need raw body, not JSON parsed
// This must be registered BEFORE the general JSON parser
router.post(
  '/stripe',
  bypassAuth, // No auth required for webhooks
  express.raw({ type: 'application/json' }), // Raw body for signature verification
  handleStripeWebhook
);

export default router;
