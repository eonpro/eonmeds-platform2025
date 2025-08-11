import { Request, Response } from 'express';
import Stripe from 'stripe';
import { pool } from '../config/database';
import { getStripeClient } from '../config/stripe.config';

/**
 * Stripe webhook handler
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
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log the event type
  console.log(`Stripe webhook received: ${event.type}`);

  // Store event in database (fire and forget for quick response)
  storeWebhookEvent(event).catch(err => {
    console.error('Failed to store webhook event:', err);
  });

  // Handle specific event types
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'invoice.paid':
        handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      case 'customer.subscription.updated':
        handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    // Log error but don't fail the webhook
    console.error(`Error handling ${event.type}:`, error);
  }

  // Always return 200 quickly
  res.status(200).json({ received: true });
}

/**
 * Store webhook event in billing_events table
 */
async function storeWebhookEvent(event: Stripe.Event): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Ensure billing_events table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Insert the event
    await client.query(
      `INSERT INTO billing_events (type, payload) VALUES ($1, $2)`,
      [event.type, event]
    );
  } finally {
    client.release();
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log('Checkout session completed:', session.id);
  
  // Update local tables if needed
  if (session.customer && session.subscription) {
    const client = await pool.connect();
    try {
      // Check if we have a subscriptions table
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'subscriptions'
        )
      `);
      
      if (tableCheck.rows[0].exists) {
        // Update subscription status
        await client.query(
          `UPDATE subscriptions 
           SET stripe_subscription_id = $1, status = 'active', updated_at = NOW()
           WHERE stripe_customer_id = $2`,
          [session.subscription, session.customer]
        );
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
    } finally {
      client.release();
    }
  }
}

/**
 * Handle invoice paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  console.log('Invoice paid:', invoice.id);
  
  const client = await pool.connect();
  try {
    // Check if we have an invoices table
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'invoices'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      // Update invoice status
      await client.query(
        `UPDATE invoices 
         SET status = 'paid', paid_at = NOW(), updated_at = NOW()
         WHERE stripe_invoice_id = $1`,
        [invoice.id]
      );
    }
  } catch (error) {
    console.error('Error updating invoice:', error);
  } finally {
    client.release();
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log('Invoice payment failed:', invoice.id);
  
  const client = await pool.connect();
  try {
    // Check if we have an invoices table
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'invoices'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      // Update invoice status
      await client.query(
        `UPDATE invoices 
         SET status = 'failed', updated_at = NOW()
         WHERE stripe_invoice_id = $1`,
        [invoice.id]
      );
    }
  } catch (error) {
    console.error('Error updating invoice:', error);
  } finally {
    client.release();
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log('Subscription updated:', subscription.id);
  
  const client = await pool.connect();
  try {
    // Check if we have a subscriptions table
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscriptions'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      // Update subscription
      await client.query(
        `UPDATE subscriptions 
         SET status = $1, 
             cancel_at_period_end = $2,
             current_period_end = $3,
             updated_at = NOW()
         WHERE stripe_subscription_id = $4`,
        [
          subscription.status,
          subscription.cancel_at_period_end,
          new Date(subscription.current_period_end * 1000),
          subscription.id
        ]
      );
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
  } finally {
    client.release();
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('Subscription deleted:', subscription.id);
  
  const client = await pool.connect();
  try {
    // Check if we have a subscriptions table
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscriptions'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      // Update subscription status
      await client.query(
        `UPDATE subscriptions 
         SET status = 'canceled', 
             canceled_at = NOW(),
             updated_at = NOW()
         WHERE stripe_subscription_id = $1`,
        [subscription.id]
      );
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
  } finally {
    client.release();
  }
}
