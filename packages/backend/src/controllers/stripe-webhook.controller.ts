import { Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { pool } from '../config/database';

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    console.error('No stripe-signature header');
    return res.status(400).json({ error: 'No signature provided' });
  }

  try {
    // Construct the event
    const event = stripeService.constructWebhookEvent(req.body, sig);
    
    console.log(`Stripe webhook received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as any);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as any);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as any);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as any);
        break;

      case 'customer.created':
        console.log('Customer created:', event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return res.status(400).json({ error: error.message });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('Payment succeeded:', paymentIntent.id);
  
  // Update invoice if this payment is linked to one
  if (paymentIntent.metadata?.invoice_id) {
    try {
      await pool.query(
        `UPDATE invoices 
         SET status = 'paid', 
             stripe_payment_intent_id = $1,
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [paymentIntent.id, paymentIntent.metadata.invoice_id]
      );
      console.log(`Updated invoice ${paymentIntent.metadata.invoice_id} as paid`);
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  console.log('Payment failed:', paymentIntent.id);
  
  if (paymentIntent.metadata?.invoice_id) {
    try {
      await pool.query(
        `UPDATE invoices 
         SET notes = COALESCE(notes, '') || ' Payment failed: ' || $1,
             updated_at = NOW()
         WHERE id = $2`,
        [paymentIntent.last_payment_error?.message || 'Unknown error', paymentIntent.metadata.invoice_id]
      );
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  // Find our invoice by Stripe invoice ID
  try {
    await pool.query(
      `UPDATE invoices 
       SET status = 'paid',
           stripe_invoice_id = $1,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE stripe_customer_id = $2 
         AND total_amount = $3
         AND status != 'paid'
       ORDER BY created_at DESC
       LIMIT 1`,
      [invoice.id, invoice.customer, invoice.amount_paid / 100]
    );
  } catch (error) {
    console.error('Error updating invoice from Stripe invoice:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log('Invoice payment failed:', invoice.id);
  
  try {
    await pool.query(
      `UPDATE invoices 
       SET notes = COALESCE(notes, '') || ' Invoice payment failed',
           updated_at = NOW()
       WHERE stripe_invoice_id = $1`,
      [invoice.id]
    );
  } catch (error) {
    console.error('Error updating failed invoice:', error);
  }
}
