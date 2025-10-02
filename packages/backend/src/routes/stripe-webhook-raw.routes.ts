/**
 * Stripe Webhook Routes with Raw Body Handling
 * CRITICAL: This must be mounted BEFORE body-parser middleware
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripeClient } from '../config/stripe.config';
import { ENV } from '../config/env';
import { logger } from '../lib/logger';
import { webhookProcessor } from '../services/stripe-webhook-processor.service';

const router = Router();

/**
 * Raw body middleware for Stripe signature verification
 * This MUST be applied before any JSON parsing
 */
export const getRawBody = require('body-parser').raw({
  type: 'application/json',
  limit: '10mb' // Stripe can send large payloads
});

/**
 * Main webhook endpoint
 * Handles all Stripe events with signature verification
 */
router.post('/webhook/stripe', getRawBody, async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = ENV.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    logger.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).json({ error: 'Webhook endpoint not configured' });
    return;
  }

  if (!sig) {
    logger.error('❌ Missing stripe-signature header');
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature using RAW body
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      req.body, // This must be the raw Buffer, not parsed JSON
      sig,
      endpointSecret
    );
  } catch (err: any) {
    logger.error(`❌ Webhook signature verification failed: ${err.message}`);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  // Log the event type
  logger.info(`✅ Stripe webhook received: ${event.type} (${event.id})`);
  
  // Respond immediately to acknowledge receipt
  res.json({ received: true });

  // Process asynchronously to avoid timeout
  setImmediate(async () => {
    try {
      await webhookProcessor.processEvent(event);
      logger.info(`✅ Webhook processed: ${event.type} (${event.id})`);
    } catch (error: any) {
      logger.error(`❌ Error processing webhook ${event.id}: ${error.message}`);
      // Consider implementing retry logic or dead letter queue here
    }
  });
});

/**
 * Webhook test endpoint (for development)
 */
router.get('/webhook/stripe/test', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    endpoint: '/api/webhook/stripe',
    signature_configured: !!ENV.STRIPE_WEBHOOK_SECRET,
    mode: ENV.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live'
  });
});

/**
 * List recent webhook events (admin only)
 */
router.get('/webhook/stripe/events', async (req: Request, res: Response) => {
  try {
    const { pool } = require('../config/database');
    const result = await pool.query(`
      SELECT 
        stripe_event_id,
        type,
        processed,
        processed_at,
        error_message,
        created_at
      FROM stripe_webhook_events
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    res.json({
      count: result.rows.length,
      events: result.rows
    });
  } catch (error: any) {
    logger.error(`Error fetching webhook events: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * Retry failed webhook event (admin only)
 */
router.post('/webhook/stripe/retry/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { pool } = require('../config/database');
    
    // Get the event from database
    const result = await pool.query(
      'SELECT payload FROM stripe_webhook_events WHERE stripe_event_id = $1',
      [eventId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    const event = result.rows[0].payload as Stripe.Event;
    
    // Reset processed flag
    await pool.query(
      'UPDATE stripe_webhook_events SET processed = false, error_message = NULL WHERE stripe_event_id = $1',
      [eventId]
    );
    
    // Reprocess
    await webhookProcessor.processEvent(event);
    
    res.json({ success: true, message: `Event ${eventId} reprocessed` });
  } catch (error: any) {
    logger.error(`Error retrying webhook: ${error.message}`);
    res.status(500).json({ error: 'Failed to retry event' });
  }
});

export default router;
