import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Practitioner routes
router.get('/', (_, res) => {
  res.json({ message: 'Practitioner routes not yet implemented' });
});

export default router; 