import { Router, Request, Response } from 'express';
import { PatientService } from '../services/patient.service';
import { checkJwt, checkRole } from '../middleware/auth0';
import { pool } from '../config/database';
// import { PDFService } from '../services/pdf.service';

const router = Router();

// Test endpoint to check database connectivity
router.get('/test-db', async (req: Request, res: Response) => {
  try {
    // Use direct query instead of pool.connect()
    const result = await pool.query('SELECT COUNT(*) as count FROM patients');
    res.json({ 
      success: true, 
      patientCount: result.rows[0].count,
      message: 'Database connection working'
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error
    });
  }
});

// Get all patients (list view)
// TEMPORARY: Removing auth for testing
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = '100', offset = '0', search, status } = req.query;
    
    const result = await PatientService.getPatientList(
      parseInt(limit as string),
      parseInt(offset as string),
      search as string,
      status as string
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Create new patient
// TEMPORARY: Removing auth for testing
router.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const patientData = req.body;
    
    // Validate required fields
    if (!patientData.first_name || !patientData.last_name || !patientData.email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    await client.query('BEGIN');
    
    // Generate patient ID using the same logic as webhook
    const patientIdResult = await client.query(
      "SELECT 'P' || LPAD((COALESCE(MAX(SUBSTRING(patient_id FROM 2)::INTEGER), 7000) + 1)::TEXT, 6, '0') as patient_id FROM patients WHERE patient_id ~ '^P[0-9]+$'"
    );
    const patient_id = patientIdResult.rows[0]?.patient_id || 'P007001';
    
    // Insert patient
    const result = await client.query(
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
      RETURNING id, patient_id, first_name, last_name, email, created_at`,
      [
        patient_id,
        patientData.first_name,
        patientData.last_name,
        patientData.email,
        patientData.phone || null,
        patientData.date_of_birth ? new Date(patientData.date_of_birth) : null,
        patientData.gender || 'male',
        'manual_entry',
        '1.0',
        new Date(),
        'qualified',
        true,
        true,
        new Date()
      ]
    );
    
    await client.query('COMMIT');
    
    console.log('Successfully created patient:', result.rows[0]);
    res.status(201).json(result.rows[0]);
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating patient:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'patients_email_key') {
      return res.status(409).json({ error: 'A patient with this email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create patient', details: error.message });
  } finally {
    client.release();
  }
});

// Simple test endpoint for patient detail
router.get('/test/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id,
        patient_id,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        status,
        created_at,
        updated_at as last_activity,
        form_type,
        height_inches,
        weight_lbs,
        bmi,
        medical_conditions,
        current_medications,
        allergies
      FROM patients
      WHERE patient_id = $1 OR id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch patient', details: error.message });
  }
});

// Get patient by ID
// TEMPORARY: Removing auth for testing
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Direct query instead of using PatientService
    const query = `
      SELECT 
        id,
        patient_id,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        status,
        created_at,
        updated_at as last_activity,
        form_type,
        height_inches,
        weight_lbs,
        bmi,
        medical_conditions,
        current_medications,
        allergies
      FROM patients
      WHERE patient_id = $1 OR id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Get patient intake form as PDF
// TEMPORARILY DISABLED - PDF generation
/*
router.get('/:id/intake-pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get patient data
    const patient = await PatientService.getPatientById(id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Get webhook data
    const webhookResult = await pool.query(
      `SELECT we.payload 
       FROM webhook_events we
       JOIN patients p ON p.heyflow_submission_id = we.webhook_id
       WHERE p.id = $1
       ORDER BY we.created_at DESC
       LIMIT 1`,
      [id]
    );
    
    const webhookData = webhookResult.rows[0]?.payload || {};
    
    // Generate PDF
    const pdfBuffer = await PDFService.generateIntakeFormPDF(patient, webhookData);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${patient.patient_id}_intake_form.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});
*/

// Temporary simple PDF endpoint
router.get('/:id/intake-pdf', async (req: Request, res: Response) => {
  res.status(501).json({ error: 'PDF generation temporarily disabled' });
});

// Get patient intake data (raw webhook data)
router.get('/:id/intake', checkJwt, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const intakeData = await PatientService.getPatientIntakeData(id);
    
    if (!intakeData) {
      return res.status(404).json({ error: 'Intake form not found' });
    }
    
    res.json(intakeData);
  } catch (error) {
    console.error('Error fetching intake data:', error);
    res.status(500).json({ error: 'Failed to fetch intake data' });
  }
});

// Update patient status
router.patch('/:id/status', 
  checkJwt, 
  checkRole(['provider', 'admin', 'superadmin']), 
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const reviewedBy = (req as any).auth?.sub; // Auth0 user ID
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const success = await PatientService.updatePatientStatus(id, status, reviewedBy);
      
      if (!success) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating patient status:', error);
      res.status(500).json({ error: 'Failed to update patient status' });
    }
  }
);

export default router; 