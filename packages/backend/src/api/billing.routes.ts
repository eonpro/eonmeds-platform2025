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
} from '../lib/billingService';

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

// Apply auth middleware to all routes
router.use(checkJwt, checkBillingAccess);

/**
 * POST /customer/get-or-create
 * Get or create a Stripe customer for a patient
 */
router.post('/customer/get-or-create', async (req: Request, res: Response) => {
  try {
    const { patientId, email, name } = req.body;

    if (!patientId || !email || !name) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: patientId, email, name',
      });
    }

    const customerId = await getOrCreateCustomer({ patientId, email, name });

    res.json({
      ok: true,
      data: { customerId },
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * POST /invoice/create-and-pay
 * Create an invoice and optionally pay it
 */
router.post('/invoice/create-and-pay', async (req: Request, res: Response) => {
  try {
    const { customerId, patientId, items, email_invoice } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Missing or invalid items array',
      });
    }

    let finalCustomerId = customerId;

    // If only patientId provided, get or create customer first
    if (!customerId && patientId) {
      const { email, name } = req.body;
      if (!email || !name) {
        return res.status(400).json({
          ok: false,
          error: 'When using patientId, email and name are required',
        });
      }
      finalCustomerId = await getOrCreateCustomer({ patientId, email, name });
    }

    if (!finalCustomerId) {
      return res.status(400).json({
        ok: false,
        error: 'Either customerId or patientId must be provided',
      });
    }

    const result = await createInvoiceAndPay({
      customerId: finalCustomerId,
      items,
      email_invoice,
    });

    res.json({
      ok: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * POST /subscription/create
 * Create a subscription for a customer
 */
router.post('/subscription/create', async (req: Request, res: Response) => {
  try {
    const { customerId, patientId, priceId } = req.body;

    let finalCustomerId = customerId;

    // If only patientId provided, get or create customer first
    if (!customerId && patientId) {
      const { email, name } = req.body;
      if (!email || !name) {
        return res.status(400).json({
          ok: false,
          error: 'When using patientId, email and name are required',
        });
      }
      finalCustomerId = await getOrCreateCustomer({ patientId, email, name });
    }

    if (!finalCustomerId) {
      return res.status(400).json({
        ok: false,
        error: 'Either customerId or patientId must be provided',
      });
    }

    const subscription = await createSubscription({
      customerId: finalCustomerId,
      priceId,
    });

    res.json({
      ok: true,
      data: subscription,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * POST /subscription/:id/pause
 * Pause a subscription
 */
router.post('/subscription/:id/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { behavior } = req.body;

    const subscription = await pauseSubscription(id, behavior);

    res.json({
      ok: true,
      data: subscription,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * POST /subscription/:id/resume
 * Resume a paused subscription
 */
router.post('/subscription/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subscription = await resumeSubscription(id);

    res.json({
      ok: true,
      data: subscription,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * POST /subscription/:id/cancel
 * Cancel a subscription
 */
router.post('/subscription/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { at_period_end = true } = req.body;

    const subscription = await cancelSubscription(id, { at_period_end });

    res.json({
      ok: true,
      data: subscription,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * POST /subscription/:id/reactivate
 * Reactivate a subscription
 */
router.post('/subscription/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await reactivateSubscription(id);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.message,
      });
    }

    res.json({
      ok: true,
      data: result.subscription || { message: result.message },
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

export default router;
