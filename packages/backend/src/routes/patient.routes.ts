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
  try {
    const patientData = req.body;
    
    // Validate required fields
    if (!patientData.first_name || !patientData.last_name || !patientData.email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    // Generate patient ID
    const patientIdResult = await pool.query(
      "SELECT 'P' || LPAD((COALESCE(MAX(SUBSTRING(patient_id FROM 2)::INTEGER), 7000) + 1)::TEXT, 6, '0') as patient_id FROM patients WHERE patient_id ~ '^P[0-9]+$'"
    );
    const patient_id = patientIdResult.rows[0]?.patient_id || 'P007001';
    
    // Insert patient
    const result = await pool.query(
      `INSERT INTO patients (
        patient_id,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        form_type,
        form_version,
        submitted_at,
        status,
        consent_treatment,
        consent_telehealth,
        consent_date,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING id, patient_id, first_name, last_name, email`,
      [
        patient_id,
        patientData.first_name,
        patientData.last_name,
        patientData.email,
        patientData.phone || null,
        patientData.date_of_birth ? new Date(patientData.date_of_birth) : null,
        patientData.gender || null,
        patientData.form_type || 'manual_entry',
        '1.0',
        new Date(),
        patientData.status || 'qualified',
        patientData.consent_treatment || true,
        patientData.consent_telehealth || true,
        patientData.consent_date ? new Date(patientData.consent_date) : new Date()
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating patient:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'patients_email_key') {
      return res.status(409).json({ error: 'A patient with this email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
router.put('/:id', authenticateToken, async (req, res) => {
  res.json({ message: `Update patient ${req.params.id} - not implemented yet` });
});

// Delete patient
router.delete('/:id', authenticateToken, async (req, res) => {
  res.json({ message: `Delete patient ${req.params.id} - not implemented yet` });
});

// Send invite to patient
router.post('/:id/invite', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    
    // Get patient details
    const patientResult = await pool.query(
      'SELECT * FROM patients WHERE id = $1',
      [id]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = patientResult.rows[0];
    
    // TODO: Implement actual email sending
    // For now, just log and return success
    console.log(`Sending invite email to ${email || patient.email}`);
    
    // Update patient record to track invite
    await pool.query(
      'UPDATE patients SET updated_at = NOW() WHERE id = $1',
      [id]
    );
    
    res.json({ 
      success: true, 
      message: 'Invite sent successfully',
      email: email || patient.email
    });
  } catch (error) {
    console.error('Error sending invite:', error);
    res.status(500).json({ error: 'Failed to send invite' });
  }
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