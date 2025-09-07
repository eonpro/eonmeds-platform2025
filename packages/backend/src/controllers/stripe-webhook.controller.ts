import { Request, Response } from "express";
import Stripe from "stripe";
import { pool } from "../config/database";
import { getStripeClient } from "../config/stripe.config";
import { ENV } from "../config/env";
import { logger } from "../lib/logger";

/**
 * Handle Stripe webhook events with signature verification
 */
export const handleStripeWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = ENV.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    logger.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).json({ error: 'Webhook endpoint not configured' });
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature for security
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err: any) {
    logger.error(`❌ Webhook signature verification failed: ${err.message}`);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  // Log the event
  logger.info(`✅ Stripe webhook received: ${event.type}`);
  
  try {
    // Store webhook event for audit trail
    await storeWebhookEvent(event);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event);
        break;
      
      case 'charge.succeeded':
        await handleChargeSucceeded(event);
        break;
      
      case 'charge.failed':
        await handleChargeFailed(event);
        break;
      
      case 'customer.created':
        await handleCustomerCreated(event);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
      
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event);
        break;
      
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error(`Error processing webhook: ${error.message}`);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Store webhook event for audit trail
 */
async function storeWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO stripe_webhook_events 
       (event_id, event_type, payload, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (event_id) DO NOTHING`,
      [event.id, event.type, JSON.stringify(event)]
    );
  } catch (error) {
    logger.error('Failed to store webhook event:', error);
    // Don't throw - continue processing even if storage fails
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  logger.info(`💰 Payment successful: ${paymentIntent.id} for ${paymentIntent.amount / 100} ${paymentIntent.currency}`);
  
  // Update invoice if this payment is associated with one
  if (paymentIntent.metadata?.invoice_id) {
    await pool.query(
      `UPDATE invoices 
       SET status = 'paid', 
           paid_at = NOW(),
           stripe_payment_intent_id = $2
       WHERE id = $1`,
      [paymentIntent.metadata.invoice_id, paymentIntent.id]
    );
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  logger.error(`❌ Payment failed: ${paymentIntent.id}`);
  
  // Log failure reason
  if (paymentIntent.last_payment_error) {
    logger.error('Failure reason:', paymentIntent.last_payment_error.message);
  }
  
  // Update invoice status if applicable
  if (paymentIntent.metadata?.invoice_id) {
    await pool.query(
      `UPDATE invoices 
       SET status = 'failed',
           notes = COALESCE(notes, '') || ' Payment failed: ' || $2
       WHERE id = $1`,
      [paymentIntent.metadata.invoice_id, paymentIntent.last_payment_error?.message || 'Unknown error']
    );
  }
}

/**
 * Handle successful charge
 */
async function handleChargeSucceeded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  
  logger.info(`💳 Charge successful: ${charge.id} for ${charge.amount / 100} ${charge.currency}`);
  
  // Record charge in payment history
  if (charge.metadata?.invoice_id) {
    await pool.query(
      `INSERT INTO invoice_payments 
       (invoice_id, amount, payment_method, stripe_charge_id, payment_date)
       VALUES ($1, $2, 'stripe', $3, NOW())`,
      [charge.metadata.invoice_id, charge.amount / 100, charge.id]
    );
  }
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  
  logger.error(`❌ Charge failed: ${charge.id}`);
  logger.error('Failure reason:', charge.failure_message);
}

/**
 * Handle customer creation
 */
async function handleCustomerCreated(event: Stripe.Event): Promise<void> {
  const customer = event.data.object as Stripe.Customer;
  
  logger.info(`👤 Customer created: ${customer.id}`);
  
  // Update patient record if metadata includes patient_id
  if (customer.metadata?.patient_id) {
    await pool.query(
      `UPDATE patients 
       SET stripe_customer_id = $1 
       WHERE patient_id = $2`,
      [customer.id, customer.metadata.patient_id]
    );
  }
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  
  logger.info(`📧 Invoice payment succeeded: ${invoice.id}`);
  
  // Update subscription status if applicable
  if ((invoice as any).subscription && invoice.metadata?.patient_id) {
    await pool.query(
      `UPDATE patient_subscriptions 
       SET status = 'active',
           current_period_end = to_timestamp($2)
       WHERE stripe_subscription_id = $1`,
      [(invoice as any).subscription, invoice.period_end]
    );
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  
  logger.error(`❌ Invoice payment failed: ${invoice.id}`);
  
  // Update subscription status
  if ((invoice as any).subscription && invoice.metadata?.patient_id) {
    await pool.query(
      `UPDATE patient_subscriptions 
       SET status = 'past_due'
       WHERE stripe_subscription_id = $1`,
      [(invoice as any).subscription]
    );
  }
}

/**
 * Handle payment method attached
 */
async function handlePaymentMethodAttached(event: Stripe.Event): Promise<void> {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;
  
  logger.info(`💳 Payment method attached: ${paymentMethod.id} to customer ${paymentMethod.customer}`);
  
  // Could store payment method details if needed
}
