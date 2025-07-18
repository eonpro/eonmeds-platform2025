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
        address_house,
        address_street,
        apartment_number,
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
        address,
        address_house,
        address_street,
        apartment_number,
        city,
        state,
        zip,
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
router.post('/', async (req, res) => {
  try {
    const patientData = req.body;
    
    // Validate required fields
    if (!patientData.first_name || !patientData.last_name || !patientData.email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    // Generate patient ID
    const patientIdResult = await pool.query(
      "SELECT 'P' || LPAD((COALESCE(MAX(SUBSTRING(patient_id FROM 2)::INTEGER), 0) + 1)::TEXT, 4, '0') as patient_id FROM patients WHERE patient_id ~ '^P[0-9]+$'"
    );
    const patient_id = patientIdResult.rows[0]?.patient_id || 'P0001';
    
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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    // List of allowed fields to update
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 
      'date_of_birth', 'gender', 'height_inches', 'weight_lbs',
      'address', 'address_house', 'address_street', 'apartment_number',
      'city', 'state', 'zip', 'status'
    ];
    
    // Build update fields dynamically
    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field)) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(updateData[field]);
        paramCount++;
      }
    }
    
    // Always update the updated_at field
    updateFields.push(`updated_at = NOW()`);
    
    if (updateFields.length === 1) { // Only updated_at
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Add the patient ID as the last parameter
    values.push(id);
    
    const query = `
      UPDATE patients 
      SET ${updateFields.join(', ')}
      WHERE id::text = $${paramCount} OR patient_id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Calculate BMI if height and weight are provided
    const patient = result.rows[0];
    if (patient.height_inches && patient.weight_lbs) {
      const bmi = (parseFloat(patient.weight_lbs) / (patient.height_inches * patient.height_inches)) * 703;
      await pool.query(
        'UPDATE patients SET bmi = $1 WHERE id = $2',
        [bmi.toFixed(2), patient.id]
      );
      patient.bmi = bmi.toFixed(2);
    }
    
    res.json(patient);
  } catch (error) {
    console.error('Error updating patient:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'patients_email_key') {
      return res.status(409).json({ error: 'A patient with this email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update patient' });
  }
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
      LEFT JOIN webhook_events we ON (
        p.heyflow_submission_id = we.webhook_id 
        OR p.heyflow_submission_id = we.payload->>'id'
        OR p.email = we.payload->'fields'->>'email'
      )
      WHERE p.id::text = $1 OR p.patient_id = $1
      LIMIT 1
    `, [id]);
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = patientResult.rows[0];
    const webhookData = patient.webhook_data || {};
    const fields = webhookData.fields || {};
    
    // Helper function to format field names
    const formatFieldName = (fieldName) => {
      return fieldName
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\?/g, '')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };
    
    // Helper function to safely get field value
    const getFieldValue = (value) => {
      if (!value || value === '') return 'Not provided';
      if (value === '✔') return 'Yes';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return value;
    };
    
    // Generate comprehensive HTML
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Weight Loss Intake Form - ${patient.first_name} ${patient.last_name}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          line-height: 1.6;
          color: #333;
        }
        h1 { 
          color: #2c3e50;
          border-bottom: 3px solid #3498db;
          padding-bottom: 10px;
        }
        h2 { 
          color: #34495e;
          margin-top: 30px;
          border-bottom: 1px solid #ecf0f1;
          padding-bottom: 5px;
        }
        .section { 
          margin-bottom: 30px;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
        }
        .field { 
          margin-bottom: 12px;
          display: flex;
          flex-wrap: wrap;
        }
        .label { 
          font-weight: bold; 
          color: #555;
          min-width: 200px;
          margin-right: 10px;
        }
        .value { 
          color: #222;
          flex: 1;
        }
        .header-info {
          background-color: #3498db;
          color: white;
          padding: 20px;
          margin: -40px -40px 30px -40px;
          text-align: center;
        }
        .header-info h1 {
          color: white;
          border: none;
          margin: 0;
        }
        .timestamp {
          text-align: center;
          color: #7f8c8d;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ecf0f1;
        }
      </style>
    </head>
    <body>
      <div class="header-info">
        <h1>Weight Loss Intake Form</h1>
        <p>Patient ID: ${patient.patient_id}</p>
      </div>
      
      <div class="section">
        <h2>Patient Information</h2>
        <div class="field"><span class="label">Name:</span> <span class="value">${patient.first_name} ${patient.last_name}</span></div>
        <div class="field"><span class="label">Email:</span> <span class="value">${patient.email}</span></div>
        <div class="field"><span class="label">Phone:</span> <span class="value">${patient.phone || 'Not provided'}</span></div>
        <div class="field"><span class="label">Date of Birth:</span> <span class="value">${patient.date_of_birth || fields.dob || 'Not provided'}</span></div>
        <div class="field"><span class="label">Gender:</span> <span class="value">${patient.gender || 'Not provided'}</span></div>
        <div class="field"><span class="label">18+ Confirmation:</span> <span class="value">${getFieldValue(fields['18+ Disclosure : By submitting this form. I certify that I am over 18 years of age and that the date of birth provided in this form is legitimate and it belongs to me.'])}</span></div>
      </div>
      
      <div class="section">
        <h2>Physical Information</h2>
        <div class="field"><span class="label">Height:</span> <span class="value">${Math.floor(patient.height_inches / 12)}' ${patient.height_inches % 12}"</span></div>
        <div class="field"><span class="label">Starting Weight:</span> <span class="value">${patient.weight_lbs} lbs</span></div>
        <div class="field"><span class="label">BMI:</span> <span class="value">${patient.bmi}</span></div>
        <div class="field"><span class="label">Goal Weight:</span> <span class="value">${fields.idealweight || 'Not provided'} lbs</span></div>
      </div>
      
      <div class="section">
        <h2>Contact Information</h2>
        <div class="field"><span class="label">Address:</span> <span class="value">${patient.address || fields.address || 'Not provided'}</span></div>
        <div class="field"><span class="label">City:</span> <span class="value">${patient.city || fields['address [city]'] || 'Not provided'}</span></div>
        <div class="field"><span class="label">State:</span> <span class="value">${patient.state || fields['address [state]'] || 'Not provided'}</span></div>
        <div class="field"><span class="label">ZIP:</span> <span class="value">${patient.zip || fields['address [zip]'] || 'Not provided'}</span></div>
        <div class="field"><span class="label">Latitude:</span> <span class="value">${fields['address [latitude]'] || 'Not provided'}</span></div>
        <div class="field"><span class="label">Longitude:</span> <span class="value">${fields['address [longitude]'] || 'Not provided'}</span></div>
      </div>
      
      <div class="section">
        <h2>Medical History Questions</h2>
        <div class="field"><span class="label">Blood Pressure:</span> <span class="value">${getFieldValue(fields['Blood Pressure'])}</span></div>
        <div class="field"><span class="label">Medical Conditions:</span> <span class="value">${getFieldValue(fields['Do you have any medical conditions or chronic illnesses?'])}</span></div>
        <div class="field"><span class="label">Mental Health Conditions:</span> <span class="value">${getFieldValue(fields['Have you been diagnosed with any mental health condition?'])}</span></div>
        <div class="field"><span class="label">Surgeries/Procedures:</span> <span class="value">${getFieldValue(fields['Have you ever undergone any surgeries or medical procedures?'])}</span></div>
        <div class="field"><span class="label">Type 2 Diabetes:</span> <span class="value">${getFieldValue(fields['Do you have a personal history of type 2 diabetes?'])}</span></div>
        <div class="field"><span class="label">Thyroid Cancer:</span> <span class="value">${getFieldValue(fields['Do you have a personal history of medullary thyroid cancer?'])}</span></div>
        <div class="field"><span class="label">Multiple Endocrine Neoplasia:</span> <span class="value">${getFieldValue(fields['Do you have a personal history of multiple endocrine neoplasia type-2?'])}</span></div>
        <div class="field"><span class="label">Gastroparesis:</span> <span class="value">${getFieldValue(fields['Do you have a personal history of gastroparesis (delayed stomach emptying)?'])}</span></div>
        <div class="field"><span class="label">Pregnant/Breastfeeding:</span> <span class="value">${getFieldValue(fields['Are you pregnant or breast feeding?'])}</span></div>
      </div>
      
      <div class="section">
        <h2>Chronic Conditions</h2>
        <div class="field"><span class="label">Diagnosed Conditions:</span> <span class="value">${getFieldValue(fields['Have you been diagnosed with any of the following conditions?'])}</span></div>
        <div class="field"><span class="label">Chronic Diseases:</span> <span class="value">${getFieldValue(fields['Chronic Diseases: Do you have a history of any of the following?'])}</span></div>
        <div class="field"><span class="label">Family History:</span> <span class="value">${getFieldValue(fields['Have you or any of your family members ever been diagnosed with any of the following conditions?'])}</span></div>
      </div>
      
      <div class="section">
        <h2>Lifestyle & Activity</h2>
        <div class="field"><span class="label">Daily Physical Activity:</span> <span class="value">${getFieldValue(fields['What is your usual level of daily physical activity?'])}</span></div>
        <div class="field"><span class="label">How Life Would Change:</span> <span class="value">${getFieldValue(fields['How would your life change by losing weight?'])}</span></div>
      </div>
      
      <div class="section">
        <h2>Medication History</h2>
        <div class="field"><span class="label">GLP-1 Medication History:</span> <span class="value">${getFieldValue(fields['Are you currently taking, or have you ever taken, a GLP-1 medication?'])}</span></div>
        <div class="field"><span class="label">Side Effects:</span> <span class="value">${getFieldValue(fields['Do you usually present side effects when starting a new medication?'])}</span></div>
        <div class="field"><span class="label">Personalized Treatment Interest:</span> <span class="value">${getFieldValue(fields['Would you be interested in your provider considering a personalized treatment plan to help you manage these side effects?'])}</span></div>
      </div>
      
      <div class="section">
        <h2>Marketing & Consent</h2>
        <div class="field"><span class="label">How did you hear about us?:</span> <span class="value">${getFieldValue(fields['How did you hear about us?'])}</span></div>
        <div class="field"><span class="label">State of Residence:</span> <span class="value">${getFieldValue(fields['Select the state you live in'])}</span></div>
        <div class="field"><span class="label">Marketing Consent:</span> <span class="value">${getFieldValue(fields['Marketing Consent'])}</span></div>
        <div class="field"><span class="label">Terms Agreement:</span> <span class="value">${getFieldValue(fields['By clicking this box, I acknowledge that I have read, understood, and agree to the Terms of Use, and I acknowledge the Privacy Policy, Informed Telemedicine Consent, and the Cancellation Policy. If you live in Florida, you also accept the Florida Weight Loss Consumer Bill of Rights and the Florida Consent.'])}</span></div>
      </div>
      
      <div class="section">
        <h2>Marketing Attribution</h2>
        <div class="field"><span class="label">UTM Source:</span> <span class="value">${fields.utm_source || 'Not provided'}</span></div>
        <div class="field"><span class="label">UTM Medium:</span> <span class="value">${fields.utm_medium || 'Not provided'}</span></div>
        <div class="field"><span class="label">UTM Campaign:</span> <span class="value">${fields.utm_campaign || 'Not provided'}</span></div>
        <div class="field"><span class="label">UTM Content:</span> <span class="value">${fields.utm_content || 'Not provided'}</span></div>
        <div class="field"><span class="label">UTM Term:</span> <span class="value">${fields.utm_term || 'Not provided'}</span></div>
        <div class="field"><span class="label">UTM ID:</span> <span class="value">${fields.utm_id || 'Not provided'}</span></div>
      </div>
      
      <div class="section">
        <h2>All Form Fields</h2>
        ${Object.entries(fields).filter(([key]) => !key.startsWith('utm_') && !key.startsWith('address')).map(([key, value]) => `
          <div class="field">
            <span class="label">${formatFieldName(key)}:</span> 
            <span class="value">${getFieldValue(value)}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="timestamp">
        <p>Form submitted on: ${new Date(webhookData.createdAt || patient.created_at).toLocaleDateString()} at ${new Date(webhookData.createdAt || patient.created_at).toLocaleTimeString()}</p>
        <p>Form ID: ${webhookData.id || 'N/A'} | Flow ID: ${webhookData.flowID || 'N/A'}</p>
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

// Delete a patient
// Temporarily removed authenticateToken for testing
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    // Start transaction
    await client.query('BEGIN');
    
    // First check if patient exists
    const checkResult = await client.query(
      'SELECT id, patient_id, first_name, last_name FROM patients WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = checkResult.rows[0];
    
    // Delete related records first (if any exist)
    // Delete from weight_loss_intake if exists
    await client.query('DELETE FROM weight_loss_intake WHERE patient_id = $1', [id]);
    
    // Delete from patients table
    const deleteResult = await client.query(
      'DELETE FROM patients WHERE id = $1 RETURNING id',
      [id]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Deleted patient ${patient.patient_id}: ${patient.first_name} ${patient.last_name}`);
    
    res.json({ 
      success: true, 
      message: 'Patient deleted successfully',
      deletedPatient: {
        id: patient.id,
        patient_id: patient.patient_id,
        name: `${patient.first_name} ${patient.last_name}`
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  } finally {
    client.release();
  }
});

// Debug endpoint to check patient data
router.get('/:id/debug', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all columns for this patient
    const result = await pool.query(`
      SELECT * FROM patients
      WHERE id::text = $1 OR patient_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = result.rows[0];
    
    // Check which address fields have values
    const addressInfo = {
      patient_id: patient.patient_id,
      legacy_address: patient.address,
      new_fields: {
        address_house: patient.address_house,
        address_street: patient.address_street,
        apartment_number: patient.apartment_number
      },
      location: {
        city: patient.city,
        state: patient.state,
        zip: patient.zip
      },
      has_new_format: !!(patient.address_house || patient.address_street || patient.apartment_number)
    };
    
    res.json(addressInfo);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 