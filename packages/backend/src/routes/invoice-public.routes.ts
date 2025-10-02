/**
 * Public Invoice Payment Routes
 * No authentication required - for patients to pay invoices online
 */

import { Router, Request, Response } from 'express';
import { PaymentLinkService } from '../modules/invoicing/services/payment-link.service';
import { InvoiceModule } from '../modules/invoicing';
import { Pool } from 'pg';
import Stripe from 'stripe';

const router = Router();

let paymentLinkService: PaymentLinkService;
let invoiceModule: InvoiceModule;
let stripe: Stripe;

// Initialize services
export function initializePublicInvoiceRoutes(
  database: Pool, 
  stripeClient?: Stripe
): Router {
  // Initialize services
  stripe = stripeClient!;
  
  paymentLinkService = new PaymentLinkService(database, stripe, {
    baseUrl: process.env.FRONTEND_URL || 'https://d3p4f8m2bxony8.cloudfront.net',
    secretKey: process.env.PAYMENT_LINK_SECRET
  });
  
  invoiceModule = new InvoiceModule({
    database,
    stripe,
    emailConfig: {
      from: process.env.EMAIL_FROM || 'billing@eonmeds.com'
    }
  });
  
  return router;
}

/**
 * Get public invoice details for payment
 * GET /api/v1/public/invoice/:number
 */
router.get('/invoice/:number', async (req: Request, res: Response) => {
  try {
    const invoiceNumber = req.params.number;
    
    // Get public invoice data
    const data = await paymentLinkService.getPublicInvoiceData(invoiceNumber);
    
    // Check if already paid
    if (data.invoice.status === 'paid') {
      return res.json({
        success: true,
        invoice: data.invoice,
        message: 'This invoice has already been paid',
        paid: true
      });
    }
    
    res.json({
      success: true,
      invoice: data.invoice,
      paymentMethods: data.paymentMethods,
      paid: false
    });
  } catch (error: any) {
    console.error('Error fetching public invoice:', error);
    
    if (error.message === 'Invoice not found') {
      res.status(404).json({
        error: 'Invoice not found'
      });
    } else {
      res.status(500).json({
        error: 'Failed to fetch invoice'
      });
    }
  }
});

/**
 * Validate payment token
 * GET /api/v1/public/invoice/validate-token
 */
router.get('/invoice/validate-token', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    const invoiceId = req.query.id as string;
    
    if (!token) {
      return res.status(400).json({
        error: 'Payment token required'
      });
    }
    
    const validation = await paymentLinkService.validatePaymentToken(token, invoiceId);
    
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        valid: false
      });
    }
    
    res.json({
      success: true,
      valid: true,
      invoice: validation.invoice
    });
  } catch (error: any) {
    console.error('Error validating payment token:', error);
    res.status(500).json({
      error: 'Failed to validate payment token'
    });
  }
});

/**
 * Create Stripe Checkout session for invoice payment
 * POST /api/v1/public/invoice/:number/checkout
 */
router.post('/invoice/:number/checkout', async (req: Request, res: Response) => {
  try {
    const invoiceNumber = req.params.number;
    const { token } = req.body;
    
    // Get invoice
    const data = await paymentLinkService.getPublicInvoiceData(invoiceNumber);
    
    // Verify invoice can be paid
    if (data.invoice.status === 'paid') {
      return res.status(400).json({
        error: 'Invoice has already been paid'
      });
    }
    
    // If token provided, validate it
    if (token) {
      const validation = await paymentLinkService.validatePaymentToken(token);
      if (!validation.valid) {
        return res.status(401).json({
          error: 'Invalid or expired payment link'
        });
      }
    }
    
    // Get full invoice details (need ID for Stripe)
    const invoices = await invoiceModule.invoiceService.search({
      search: invoiceNumber,
      limit: 1
    });
    
    if (invoices.total === 0) {
      return res.status(404).json({
        error: 'Invoice not found'
      });
    }
    
    const invoice = invoices.invoices[0];
    
    // Create Stripe Checkout session
    const session = await paymentLinkService.createCheckoutSession(invoice);
    
    // Log payment attempt
    await paymentLinkService.logPaymentAttempt(
      invoice.id,
      false,
      'Checkout session created',
      req.ip
    );
    
    res.json({
      success: true,
      sessionId: session.sessionId,
      checkoutUrl: session.url
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create payment session',
      message: error.message
    });
  }
});

