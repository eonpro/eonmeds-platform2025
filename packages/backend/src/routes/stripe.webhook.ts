import { Request, Response } from 'express';
import Stripe from 'stripe';
import { pool } from '../config/database';
import { getStripeClient } from '../config/stripe.config';
import { mirrorExternalPaymentToInvoice } from '../lib/mirrorExternalPayment';

/**
 * Stripe webhook handler - Hardened version
 * Must be mounted with express.raw() middleware
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Quick response - process async
  res.status(200).json({ received: true });

  // Process event asynchronously
  processWebhookEvent(event).catch((err) => {
    console.error('Error processing webhook event:', err);
  });
}

/**
 * Process webhook event with idempotency
 */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  const client = await pool.connect();

  try {
    // Begin transaction
    await client.query('BEGIN');

    // Check if event was already processed (idempotency)
    const processed = await client.query(
      'SELECT event_id FROM processed_events WHERE event_id = $1',
      [event.id]
    );

    if (processed.rows.length > 0) {
      console.log(`Event ${event.id} already processed, skipping`);
      await client.query('COMMIT');
      return;
    }

    // Store raw event in billing_events (minimal PII)
    const sanitizedPayload = sanitizeEventPayload(event);
    await client.query(
      `INSERT INTO billing_events (id, event_id, type, payload, created_at) 
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
      [event.id, event.type, sanitizedPayload]
    );

    // Process the event
    await handleEvent(client, event);

    // Mark event as processed
    await client.query('INSERT INTO processed_events (event_id, processed_at) VALUES ($1, NOW())', [
      event.id,
    ]);

    await client.query('COMMIT');
    console.log(`Successfully processed ${event.type} event: ${event.id}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed to process ${event.type} event ${event.id}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Sanitize event payload to minimize PII
 */
function sanitizeEventPayload(event: Stripe.Event): any {
  const sanitized = {
    id: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    data: {
      object: {
        id: (event.data.object as any).id,
        object: (event.data.object as any).object,
      },
    },
  };

  // Add specific fields based on event type
  const obj = event.data.object as any;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      sanitized.data.object = {
        ...sanitized.data.object,
        status: obj.status,
        customer: obj.customer,
        current_period_end: obj.current_period_end,
        cancel_at_period_end: obj.cancel_at_period_end,
        default_payment_method: obj.default_payment_method,
        items: obj.items?.data?.map((item: any) => ({
          id: item.id,
          price: { id: item.price.id },
        })),
      };
      break;

    case 'invoice.created':
    case 'invoice.finalized':
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.voided':
    case 'invoice.marked_uncollectible':
      sanitized.data.object = {
        ...sanitized.data.object,
        status: obj.status,
        customer: obj.customer,
        subscription: obj.subscription,
        amount_paid: obj.amount_paid,
        amount_due: obj.amount_due,
        hosted_invoice_url: obj.hosted_invoice_url,
        invoice_pdf: obj.invoice_pdf,
      };
      break;

    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
    case 'payment_intent.processing':
      sanitized.data.object = {
        ...sanitized.data.object,
        status: obj.status,
        amount: obj.amount,
        customer: obj.customer,
        invoice: obj.invoice,
      };
      break;

    case 'charge.refunded':
    case 'charge.succeeded':
      sanitized.data.object = {
        ...sanitized.data.object,
        amount: obj.amount,
        amount_refunded: obj.amount_refunded,
        customer: obj.customer,
        invoice: obj.invoice,
        payment_intent: obj.payment_intent,
        metadata: obj.metadata,
      };
      break;
  }

  return sanitized;
}

/**
 * Handle specific event types
 */
async function handleEvent(client: any, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    // Subscription events
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(client, event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(client, event.data.object as Stripe.Subscription);
      break;

    // Invoice events
    case 'invoice.created':
    case 'invoice.finalized':
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.voided':
    case 'invoice.marked_uncollectible':
      await handleInvoiceUpdate(client, event.data.object as Stripe.Invoice);
      break;

    // Payment intent events
    case 'payment_intent.succeeded':
      await handlePaymentIntentUpdate(client, event.data.object as Stripe.PaymentIntent);
      // Also handle mirroring for external payments
      await handlePaymentIntentMirroring(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
    case 'payment_intent.processing':
      await handlePaymentIntentUpdate(client, event.data.object as Stripe.PaymentIntent);
      break;

    // Charge events
    case 'charge.succeeded':
      await handleChargeSucceeded(event.data.object as Stripe.Charge);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(client, event.data.object as Stripe.Charge);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle subscription create/update
 */
async function handleSubscriptionUpdate(
  client: any,
  subscription: Stripe.Subscription
): Promise<void> {
  // Check if subscriptions table exists
  const tableExists = await checkTableExists(client, 'subscriptions');
  if (!tableExists) return;

  await client.query(
    `INSERT INTO subscriptions (
      stripe_subscription_id,
      stripe_customer_id,
      status,
      current_period_end,
      cancel_at_period_end,
      default_payment_method,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
      status = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      default_payment_method = EXCLUDED.default_payment_method,
      updated_at = NOW()`,
    [
      subscription.id,
      subscription.customer,
      subscription.status,
      new Date(subscription.current_period_end * 1000),
      subscription.cancel_at_period_end,
      typeof subscription.default_payment_method === 'string'
        ? subscription.default_payment_method
        : subscription.default_payment_method?.id || null,
    ]
  );
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(
  client: any,
  subscription: Stripe.Subscription
): Promise<void> {
  const tableExists = await checkTableExists(client, 'subscriptions');
  if (!tableExists) return;

  await client.query(
    `UPDATE subscriptions 
     SET status = 'canceled', 
         canceled_at = NOW(),
         updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [subscription.id]
  );
}

/**
 * Handle invoice updates
 */
async function handleInvoiceUpdate(client: any, invoice: Stripe.Invoice): Promise<void> {
  const tableExists = await checkTableExists(client, 'invoices');
  if (!tableExists) return;

  await client.query(
    `INSERT INTO invoices (
      stripe_invoice_id,
      stripe_customer_id,
      status,
      amount_due,
      amount_paid,
      hosted_invoice_url,
      invoice_pdf,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    ON CONFLICT (stripe_invoice_id) DO UPDATE SET
      status = EXCLUDED.status,
      amount_paid = EXCLUDED.amount_paid,
      hosted_invoice_url = EXCLUDED.hosted_invoice_url,
      invoice_pdf = EXCLUDED.invoice_pdf,
      updated_at = NOW()`,
    [
      invoice.id,
      invoice.customer,
      invoice.status,
      invoice.amount_due,
      invoice.amount_paid,
      invoice.hosted_invoice_url,
      invoice.invoice_pdf,
    ]
  );

  // Update paid_at for paid invoices
  if (invoice.status === 'paid') {
    await client.query(
      'UPDATE invoices SET paid_at = NOW() WHERE stripe_invoice_id = $1 AND paid_at IS NULL',
      [invoice.id]
    );
  }
}

/**
 * Handle payment intent updates
 */
async function handlePaymentIntentUpdate(
  client: any,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  // Update related invoice if exists
  if (paymentIntent.invoice) {
    const tableExists = await checkTableExists(client, 'invoices');
    if (tableExists) {
      await client.query(
        `UPDATE invoices 
         SET payment_intent_status = $1, updated_at = NOW()
         WHERE stripe_invoice_id = $2`,
        [paymentIntent.status, paymentIntent.invoice]
      );
    }
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(client: any, charge: Stripe.Charge): Promise<void> {
  // Log refund in billing_events is already done
  // Update invoice if related
  if (charge.invoice) {
    const tableExists = await checkTableExists(client, 'invoices');
    if (tableExists) {
      await client.query(
        `UPDATE invoices 
         SET amount_refunded = COALESCE(amount_refunded, 0) + $1,
             updated_at = NOW()
         WHERE stripe_invoice_id = $2`,
        [charge.amount_refunded - (charge.amount_captured || 0), charge.invoice]
      );
    }
  }
}

/**
 * Check if table exists
 */
async function checkTableExists(client: any, tableName: string): Promise<boolean> {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0].exists;
}

/**
 * Handle payment intent mirroring for external payments
 */
async function handlePaymentIntentMirroring(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    const stripe = getStripeClient();

    // Check if payment intent has charges
    if (!paymentIntent.charges || paymentIntent.charges.data.length === 0) {
      return;
    }

    // Get the first charge
    const charge = paymentIntent.charges.data[0];

    // Skip if it's a platform-originated charge
    if (charge.metadata?.platform === 'EONPRO') {
      console.log(`Skipping platform charge ${charge.id}`);
      return;
    }

    // If charge has invoice, check if it's platform-originated
    if (charge.invoice) {
      try {
        const invoiceId = typeof charge.invoice === 'string' ? charge.invoice : charge.invoice.id;
        const invoice = await stripe.invoices.retrieve(invoiceId);

        if (invoice.metadata?.platform === 'EONPRO') {
          console.log(`Skipping charge ${charge.id} with platform invoice`);
          return;
        }
      } catch (error) {
        console.error('Error checking invoice:', error);
      }
    }

    // Mirror the external payment
    const result = await mirrorExternalPaymentToInvoice({ charge });
    console.log(`Mirror result for charge ${charge.id}:`, result);
  } catch (error) {
    console.error('Error in handlePaymentIntentMirroring:', error);
    // Don't throw - we don't want to fail the webhook
  }
}

/**
 * Handle charge.succeeded event
 */
async function handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
  try {
    const stripe = getStripeClient();

    // Skip if it's a platform-originated charge
    if (charge.metadata?.platform === 'EONPRO') {
      console.log(`Skipping platform charge ${charge.id}`);
      return;
    }

    // If charge has invoice, check if it's platform-originated
    if (charge.invoice) {
      try {
        const invoiceId = typeof charge.invoice === 'string' ? charge.invoice : charge.invoice.id;
        const invoice = await stripe.invoices.retrieve(invoiceId);

        if (invoice.metadata?.platform === 'EONPRO') {
          console.log(`Skipping charge ${charge.id} with platform invoice`);
          return;
        }
      } catch (error) {
        console.error('Error checking invoice:', error);
      }
    }

    // Mirror the external payment
    const result = await mirrorExternalPaymentToInvoice({ charge });
    console.log(`Mirror result for charge ${charge.id}:`, result);
  } catch (error) {
    console.error('Error in handleChargeSucceeded:', error);
    // Don't throw - we don't want to fail the webhook
  }
}
