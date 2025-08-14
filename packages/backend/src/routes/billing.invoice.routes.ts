import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { expressjwt } from 'express-jwt';
import { expressJwtSecret } from 'jwks-rsa';
import { getStripeClient } from '../config/stripe.config';
import { pool } from '../config/database';
import Stripe from 'stripe';

const router = Router();

// Auth0 middleware configuration
const checkJwt = expressjwt({
  secret: expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});

// Middleware to check for admin or billing roles
const checkBillingAccess = (req: Request, res: Response, next: any) => {
  const user = (req as any).auth;
  const roles = user?.roles || user?.['https://api.eonmeds.com/roles'] || [];

  if (!roles.includes('admin') && !roles.includes('billing')) {
    return res.status(403).json({
      ok: false,
      error: 'Access denied. Requires admin or billing role.',
    });
  }

  next();
};

// Apply auth middleware to all routes except diagnostics
router.use((req, res, next) => {
  // Skip auth for diagnostics endpoint if it's a health check
  if (req.path === '/diagnostics/invoice-test' && req.method === 'GET') {
    // Still check auth but make it optional for now
    return checkJwt(req, res, (err: any) => {
      if (err) {
        // Auth failed but continue anyway for diagnostics
        (req as any).auth = null;
      }
      next();
    });
  }

  // For all other routes, require auth
  checkJwt(req, res, (err: any) => {
    if (err) return next(err);
    checkBillingAccess(req, res, next);
  });
});

// Validation schema for invoice creation
export const createInvoiceSchema = z.object({
  patientId: z.string().optional(),
  customerId: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    amount: z.number().int().positive('Amount must be positive'),
    currency: z.enum(['usd']).default('usd').optional(),
  })).min(1, 'At least one item is required'),
  email_invoice: z.boolean().optional().default(false),
}).refine(
  (data) => data.customerId || data.patientId || data.email,
  'Either customerId, patientId, or email must be provided'
);

/**
 * Resolve customer from various inputs
 */
async function resolveCustomer({
  customerId,
  patientId,
  email,
  name,
}: {
  customerId?: string;
  patientId?: string;
  email?: string;
  name?: string;
}): Promise<{ customerId: string; isNew: boolean }> {
  const stripe = getStripeClient();
  
  // If customerId provided, verify it exists
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId);
      return { customerId, isNew: false };
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        throw new Error(`Customer ${customerId} not found`);
      }
      throw error;
    }
  }

  // Try to find existing customer by patientId or email
  let stripeCustomerId: string | null = null;
  
  if (patientId) {
    const result = await pool.query(
      'SELECT stripe_customer_id FROM patients WHERE patient_id = $1',
      [patientId]
    );
    if (result.rows[0]?.stripe_customer_id) {
      stripeCustomerId = result.rows[0].stripe_customer_id;
    }
  }

  if (!stripeCustomerId && email) {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });
    if (customers.data.length > 0) {
      stripeCustomerId = customers.data[0].id;
    }
  }

  // Create new customer if not found
  if (!stripeCustomerId) {
    if (!email || !name) {
      throw new Error('Email and name are required to create a new customer');
    }

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        platform: 'EONPRO',
        patientId: patientId || '',
      },
    });

    stripeCustomerId = customer.id;

    // Update patient record if patientId provided
    if (patientId) {
      await pool.query(
        'UPDATE patients SET stripe_customer_id = $1 WHERE patient_id = $2',
        [stripeCustomerId, patientId]
      );
    }

    return { customerId: stripeCustomerId, isNew: true };
  }

  return { customerId: stripeCustomerId, isNew: false };
}

/**
 * Map Stripe errors to user-friendly responses
 */
function mapStripeError(error: any): { status: number; body: any } {
  // Log minimal info for debugging
  console.warn('Stripe error:', {
    code: error.code,
    type: error.type,
    requestId: error.requestId,
    statusCode: error.statusCode,
  });

  // Missing payment method
  if (
    error.code === 'missing_payment_method' ||
    error.code === 'card_error' ||
    (error.message && error.message.includes('no payment method')) ||
    (error.message && error.message.includes('no default payment method'))
  ) {
    return {
      status: 402,
      body: {
        ok: false,
        error: 'No payment method on file',
        need_payment_method: true,
        suggestion: 'Open billing portal or email invoice',
        requestId: error.requestId,
      },
    };
  }

  // Invalid parameters
  if (error.type === 'invalid_request_error') {
    if (error.code === 'parameter_invalid_integer') {
      return {
        status: 400,
        body: {
          ok: false,
          error: 'Invalid amount - must be a positive integer',
          requestId: error.requestId,
        },
      };
    }
    
    if (error.code === 'customer_missing' || error.code === 'resource_missing') {
      return {
        status: 404,
        body: {
          ok: false,
          error: 'Customer not found',
          requestId: error.requestId,
        },
      };
    }

    return {
      status: 400,
      body: {
        ok: false,
        error: error.message || 'Invalid request',
        requestId: error.requestId,
      },
    };
  }

  // Default to 502 for unexpected errors
  return {
    status: 502,
    body: {
      ok: false,
      error: 'Payment processor error',
      requestId: error.requestId,
    },
  };
}

/**
 * POST /api/v1/billing/invoice/create-and-pay
 * Create invoice and optionally pay or email it
 */
