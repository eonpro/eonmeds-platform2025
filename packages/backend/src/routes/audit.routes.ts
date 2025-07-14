import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Audit routes
router.get('/', authenticateToken, async (req, res) => {
  res.json({ message: 'Audit routes not implemented yet' });
});

export default router; 