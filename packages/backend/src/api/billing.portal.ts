import { Router, Request, Response } from 'express';
import { expressjwt } from 'express-jwt';
import { expressJwtSecret } from 'jwks-rsa';
import { getOrCreateCustomer } from '../lib/billingService';
import { getStripeClient } from '../config/stripe.config';

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

/**
 * POST /portal-session
 * Create a Stripe Customer Portal session
 */
router.post(
  '/portal-session',
  checkJwt,
  checkBillingAccess,
  async (req: Request, res: Response) => {
    try {
      const { patientId, return_url } = req.body;

      if (!patientId || !return_url) {
        return res.status(400).json({
          ok: false,
          error: 'Missing required fields: patientId, return_url',
        });
      }

      // Get or create customer
      const customerId = await getOrCreateCustomer({
        patientId,
        email: req.body.email || '',
        name: req.body.name || '',
      });

      // Create portal session
      const stripe = getStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url,
      });

      res.json({
        ok: true,
        data: { url: session.url },
      });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }
);

export default router;
