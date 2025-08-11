import { Router, Request, Response } from 'express';
import { expressjwt } from 'express-jwt';
import { expressJwtSecret } from 'jwks-rsa';
import {
  getOrCreateCustomer,
  createInvoiceAndPay,
  createSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  reactivateSubscription,
  createSetupIntent,
  attachPaymentMethod,
  updateSubscriptionPrice,
  applyCouponToSubscription,
  startTrialOnSubscription,
  createRefund,
  createRefundByInvoice,
  createCreditNote
} from '../lib/billingService';
import {
  validateBody,
  stripeErrorHandler,
  getOrCreateCustomerSchema,
  createSetupIntentSchema,
  attachPaymentMethodSchema,
  createInvoiceAndPaySchema,
  createSubscriptionSchema,
  pauseSubscriptionSchema,
  cancelSubscriptionSchema,
  updateSubscriptionPriceSchema,
  applyCouponSchema,
  subscriptionTrialSchema,
  portalSessionSchema,
  createRefundSchema,
  refundByInvoiceSchema,
  createCreditNoteSchema
} from '../lib/billing.validation';

const router = Router();

// Auth0 middleware configuration
const checkJwt = expressjwt({
  secret: expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

// Middleware to check for admin or billing roles
const checkBillingAccess = (req: Request, res: Response, next: any) => {
  const user = (req as any).auth;
  const roles = user?.roles || user?.['https://api.eonmeds.com/roles'] || [];
  
  if (!roles.includes('admin') && !roles.includes('billing')) {
    return res.status(403).json({
      ok: false,
      error: 'Access denied. Requires admin or billing role.'
    });
  }
  
  next();
};

// Apply auth middleware to all routes
router.use(checkJwt, checkBillingAccess);

/**
 * POST /customer/get-or-create
 * Get or create a Stripe customer for a patient
 */
router.post('/customer/get-or-create', 
  validateBody(getOrCreateCustomerSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { patientId, email, name, address } = req.body;
      const customerId = await getOrCreateCustomer({ patientId, email, name, address });
      
      res.json({
        ok: true,
        data: { customerId }
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /setup-intent
 * Create a SetupIntent for collecting payment methods
 */
router.post('/setup-intent',
  validateBody(createSetupIntentSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { patientId, email, name, address } = req.body;
      const result = await createSetupIntent({ patientId, email, name, address });
      
      res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /payment-methods/attach
 * Attach a payment method to a customer and set as default
 */
router.post('/payment-methods/attach',
  validateBody(attachPaymentMethodSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { patientId, payment_method_id, email, name } = req.body;
      
      // Get customer ID from patient
      const customerId = await getOrCreateCustomer({
        patientId,
        email: email || '',
        name: name || ''
      });
      
      const result = await attachPaymentMethod({
        customerId,
        paymentMethodId: payment_method_id
      });
      
      res.json({
        ok: true,
        data: {
          customerId: result.customer.id,
          defaultPaymentMethod: result.customer.invoice_settings.default_payment_method,
          paymentMethod: {
            id: result.paymentMethod.id,
            type: result.paymentMethod.type,
            card: result.paymentMethod.card
          }
        }
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /invoice/create-and-pay
 * Create an invoice and optionally pay it
 */
router.post('/invoice/create-and-pay',
  validateBody(createInvoiceAndPaySchema),
  async (req: Request, res: Response, next) => {
    try {
      const { customerId, patientId, items, email_invoice, email, name } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;
      
      let finalCustomerId = customerId;
      
      // If only patientId provided, get or create customer first
      if (!customerId && patientId) {
        if (!email || !name) {
          return res.status(400).json({
            ok: false,
            error: 'When using patientId, email and name are required'
          });
        }
        finalCustomerId = await getOrCreateCustomer({ patientId, email, name });
      }
      
      const result = await createInvoiceAndPay({
        customerId: finalCustomerId!,
        items,
        email_invoice,
        idempotencyKey
      });
      
      res.json({
        ok: true,
        data: result
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /subscription/create
 * Create a subscription for a customer
 */
router.post('/subscription/create',
  validateBody(createSubscriptionSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { customerId, patientId, priceId, email, name } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;
      
      let finalCustomerId = customerId;
      
      // If only patientId provided, get or create customer first
      if (!customerId && patientId) {
        if (!email || !name) {
          return res.status(400).json({
            ok: false,
            error: 'When using patientId, email and name are required'
          });
        }
        finalCustomerId = await getOrCreateCustomer({ patientId, email, name });
      }
      
      const subscription = await createSubscription({
        customerId: finalCustomerId!,
        priceId,
        idempotencyKey
      });
      
      res.json({
        ok: true,
        data: subscription
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /subscription/:id/pause
 * Pause a subscription
 */
router.post('/subscription/:id/pause',
  validateBody(pauseSubscriptionSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { id } = req.params;
      const { behavior } = req.body;
      
      const subscription = await pauseSubscription(id, behavior);
      
      res.json({
        ok: true,
        data: subscription
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /subscription/:id/resume
 * Resume a paused subscription
 */
router.post('/subscription/:id/resume', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    
    const subscription = await resumeSubscription(id);
    
    res.json({
      ok: true,
      data: subscription
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /subscription/:id/cancel
 * Cancel a subscription
 */
router.post('/subscription/:id/cancel',
  validateBody(cancelSubscriptionSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { id } = req.params;
      const { at_period_end = true } = req.body;
      
      const subscription = await cancelSubscription(id, { at_period_end });
      
      res.json({
        ok: true,
        data: subscription
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /subscription/:id/reactivate
 * Reactivate a subscription
 */
router.post('/subscription/:id/reactivate', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    
    const result = await reactivateSubscription(id);
    
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.message
      });
    }
    
    res.json({
      ok: true,
      data: result.subscription || { message: result.message }
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /subscription/update-price
 * Update subscription price with proration control
 */
router.post('/subscription/update-price',
  validateBody(updateSubscriptionPriceSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { id, priceId, proration_behavior } = req.body;
      
      const subscription = await updateSubscriptionPrice(id, priceId, proration_behavior);
      
      res.json({
        ok: true,
        data: subscription
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /subscription/apply-coupon
 * Apply a coupon or promotion code to a subscription
 */
router.post('/subscription/apply-coupon',
  validateBody(applyCouponSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { id, coupon, promotion_code } = req.body;
      
      const subscription = await applyCouponToSubscription(id, { coupon, promotion_code });
      
      res.json({
        ok: true,
        data: subscription
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /subscription/trial
 * Start or end a trial on a subscription
 */
router.post('/subscription/trial',
  validateBody(subscriptionTrialSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { id, trial_end } = req.body;
      
      const subscription = await startTrialOnSubscription(id, trial_end);
      
      res.json({
        ok: true,
        data: subscription
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /portal-session
 * Create a Stripe Customer Portal session
 */
router.post('/portal-session',
  validateBody(portalSessionSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { patientId, return_url, email, name } = req.body;
      
      // Get or create customer
      const customerId = await getOrCreateCustomer({
        patientId,
        email: email || '',
        name: name || ''
      });
      
      // Create portal session
      const stripe = require('../config/stripe.config').getStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url
      });
      
      res.json({
        ok: true,
        data: { url: session.url }
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /refund
 * Create a refund for a payment intent
 */
router.post('/refund',
  validateBody(createRefundSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { payment_intent_id, amount } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;
      
      const refund = await createRefund({ payment_intent_id, amount, idempotencyKey });
      
      res.json({
        ok: true,
        data: refund
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /refund-by-invoice
 * Create a refund by invoice ID
 */
router.post('/refund-by-invoice',
  validateBody(refundByInvoiceSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { invoice_id, amount } = req.body;
      
      const refund = await createRefundByInvoice({ invoice_id, amount });
      
      res.json({
        ok: true,
        data: refund
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /credit-note
 * Create a credit note against an invoice
 */
router.post('/credit-note',
  validateBody(createCreditNoteSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { invoice_id, amount, reason } = req.body;
      
      const creditNote = await createCreditNote({ invoice_id, amount, reason });
      
      res.json({
        ok: true,
        data: creditNote
      });
    } catch (error: any) {
      next(error);
    }
  }
);

// Apply Stripe error handler
router.use(stripeErrorHandler);

export default router;