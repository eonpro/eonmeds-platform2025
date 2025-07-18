import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripeConfig } from '../config/stripe.config';
import pool from '../config/database';

const stripe = new Stripe(stripeConfig.apiKey, {
  apiVersion: '2023-10-16',
});

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      stripeConfig.webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📨 Stripe webhook received: ${event.type}`);

  try {
    // Handle different event types
    switch (event.type) {
      // Customer events
      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;
      
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      // Subscription events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      // Invoice events
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // Payment events
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Store all webhook events for audit
    await storeWebhookEvent(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Store webhook event for audit trail
async function storeWebhookEvent(event: Stripe.Event) {
  await pool.query(
    `INSERT INTO webhook_events (source, event_type, webhook_id, payload, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    ['stripe', event.type, event.id, JSON.stringify(event)]
  );
}

// Customer created - update patient record
async function handleCustomerCreated(customer: Stripe.Customer) {
  const patientId = customer.metadata.patient_id;
  if (patientId) {
    await pool.query(
      'UPDATE patients SET stripe_customer_id = $1 WHERE patient_id = $2',
      [customer.id, patientId]
    );
    console.log(`✅ Linked Stripe customer ${customer.id} to patient ${patientId}`);
  }
}

// Customer updated - sync changes
async function handleCustomerUpdated(customer: Stripe.Customer) {
  console.log(`Customer updated: ${customer.id}`);
  // Add any sync logic here
}

// Subscription created - update patient status
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Get patient by stripe customer ID
  const result = await pool.query(
    'SELECT patient_id FROM patients WHERE stripe_customer_id = $1',
    [customerId]
  );
  
  if (result.rows.length > 0) {
    const patientId = result.rows[0].patient_id;
    
    // Update patient with subscription info
    await pool.query(
      `UPDATE patients 
       SET subscription_status = $1, 
           subscription_id = $2,
           subscription_start_date = $3,
           membership_hashtags = array_append(membership_hashtags, 'activemember')
       WHERE patient_id = $4`,
      [
        subscription.status,
        subscription.id,
        new Date(subscription.created * 1000),
        patientId
      ]
    );
    
    console.log(`✅ Created subscription for patient ${patientId}`);
  }
}

// Subscription updated - handle status changes
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  const result = await pool.query(
    'SELECT patient_id FROM patients WHERE stripe_customer_id = $1',
    [customerId]
  );
  
  if (result.rows.length > 0) {
    const patientId = result.rows[0].patient_id;
    
    // Update hashtags based on status
    let hashtags: string[] = [];
    switch (subscription.status) {
      case 'active':
        hashtags = ['activemember'];
        break;
      case 'paused':
        hashtags = ['paused'];
        break;
      case 'canceled':
        hashtags = ['cancelled'];
        break;
    }
    
    await pool.query(
      `UPDATE patients 
       SET subscription_status = $1,
           membership_hashtags = $2
       WHERE patient_id = $3`,
      [subscription.status, hashtags, patientId]
    );
    
    console.log(`✅ Updated subscription status for patient ${patientId}: ${subscription.status}`);
  }
}

// Subscription deleted - update patient
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  const result = await pool.query(
    'SELECT patient_id FROM patients WHERE stripe_customer_id = $1',
    [customerId]
  );
  
  if (result.rows.length > 0) {
    const patientId = result.rows[0].patient_id;
    
    await pool.query(
      `UPDATE patients 
       SET subscription_status = 'canceled',
           membership_hashtags = ARRAY['cancelled'],
           subscription_end_date = NOW()
       WHERE patient_id = $2`,
      [patientId]
    );
    
    console.log(`✅ Cancelled subscription for patient ${patientId}`);
  }
}

// Invoice created - store in database
async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  const invoiceNumber = await generateInvoiceNumber();
  
  await pool.query(
    `INSERT INTO invoices (
      invoice_number, stripe_invoice_id, patient_id, stripe_customer_id,
      invoice_date, due_date, status, subtotal, tax_amount, total_amount,
      currency, description, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (stripe_invoice_id) DO UPDATE
    SET status = EXCLUDED.status, updated_at = NOW()`,
    [
      invoiceNumber,
      invoice.id,
      invoice.metadata?.patient_id || null,
      invoice.customer,
      new Date(invoice.created * 1000),
      invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      'draft',
      invoice.subtotal / 100, // Convert from cents
      invoice.tax || 0 / 100,
      invoice.total / 100,
      invoice.currency.toUpperCase(),
      invoice.description || 'Medical services',
      JSON.stringify(invoice.metadata || {})
    ]
  );
  
  console.log(`✅ Created invoice ${invoiceNumber} (Stripe: ${invoice.id})`);
}

// Invoice finalized - update status
async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
  await pool.query(
    'UPDATE invoices SET status = $1, updated_at = NOW() WHERE stripe_invoice_id = $2',
    ['open', invoice.id]
  );
  console.log(`✅ Invoice finalized: ${invoice.id}`);
}

// Invoice paid - update records
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  await pool.query(
    `UPDATE invoices 
     SET status = 'paid', 
         amount_paid = $1,
         payment_date = $2,
         payment_method = $3,
         paid_at = NOW(),
         updated_at = NOW()
     WHERE stripe_invoice_id = $4`,
    [
      invoice.amount_paid / 100,
      new Date(invoice.status_transitions.paid_at! * 1000),
      invoice.payment_intent ? 'card' : 'other',
      invoice.id
    ]
  );
  
  // Record payment in payment history
  if (invoice.payment_intent) {
    await pool.query(
      `INSERT INTO invoice_payments (
        invoice_id, amount, payment_method, payment_date,
        stripe_payment_intent_id, status
      ) 
      SELECT id, $1, $2, $3, $4, $5
      FROM invoices WHERE stripe_invoice_id = $6`,
      [
        invoice.amount_paid / 100,
        'card',
        new Date(),
        invoice.payment_intent,
        'succeeded',
        invoice.id
      ]
    );
  }
  
  console.log(`✅ Invoice paid: ${invoice.id} - Amount: $${invoice.amount_paid / 100}`);
}

// Invoice payment failed - handle failure
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  await pool.query(
    'UPDATE invoices SET status = $1, updated_at = NOW() WHERE stripe_invoice_id = $2',
    ['overdue', invoice.id]
  );
  
  console.log(`❌ Invoice payment failed: ${invoice.id}`);
  
  // TODO: Send notification to patient
  // TODO: Update patient hashtag to 'paymentissue'
}

// Payment succeeded
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`✅ Payment succeeded: ${paymentIntent.id} - Amount: $${paymentIntent.amount / 100}`);
}

// Payment failed
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`❌ Payment failed: ${paymentIntent.id}`);
}

// Helper to generate invoice number
async function generateInvoiceNumber(): Promise<string> {
  const result = await pool.query('SELECT generate_invoice_number() as number');
  return result.rows[0].number;
} 