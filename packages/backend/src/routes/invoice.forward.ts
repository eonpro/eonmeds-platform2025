import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Forward old invoice creation endpoint
 * This ensures backward compatibility with existing frontend
 * 
 * NOTE: Stripe integration is being rebuilt from scratch
 * This endpoint will be re-implemented in Phase 2
 */
router.post('/create', async (req: Request, res: Response) => {
  console.info('[Invoice Forward] Stripe integration temporarily disabled during rebuild');
  
  // Return a clear message that billing is being rebuilt
  res.status(503).json({
    ok: false,
    error: 'Payment processing is temporarily unavailable',
    message: 'The billing system is being upgraded. Please try again later.',
    maintenance: true
  });
});

export default router;