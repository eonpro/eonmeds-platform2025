import { z } from 'zod';

// Common schemas
export const patientIdSchema = z.string().regex(/^P\d+$/, 'Invalid patient ID format');
export const stripeCustomerIdSchema = z
  .string()
  .regex(/^cus_[a-zA-Z0-9]+$/, 'Invalid Stripe customer ID');
export const stripePriceIdSchema = z
  .string()
  .regex(/^price_[a-zA-Z0-9]+$/, 'Invalid Stripe price ID');
export const stripeSubscriptionIdSchema = z
  .string()
  .regex(/^sub_[a-zA-Z0-9]+$/, 'Invalid Stripe subscription ID');
export const stripeInvoiceIdSchema = z
  .string()
  .regex(/^in_[a-zA-Z0-9]+$/, 'Invalid Stripe invoice ID');
export const stripePaymentIntentIdSchema = z
  .string()
  .regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid Stripe payment intent ID');
export const stripePaymentMethodIdSchema = z
  .string()
  .regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid Stripe payment method ID');

// Address schema
export const addressSchema = z
  .object({
    country: z.string().length(2, 'Country must be 2-letter ISO code').optional(),
    state: z.string().min(2).max(50).optional(),
    postal_code: z.string().min(3).max(20).optional(),
    city: z.string().min(1).max(100).optional(),
    line1: z.string().min(1).max(200).optional(),
    line2: z.string().max(200).optional(),
  })
  .optional();

// Customer schemas
export const getOrCreateCustomerSchema = z.object({
  patientId: patientIdSchema,
  email: z.string().email('Invalid email address'),
  name: z.string().min(1).max(200),
  address: addressSchema,
});

// Setup intent schema
export const createSetupIntentSchema = z.object({
  patientId: patientIdSchema,
  email: z.string().email('Invalid email address'),
  name: z.string().min(1).max(200),
  address: addressSchema,
});

// Payment method schemas
export const attachPaymentMethodSchema = z.object({
  patientId: patientIdSchema,
  payment_method_id: stripePaymentMethodIdSchema,
  email: z.string().email().optional(),
  name: z.string().optional(),
});

// Invoice schemas
export const invoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().int().positive('Amount must be positive').max(99999999, 'Amount too large'),
  currency: z.string().length(3).toLowerCase().default('usd'),
});

export const createInvoiceAndPaySchema = z
  .object({
    customerId: stripeCustomerIdSchema.optional(),
    patientId: patientIdSchema.optional(),
    items: z.array(invoiceItemSchema).min(1, 'At least one item required'),
    email_invoice: z.boolean().optional().default(false),
    email: z.string().email().optional(),
    name: z.string().optional(),
  })
  .refine(
    (data) => data.customerId || data.patientId,
    'Either customerId or patientId must be provided'
  );

// Subscription schemas
export const createSubscriptionSchema = z
  .object({
    customerId: stripeCustomerIdSchema.optional(),
    patientId: patientIdSchema.optional(),
    priceId: stripePriceIdSchema.optional(),
    email: z.string().email().optional(),
    name: z.string().optional(),
  })
  .refine(
    (data) => data.customerId || data.patientId,
    'Either customerId or patientId must be provided'
  );

export const pauseSubscriptionSchema = z.object({
  behavior: z.enum(['keep_as_draft', 'mark_uncollectible', 'void']).optional(),
});

export const cancelSubscriptionSchema = z.object({
  at_period_end: z.boolean().optional().default(true),
});

export const updateSubscriptionPriceSchema = z.object({
  id: stripeSubscriptionIdSchema,
  priceId: stripePriceIdSchema,
  proration_behavior: z.enum(['create_prorations', 'none', 'always_invoice']).optional(),
});

export const applyCouponSchema = z
  .object({
    id: stripeSubscriptionIdSchema,
    coupon: z.string().optional(),
    promotion_code: z.string().optional(),
  })
  .refine(
    (data) => data.coupon || data.promotion_code,
    'Either coupon or promotion_code must be provided'
  );

export const subscriptionTrialSchema = z.object({
  id: stripeSubscriptionIdSchema,
  trial_end: z.union([
    z.literal('now'),
    z.number().int().positive('Trial end must be a valid UNIX timestamp'),
  ]),
});

// Portal session schema
export const portalSessionSchema = z.object({
  patientId: patientIdSchema,
  return_url: z.string().url('Invalid return URL'),
  email: z.string().email().optional(),
  name: z.string().optional(),
});

// Refund schemas
export const createRefundSchema = z.object({
  payment_intent_id: stripePaymentIntentIdSchema,
  amount: z.number().int().positive().optional(),
});

export const refundByInvoiceSchema = z.object({
  invoice_id: stripeInvoiceIdSchema,
  amount: z.number().int().positive().optional(),
});

export const createCreditNoteSchema = z.object({
  invoice_id: stripeInvoiceIdSchema,
  amount: z.number().int().positive('Amount must be positive'),
  reason: z.string().max(500).optional(),
});

// Report schemas
export const revenueReportSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

// Validation middleware
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

// Stripe error handler middleware
export function stripeErrorHandler(err: any, req: any, res: any, next: any) {
  // Don't leak Stripe secrets or sensitive data
  if (err.type === 'StripeCardError') {
    return res.status(400).json({
      ok: false,
      error: 'Card error',
      message: err.message,
    });
  } else if (err.type === 'StripeRateLimitError') {
    return res.status(429).json({
      ok: false,
      error: 'Too many requests',
    });
  } else if (err.type === 'StripeInvalidRequestError') {
    return res.status(400).json({
      ok: false,
      error: 'Invalid request',
      message: err.message.replace(/sk_[a-zA-Z0-9_]+/g, '[REDACTED]'), // Remove any API keys
    });
  } else if (err.type === 'StripeAPIError') {
    return res.status(502).json({
      ok: false,
      error: 'Payment provider error',
    });
  } else if (err.type === 'StripeConnectionError') {
    return res.status(503).json({
      ok: false,
      error: 'Network error',
    });
  } else if (err.type === 'StripeAuthenticationError') {
    console.error('Stripe authentication error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Configuration error',
    });
  }

  // Pass to next error handler if not Stripe error
  next(err);
}
