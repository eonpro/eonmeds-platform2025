import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Practitioner routes
router.get('/', authenticateToken, async (req, res) => {
  res.json({ message: 'Practitioner routes not implemented yet' });
});

export default router; 