router.post('/invoice/create-and-pay', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = uuidv4();

  console.info(`[${requestId}] Invoice creation started`, {
    path: req.path,
    hasCustomerId: !!req.body.customerId,
    hasPatientId: !!req.body.patientId,
    hasEmail: !!req.body.email,
    itemCount: req.body.items?.length || 0,
  });

  try {
    // Validate request body
    const validationResult = createInvoiceSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.warn(`[${requestId}] Validation failed`, validationResult.error.issues);
      return res.status(400).json({
        ok: false,
        error: validationResult.error.issues[0].message,
        errors: validationResult.error.issues,
      });
    }

    const { patientId, customerId, email, name, items, email_invoice } = validationResult.data;

    // Resolve customer
    const { customerId: resolvedCustomerId, isNew } = await resolveCustomer({
      customerId,
      patientId,
      email,
      name,
    });

    console.info(`[${requestId}] Customer resolved`, {
      customerId: resolvedCustomerId,
      isNew,
      totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
    });

    const stripe = getStripeClient();
    const idempotencyKey = req.headers['idempotency-key'] as string || requestId;

    // Create invoice items
    for (const [index, item] of items.entries()) {
      await stripe.invoiceItems.create(
        {
          customer: resolvedCustomerId,
          description: item.description,
          amount: item.amount,
          currency: item.currency || 'usd',
          metadata: {
            platform: 'EONPRO',
          },
        },
        {
          idempotencyKey: `${idempotencyKey}-item-${index}`,
        }
      );
    }

    // Create invoice
    const invoice = await stripe.invoices.create(
      {
        customer: resolvedCustomerId,
        auto_advance: true,
        metadata: {
          platform: 'EONPRO',
          patientId: patientId || '',
        },
      },
      {
        idempotencyKey: `${idempotencyKey}-invoice`,
      }
    );

    // Finalize invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(
      invoice.id,
      {
        idempotencyKey: `${idempotencyKey}-finalize`,
      }
    );

    // Handle payment or email
    if (email_invoice) {
      // Send invoice via email
      await stripe.invoices.sendInvoice(finalizedInvoice.id);

      console.info(`[${requestId}] Invoice sent via email`, {
        invoiceId: finalizedInvoice.id,
        duration: Date.now() - startTime,
      });

      return res.json({
        ok: true,
        data: {
          invoiceId: finalizedInvoice.id,
          status: 'sent',
          hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
          invoice_pdf: finalizedInvoice.invoice_pdf,
        },
      });
    } else {
      // Try to pay immediately
      try {
        const paidInvoice = await stripe.invoices.pay(
          finalizedInvoice.id,
          {
            idempotencyKey: `${idempotencyKey}-pay`,
          }
        );

        console.info(`[${requestId}] Invoice paid successfully`, {
          invoiceId: paidInvoice.id,
          paymentIntentId: paidInvoice.payment_intent,
          duration: Date.now() - startTime,
        });

        return res.json({
          ok: true,
          data: {
            invoiceId: paidInvoice.id,
            status: 'paid',
            paymentIntentId: paidInvoice.payment_intent,
            hosted_invoice_url: paidInvoice.hosted_invoice_url,
            invoice_pdf: paidInvoice.invoice_pdf,
          },
        });
      } catch (payError: any) {
        // Check if it's a payment method issue
        if (
          payError.code === 'invoice_payment_intent_requires_action' ||
          payError.code === 'missing_payment_method' ||
          payError.message?.includes('no default payment method')
        ) {
          console.warn(`[${requestId}] Payment requires payment method`, {
            invoiceId: finalizedInvoice.id,
            stripeRequestId: payError.requestId,
            duration: Date.now() - startTime,
          });

          const errorResponse = mapStripeError(payError);
          return res.status(errorResponse.status).json({
            ...errorResponse.body,
            data: {
              invoiceId: finalizedInvoice.id,
              hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
            },
          });
        }

        throw payError;
      }
    }
  } catch (error: any) {
    console.error(`[${requestId}] Invoice creation failed`, {
      error: error.message,
      code: error.code,
      type: error.type,
      requestId: error.requestId,
      duration: Date.now() - startTime,
    });

    if (error.type === 'StripeError') {
      const errorResponse = mapStripeError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }

    return res.status(500).json({
      ok: false,
      error: 'Failed to create invoice',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/billing/diagnostics/invoice-test
 * Test invoice creation (admin/billing only)
 */
router.get('/diagnostics/invoice-test', async (req: Request, res: Response) => {
  // Check auth
  const user = (req as any).auth;
  const roles = user?.roles || user?.['https://api.eonmeds.com/roles'] || [];

  if (!roles.includes('admin') && !roles.includes('billing')) {
    return res.status(403).json({
      ok: false,
      error: 'Access denied. Requires admin or billing role.',
    });
  }

  const email = req.query.email as string;
  const amount = parseInt(req.query.amount as string) || 100;

  if (!email) {
    return res.status(400).json({
      ok: false,
      error: 'Email parameter is required',
    });
  }

  try {
    const stripe = getStripeClient();
    const idempotencyKey = uuidv4();

    // Resolve or create customer
    const { customerId } = await resolveCustomer({
      email,
      name: 'Test Customer',
    });

    // Create invoice item
    await stripe.invoiceItems.create(
      {
        customer: customerId,
        description: 'Test Invoice Item',
        amount,
        currency: 'usd',
        metadata: {
          platform: 'EONPRO',
          test: 'true',
        },
      },
      {
        idempotencyKey: `${idempotencyKey}-item`,
      }
    );

    // Create draft invoice
    const invoice = await stripe.invoices.create(
      {
        customer: customerId,
        auto_advance: false, // Keep as draft
        metadata: {
          platform: 'EONPRO',
          test: 'true',
        },
      },
      {
        idempotencyKey: `${idempotencyKey}-invoice`,
      }
    );

    return res.json({
      ok: true,
      data: {
        invoiceId: invoice.id,
        status: 'draft',
        customerId,
        amount,
        hosted_invoice_url: invoice.hosted_invoice_url,
      },
    });
  } catch (error: any) {
    console.error('Diagnostics invoice test failed:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to create test invoice',
      message: error.message,
    });
  }
});

export default router;