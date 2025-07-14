import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get all patients
router.get('/', authenticateToken, async (req, res) => {
  res.json({ message: 'Get all patients - not implemented yet' });
});

// Get patient by ID
router.get('/:id', authenticateToken, async (req, res) => {
  res.json({ message: `Get patient ${req.params.id} - not implemented yet` });
});

// Create patient
router.post('/', authenticateToken, async (req, res) => {
  res.json({ message: 'Create patient - not implemented yet' });
});

// Update patient
router.put('/:id', authenticateToken, async (req, res) => {
  res.json({ message: `Update patient ${req.params.id} - not implemented yet` });
});

// Delete patient
router.delete('/:id', authenticateToken, async (req, res) => {
  res.json({ message: `Delete patient ${req.params.id} - not implemented yet` });
});

export default router; 