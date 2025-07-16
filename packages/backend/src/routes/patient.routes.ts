import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { Request, Response } from 'express';
import { pool } from '../config/database';
import patientService from '../services/patient.service';

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

// Get patient intake form data
router.get('/:id/intake', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const intakeData = await patientService.getPatientIntakeData(id);
    
    if (!intakeData) {
      return res.status(404).json({ error: 'Intake data not found' });
    }
    
    res.json(intakeData);
  } catch (error) {
    console.error('Error fetching intake data:', error);
    res.status(500).json({ error: 'Failed to fetch intake data' });
  }
});

// Get raw webhook data for a patient
router.get('/:id/webhook-data', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get webhook data from the webhook_events table
    const result = await pool.query(`
      SELECT we.payload, we.created_at, we.webhook_id
      FROM webhook_events we
      JOIN patients p ON p.heyflow_submission_id = we.webhook_id
      WHERE p.id = $1
      ORDER BY we.created_at DESC
      LIMIT 1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No webhook data found' });
    }
    
    res.json(result.rows[0].payload);
  } catch (error) {
    console.error('Error fetching webhook data:', error);
    res.status(500).json({ error: 'Failed to fetch webhook data' });
  }
});

export default router; 