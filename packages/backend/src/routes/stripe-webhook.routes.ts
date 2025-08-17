import { Router, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { stripeConfig } from "../config/stripe.config";
import { pool } from "../config/database";
import { logger } from "../utils/logger";

const router = Router();

// Initialize Stripe
const stripe = new Stripe(stripeConfig.apiKey, {
  apiVersion: stripeConfig.apiVersion as any,
});

// Stripe webhook endpoint - requires raw body
router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;

    if (!sig) {
      logger.error("No stripe signature found");
      res.status(400).send("No signature found");
      return;
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        stripeConfig.webhookSecret || ""
      );
    } catch (err: any) {
      logger.error(`Webhook signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case "customer.created":
          await handleCustomerCreated(event.data.object as Stripe.Customer);
          break;

        case "payment_method.attached":
          await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      // Return a 200 response to acknowledge receipt of the event
      res.json({ received: true });
    } catch (error: any) {
      logger.error(`Error processing webhook event: ${error.message}`, {
        eventType: event.type,
        eventId: event.id,
      });
      // Still return 200 to prevent Stripe from retrying
      res.json({ received: true, error: error.message });
    }
  }
);

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`Payment succeeded: ${paymentIntent.id}`);

  const { invoice_id, invoice_number, patient_id } = paymentIntent.metadata || {};

  if (!invoice_id) {
    logger.warn(`No invoice_id in payment intent metadata: ${paymentIntent.id}`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Update invoice status
    await client.query(
      `UPDATE invoices 
       SET status = 'paid',
           payment_date = NOW(),
           stripe_payment_intent_id = $2,
           amount_paid = total_amount,
           updated_at = NOW()
       WHERE id = $1`,
      [invoice_id, paymentIntent.id]
    );

    // Check if payment record already exists (idempotency)
    const existingPayment = await client.query(
      `SELECT id FROM invoice_payments 
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );

    if (existingPayment.rows.length === 0) {
      // Record payment in invoice_payments table
      await client.query(
        `INSERT INTO invoice_payments (
          invoice_id,
          amount,
          payment_method,
          payment_date,
          stripe_payment_intent_id,
          status,
          created_at
        ) VALUES ($1, $2, $3, NOW(), $4, $5, NOW())`,
        [
          invoice_id,
          paymentIntent.amount / 100, // Convert from cents
          paymentIntent.payment_method_types[0] || "card",
          paymentIntent.id,
          "succeeded",
        ]
      );
    }

    await client.query("COMMIT");
    logger.info(`Successfully processed payment for invoice ${invoice_id}`);
  } catch (error: any) {
    await client.query("ROLLBACK");
    logger.error(`Error updating invoice for payment: ${error.message}`, {
      paymentIntentId: paymentIntent.id,
      invoiceId: invoice_id,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.warn(`Payment failed: ${paymentIntent.id}`);

  const { invoice_id } = paymentIntent.metadata || {};

  if (!invoice_id) {
    return;
  }

  // Log the failure
  await pool.query(
    `INSERT INTO invoice_payments (
      invoice_id,
      amount,
      payment_method,
      payment_date,
      stripe_payment_intent_id,
      status,
      error_message,
      created_at
    ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, NOW())`,
    [
      invoice_id,
      paymentIntent.amount / 100,
      paymentIntent.payment_method_types[0] || "card",
      paymentIntent.id,
      "failed",
      paymentIntent.last_payment_error?.message || "Payment failed",
    ]
  );
}

/**
 * Handle customer creation
 */
async function handleCustomerCreated(customer: Stripe.Customer) {
  logger.info(`Customer created: ${customer.id}`);

  // Update patient record if metadata contains patient_id
  const patientId = customer.metadata?.patient_id;
  if (patientId) {
    await pool.query(
      `UPDATE patients 
       SET stripe_customer_id = $1,
           updated_at = NOW()
       WHERE patient_id = $2 AND stripe_customer_id IS NULL`,
      [customer.id, patientId]
    );
  }
}

/**
 * Handle payment method attachment
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  logger.info(`Payment method attached: ${paymentMethod.id} to customer ${paymentMethod.customer}`);
  // Could store payment method details if needed
}

/**
 * Handle successful invoice payment (for subscriptions)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info(`Invoice payment succeeded: ${invoice.id}`);
  
  // This would be used for subscription/recurring payments
  const { invoice_id } = invoice.metadata || {};
  
  if (invoice_id) {
    await pool.query(
      `UPDATE invoices 
       SET status = 'paid',
           payment_date = NOW(),
           stripe_invoice_id = $2,
           amount_paid = total_amount,
           updated_at = NOW()
       WHERE id = $1`,
      [invoice_id, invoice.id]
    );
  }
}

/**
 * Handle failed invoice payment (for subscriptions)
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logger.warn(`Invoice payment failed: ${invoice.id}`);
  
  // Log the failure and potentially notify the patient
  const { invoice_id } = invoice.metadata || {};
  
  if (invoice_id) {
    await pool.query(
      `UPDATE invoices 
       SET status = 'payment_failed',
           updated_at = NOW()
       WHERE id = $1`,
      [invoice_id]
    );
  }
}

export default router;