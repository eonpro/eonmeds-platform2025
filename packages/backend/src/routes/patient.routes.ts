import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../config/database';
import patientService from '../services/patient.service';
import { PDFService } from '../services/pdf.service';

const router = Router();

// Get all patients with pagination, search, and filters
// Temporarily removed authenticateToken for testing
router.get('/', async (req: Request, res: Response): Promise<Response> => {
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
    
    // Filter by status
    if (status) {
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }
    
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
        bmi,
        membership_hashtags
      FROM patients
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const patientsResult = await pool.query(patientsQuery, queryParams);
    
    console.log(`Returning ${patientsResult.rows.length} patients out of ${totalCount} total`);
    
    return res.json({
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
    return res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get all patients from today (debug endpoint)
router.get('/today', async (_req: Request, res: Response): Promise<Response> => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.patient_id, 
        p.first_name, 
        p.last_name, 
        p.email, 
        p.status,
        p.membership_hashtags,
        p.heyflow_submission_id,
        p.created_at,
        we.created_at as webhook_received_at,
        we.payload
      FROM patients p
      LEFT JOIN webhook_events we ON we.webhook_id = p.heyflow_submission_id
      WHERE DATE(p.created_at) = CURRENT_DATE
      ORDER BY p.created_at DESC
    `);

    const summary: {
      total_patients_today: number;
      by_status: Record<string, number>;
      by_hashtag: Record<string, number>;
      patients: any[];
    } = {
      total_patients_today: result.rows.length,
      by_status: {},
      by_hashtag: {},
      patients: result.rows
    };

    // Group by status
    result.rows.forEach((patient: any) => {
      summary.by_status[patient.status] = (summary.by_status[patient.status] || 0) + 1;
      
      // Count hashtags
      if (patient.membership_hashtags) {
        patient.membership_hashtags.forEach((tag: string) => {
          summary.by_hashtag[tag] = (summary.by_hashtag[tag] || 0) + 1;
        });
      }
    });

    return res.json(summary);
  } catch (error) {
    console.error('Error checking patient debug data:', error);
    return res.status(500).json({ 
      error: 'Failed to check patient data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get patient by ID
router.get('/:id', async (req: Request, res: Response): Promise<Response> => {
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
        updated_at,
        membership_hashtags,
        additional_info
      FROM patients
      WHERE id::text = $1 OR patient_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Create patient
router.post('/', async (req: Request, res: Response): Promise<Response> => {
  try {
    const patientData = req.body;
    
    // Validate required fields
    if (!patientData.first_name || !patientData.last_name || !patientData.email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    // Generate patient ID using database function
    const patientIdResult = await pool.query("SELECT generate_patient_id() as patient_id");
    const patient_id = patientIdResult.rows[0].patient_id;
    
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
    
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating patient:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'patients_email_key') {
      return res.status(409).json({ error: 'A patient with this email already exists' });
    }
    
    return res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
router.put('/:id', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    // Only allow updating certain fields
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender',
      'height_inches', 'weight_lbs',
      'address', 'address_house', 'address_street', 'apartment_number',
      'city', 'state', 'zip', 'status', 'membership_hashtags', 'additional_info'
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
    
    return res.json(patient);
  } catch (error) {
    console.error('Error updating patient:', error);
    
    // Handle unique constraint violation
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      const pgError = error as any;
      if (pgError.constraint === 'patients_email_key') {
        return res.status(409).json({ error: 'A patient with this email already exists' });
      }
    }
    
    return res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Update patient status route
router.put('/:id/status', authenticateToken, async (req: Request, res: Response): Promise<Response> => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['lead', 'qualified', 'needs_follow_up', 'disqualified', 'active', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Start transaction
    await client.query('BEGIN');
    
    // Update patient status
    const result = await client.query(
      'UPDATE patients SET status = $1, updated_at = NOW() WHERE patient_id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    return res.json(result.rows[0]);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('Error updating patient status:', error);
    return res.status(500).json({ 
      error: 'Failed to update patient status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
});

// Send invite to patient
router.post('/:id/invite', authenticateToken, async (req: Request, res: Response): Promise<Response> => {
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
    
    return res.json({ 
      success: true, 
      message: 'Invite sent successfully',
      email: email || patient.email
    });
  } catch (error) {
    console.error('Error sending invite:', error);
    return res.status(500).json({ error: 'Failed to send invite' });
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
    
    return res.json(intakeData);
  } catch (error) {
    console.error('Error fetching intake data:', error);
    return res.status(500).json({ error: 'Failed to fetch intake data' });
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
    
    return res.json(result.rows[0].payload);
  } catch (error) {
    console.error('Error fetching webhook data:', error);
    return res.status(500).json({ error: 'Failed to fetch webhook data' });
  }
});

// GET /api/v1/patients/:id/intake-pdf - Generate intake form PDF
router.get('/:id/intake-pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Get patient data with webhook data
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
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    
    const patient = patientResult.rows[0];
    const webhookPayload = patient.webhook_data || {};
    
    // Extract fields from webhook data
    const fields = webhookPayload.fields || {};
    
    // Map webhook fields to the format expected by PDFService
    const webhookData = {
      // Address fields
      street: fields.street || fields.address || patient.address || '',
      apt: fields['apartment#'] || fields.apt || patient.apartment_number || '',
      city: fields.city || fields['address [city]'] || patient.city || '',
      state: fields.state || fields['address [state]'] || patient.state || '',
      zip: fields.zip || fields['address [zip]'] || patient.zip || '',
      country: fields.country || fields['address [country]'] || 'Estados Unidos',
      
      // Medical history
      glp1_medication: fields['Are you currently taking, or have you ever taken, a GLP-1 medication?'] || '',
      diabetes_type1: fields['Do you have a personal history of type 2 diabetes?'] || '',
      thyroid_cancer: fields['Do you have a personal history of medullary thyroid cancer?'] || '',
      endocrine_neoplasia: fields['Do you have a personal history of multiple endocrine neoplasia type-2?'] || '',
      pancreatitis: fields['Do you have a personal history of gastroparesis (delayed stomach emptying)?'] || '',
      pregnant_breastfeeding: fields['Are you pregnant or breast feeding?'] || '',
      medication_allergies: fields['Do you have any medical conditions or chronic illnesses?'] || '',
      blood_pressure: fields['Blood Pressure'] || '',
      
      // Treatment readiness
      commitment_level: fields['commitment_level'] || fields['How committed are you to starting treatment?'] || fields['What is your usual level of daily physical activity?'] || '5',
      over_18: fields['18+ Disclosure : By submitting this form. I certify that I am over 18 years of age and that the date of birth provided in this form is legitimate and it belongs to me.'] ? 'yes' : 'no',
      referral_source: fields['How did you hear about us?'] || fields['referral_source'] || '',
      
      // Consent
      consent_telehealth: fields['By clicking this box, I acknowledge that I have read, understood, and agree to the Terms of Use, and I acknowledge the Privacy Policy, Informed Telemedicine Consent, and the Cancellation Policy. If you live in Florida, you also accept the Florida Weight Loss Consumer Bill of Rights and the Florida Consent.'] ? 'yes' : 'no',
      consent_treatment: fields['Terms Agreement'] ? 'yes' : 'no',
      consent_cancellation: fields['Marketing Consent'] ? 'yes' : 'no',
      
      // UTM parameters
      utm_source: fields.utm_source || fields['UTM Source'] || '',
      utm_medium: fields.utm_medium || fields['UTM Medium'] || '',
      utm_campaign: fields.utm_campaign || fields['UTM Campaign'] || '',
      utm_content: fields.utm_content || fields['UTM Content'] || '',
      utm_term: fields.utm_term || fields['UTM Term'] || '',
      utm_id: fields.utm_id || fields['UTM ID'] || '',
      
      // Pass all raw fields for additional info section
      allFields: fields,
      
      // Pass flow ID and submission ID from webhook payload
      flowID: webhookPayload.flowID || webhookPayload.flow_id || webhookPayload.formId || '',
      submissionID: webhookPayload.id || webhookPayload.submissionId || webhookPayload.submission_id || patient.heyflow_submission_id || '',
      created_at: webhookPayload.createdAt || webhookPayload.created_at || patient.created_at || new Date().toISOString()
    };
    
    // Generate PDF using PDFService
    const pdfBuffer = await PDFService.generateIntakeFormPDF(patient, webhookData);
    
    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="intake-form-${patient.patient_id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    // Send PDF buffer
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating intake PDF:', error);
    res.status(500).json({ error: 'Failed to generate intake PDF' });
  }
});

// Delete a patient
// Temporarily removed authenticateToken for testing
router.delete('/:id', async (req: Request, res: Response): Promise<Response> => {
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
    await client.query(
      'DELETE FROM patients WHERE id = $1',
      [id]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Deleted patient ${patient.patient_id}: ${patient.first_name} ${patient.last_name}`);
    
    return res.json({ 
      message: 'Patient deleted successfully',
      patient_id: patient.patient_id
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting patient:', error);
    return res.status(500).json({ error: 'Failed to delete patient' });
  } finally {
    client.release();
  }
});

// Debug endpoint to check patient data
router.get('/:id/debug', async (req: Request, res: Response): Promise<Response> => {
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
    
    return res.json(addressInfo);
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router; 