/**
 * Create Payment Intent for direct payment
 * POST /api/v1/public/invoice/:number/payment-intent
 */
router.post('/invoice/:number/payment-intent', async (req: Request, res: Response) => {
  try {
    const invoiceNumber = req.params.number;
    const { token } = req.body;
    
    // Get invoice
    const data = await paymentLinkService.getPublicInvoiceData(invoiceNumber);
    
    // Verify invoice can be paid
    if (data.invoice.status === 'paid') {
      return res.status(400).json({
        error: 'Invoice has already been paid'
      });
    }
    
    // If token provided, validate it
    if (token) {
      const validation = await paymentLinkService.validatePaymentToken(token);
      if (!validation.valid) {
        return res.status(401).json({
          error: 'Invalid or expired payment link'
        });
      }
    }
    
    // Get full invoice details
    const invoices = await invoiceModule.invoiceService.search({
      search: invoiceNumber,
      limit: 1
    });
    
    if (invoices.total === 0) {
      return res.status(404).json({
        error: 'Invoice not found'
      });
    }
    
    const invoice = invoices.invoices[0];
    
    // Create Payment Intent
    const paymentIntent = await paymentLinkService.createPaymentIntent(invoice);
    
    // Log payment attempt
    await paymentLinkService.logPaymentAttempt(
      invoice.id,
      false,
      'Payment intent created',
      req.ip
    );
    
    res.json({
      success: true,
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
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
 * Handle payment success (called by frontend after successful payment)
 * POST /api/v1/public/invoice/payment-success
 */
router.post('/invoice/payment-success', async (req: Request, res: Response) => {
  try {
    const { sessionId, paymentIntentId, invoiceId } = req.body;
    
    if (!sessionId && !paymentIntentId) {
      return res.status(400).json({
        error: 'Session ID or Payment Intent ID required'
      });
    }
    
    // Handle payment success
    const invoice = await paymentLinkService.handlePaymentSuccess(
      sessionId,
      paymentIntentId
    );
    
    // Log successful payment
    await paymentLinkService.logPaymentAttempt(
      invoiceId || invoice.id,
      true,
      'Payment successful',
      req.ip
    );
    
    // TODO: Send receipt email
    // await emailService.sendReceipt(invoice);
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      invoice: {
        number: invoice.number,
        status: invoice.status,
        paidDate: invoice.paidDate
      }
    });
  } catch (error: any) {
    console.error('Error processing payment success:', error);
    res.status(500).json({
      error: 'Failed to process payment',
      message: error.message
    });
  }
});

/**
 * Get payment status
 * GET /api/v1/public/invoice/:number/payment-status
 */
router.get('/invoice/:number/payment-status', async (req: Request, res: Response) => {
  try {
    const invoiceNumber = req.params.number;
    
    // Get invoice status
    const data = await paymentLinkService.getPublicInvoiceData(invoiceNumber);
    
    res.json({
      success: true,
      invoiceNumber,
      status: data.invoice.status,
      paid: data.invoice.status === 'paid',
      amountDue: data.invoice.amountDue
    });
  } catch (error: any) {
    console.error('Error checking payment status:', error);
    
    if (error.message === 'Invoice not found') {
      res.status(404).json({
        error: 'Invoice not found'
      });
    } else {
      res.status(500).json({
        error: 'Failed to check payment status'
      });
    }
  }
});

/**
 * Stripe webhook for payment confirmation
 * POST /api/v1/public/stripe/webhook
 * 
 * Note: This needs raw body, should be mounted before body parser
 */
router.post('/stripe/webhook', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    
    if (!sig) {
      return res.status(400).json({
        error: 'No signature provided'
      });
    }
    
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.payment_status === 'paid' && session.metadata?.invoiceId) {
          await paymentLinkService.handlePaymentSuccess(session.id);
        }
        break;
        
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        if (paymentIntent.metadata?.invoiceId) {
          await paymentLinkService.handlePaymentSuccess(undefined, paymentIntent.id);
        }
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

export default router;
