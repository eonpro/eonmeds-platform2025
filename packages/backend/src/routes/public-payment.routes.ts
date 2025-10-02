/**
 * Public Payment Routes - Simple Implementation
 * No authentication required - for patients to pay invoices
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

/**
 * Test endpoint to verify routes are working
 */
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Public payment routes are working!',
    stripe: !!process.env.STRIPE_SECRET_KEY
  });
});

/**
 * Get invoice for payment (simplified)
 */
router.get('/invoice/:number', async (req: Request, res: Response) => {
  try {
    const invoiceNumber = req.params.number;
    
    // For now, return mock invoice data
    // In production, this would query the database
    const mockInvoice = {
      number: invoiceNumber,
      status: 'unpaid',
      totalAmount: 150.00,
      amountDue: 150.00,
      currency: 'USD',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lineItems: [
        {
          description: 'Consultation',
          quantity: 1,
          unitPrice: 150.00
        }
      ]
    };
    
    res.json({
      success: true,
      invoice: mockInvoice
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      error: 'Failed to fetch invoice'
    });
  }
});

/**
 * Create Stripe Checkout Session
 */
router.post('/invoice/:number/checkout', async (req: Request, res: Response) => {
  try {
    const invoiceNumber = req.params.number;
    
    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoiceNumber}`,
              description: 'Medical Services'
            },
            unit_amount: 15000, // $150.00 in cents
          },
          quantity: 1,
        }
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'https://d3p4f8m2bxony8.cloudfront.net'}/payment-success?invoice=${invoiceNumber}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://d3p4f8m2bxony8.cloudfront.net'}/payment-cancel?invoice=${invoiceNumber}`,
      metadata: {
        invoiceNumber,
        type: 'invoice_payment'
      }
    });
    
    res.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY
    });
  }
});

/**
 * Create Payment Intent
 */
router.post('/invoice/:number/payment-intent', async (req: Request, res: Response) => {
  try {
    const invoiceNumber = req.params.number;
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 15000, // $150.00 in cents
      currency: 'usd',
      metadata: {
        invoiceNumber,
        type: 'invoice_payment'
      },
      automatic_payment_methods: {
        enabled: true
      }
    });
    
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      message: error.message
    });
  }
});

/**
 * Handle payment success
 */
router.post('/payment-success', async (req: Request, res: Response) => {
  try {
    const { sessionId, paymentIntentId } = req.body;
    
    // In production, this would update the invoice in the database
    console.log('Payment successful:', { sessionId, paymentIntentId });
    
    res.json({
      success: true,
      message: 'Payment recorded successfully'
    });
  } catch (error: any) {
    console.error('Error processing payment success:', error);
    res.status(500).json({
      error: 'Failed to process payment'
    });
  }
});

export default router;
