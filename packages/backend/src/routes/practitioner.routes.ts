import { Router, Request, Response } from 'express';

const router = Router();

// Stub routes - to be implemented
router.get('/', (_req: Request, res: Response): Response => {
  return res.json({ message: 'Practitioner routes not yet implemented' });
});

export default router; 