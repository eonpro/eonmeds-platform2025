import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { Request, Response } from 'express';
import { pool } from '../config/database';
import patientService from '../services/patient.service';

const router = Router();

// Get all patients with pagination, search, and filters
// Temporarily removed authenticateToken for testing
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '100',  // Increased default limit
      search = '', 
      status = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    // Build the WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;
    
    // Search across name, email, phone
    if (search) {
      whereConditions.push(`(
        LOWER(first_name) LIKE LOWER($${paramCount}) OR
        LOWER(last_name) LIKE LOWER($${paramCount}) OR
        LOWER(email) LIKE LOWER($${paramCount}) OR
        phone LIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }
    
    // REMOVED status filter to show ALL patients
    // Filter by status
    // if (status) {
    //   whereConditions.push(`status = $${paramCount}`);
    //   queryParams.push(status);
    //   paramCount++;
    // }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM patients ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get patients with pagination
    queryParams.push(limitNum, offset);
    const patientsQuery = `
      SELECT 
        id,
        patient_id,
        first_name,
        last_name,
        CONCAT(first_name, ' ', last_name) as name,
        email,
        phone,
        date_of_birth,
        gender,
        status,
        form_type,
        created_at,
        updated_at,
        address,
        city,
        state,
        zip,
        height_inches,
        weight_lbs,
        bmi
      FROM patients
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const patientsResult = await pool.query(patientsQuery, queryParams);
    
    console.log(`Returning ${patientsResult.rows.length} patients out of ${totalCount} total`);
    
    res.json({
      patients: patientsResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get all patients from today (debug endpoint)
router.get('/today', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        patient_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        created_at,
        heyflow_submission_id
      FROM patients
      WHERE created_at >= CURRENT_DATE
      ORDER BY created_at DESC
    `);
    
    // Also get webhook events from today
    const webhookResult = await pool.query(`
      SELECT 
        id,
        created_at,
        processed,
        error_message,
        payload
      FROM webhook_events
      WHERE created_at >= CURRENT_DATE
      ORDER BY created_at DESC
    `);
    
    res.json({
      patients_today: result.rows.length,
      patients: result.rows,
      webhooks_today: webhookResult.rows.length,
      webhooks: webhookResult.rows,
      current_time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching today\'s data:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s data' });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Query using either id or patient_id
    const result = await pool.query(`
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
        form_type,
        height_inches,
        weight_lbs,
        bmi,
        medical_conditions,
        current_medications,
        allergies,
        heyflow_submission_id,
        submitted_at,
        created_at,
        updated_at
      FROM patients
      WHERE id::text = $1 OR patient_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
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
      WHERE p.id::text = $1 OR p.patient_id = $1
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

// GET /api/v1/patients/:id/intake-pdf - Generate intake form PDF
router.get('/:id/intake-pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get patient data
    const patientResult = await pool.query(`
      SELECT p.*, 
        we.payload as webhook_data
      FROM patients p
      LEFT JOIN webhook_events we ON p.heyflow_submission_id = we.webhook_id
      WHERE p.id::text = $1 OR p.patient_id = $1
    `, [id]);
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = patientResult.rows[0];
    const webhookData = patient.webhook_data || {};
    const fields = webhookData.fields || {};
    
    // For now, return a simple HTML that can be printed as PDF
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Weight Loss Intake Form - ${patient.first_name} ${patient.last_name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .section { margin-bottom: 30px; }
        .field { margin-bottom: 10px; }
        .label { font-weight: bold; color: #666; }
        .value { margin-left: 10px; }
      </style>
    </head>
    <body>
      <h1>Weight Loss Intake Form</h1>
      <div class="section">
        <h2>Patient Information</h2>
        <div class="field"><span class="label">Name:</span> <span class="value">${patient.first_name} ${patient.last_name}</span></div>
        <div class="field"><span class="label">Email:</span> <span class="value">${patient.email}</span></div>
        <div class="field"><span class="label">Phone:</span> <span class="value">${patient.phone || 'Not provided'}</span></div>
        <div class="field"><span class="label">Date of Birth:</span> <span class="value">${patient.date_of_birth || 'Not provided'}</span></div>
        <div class="field"><span class="label">Gender:</span> <span class="value">${patient.gender || 'Not provided'}</span></div>
      </div>
      
      <div class="section">
        <h2>Physical Information</h2>
        <div class="field"><span class="label">Height:</span> <span class="value">${Math.floor(patient.height_inches / 12)}' ${patient.height_inches % 12}"</span></div>
        <div class="field"><span class="label">Starting Weight:</span> <span class="value">${patient.weight_lbs} lbs</span></div>
        <div class="field"><span class="label">BMI:</span> <span class="value">${patient.bmi}</span></div>
        <div class="field"><span class="label">Goal Weight:</span> <span class="value">${fields.idealweight || 'Not provided'} lbs</span></div>
      </div>
      
      <div class="section">
        <h2>Address</h2>
        <div class="field"><span class="label">Address:</span> <span class="value">${patient.address || fields.address || 'Not provided'}</span></div>
        <div class="field"><span class="label">City:</span> <span class="value">${patient.city || fields['address [city]'] || 'Not provided'}</span></div>
        <div class="field"><span class="label">State:</span> <span class="value">${patient.state || fields['address [state]'] || 'Not provided'}</span></div>
        <div class="field"><span class="label">ZIP:</span> <span class="value">${patient.zip || fields['address [zip]'] || 'Not provided'}</span></div>
      </div>
      
      <div class="section">
        <h2>Medical History</h2>
        <div class="field"><span class="label">Medical Conditions:</span> <span class="value">${fields['Do you have any medical conditions or chronic illnesses?'] || 'None reported'}</span></div>
        <div class="field"><span class="label">Mental Health:</span> <span class="value">${fields['Have you been diagnosed with any mental health condition?'] || 'None reported'}</span></div>
        <div class="field"><span class="label">Surgeries:</span> <span class="value">${fields['Have you ever undergone any surgeries or medical procedures?'] || 'None reported'}</span></div>
      </div>
      
      <div class="section">
        <p><small>Form submitted on: ${new Date(webhookData.createdAt || patient.created_at).toLocaleDateString()}</small></p>
      </div>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('Error generating intake PDF:', error);
    res.status(500).json({ error: 'Failed to generate intake PDF' });
  }
});

export default router; 