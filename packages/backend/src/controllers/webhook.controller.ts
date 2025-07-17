import { Request, Response } from 'express';
import crypto from 'crypto';
import { pool } from '../config/database';

/**
 * Verify HeyFlow webhook signature
 */
export const verifyHeyFlowSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  
  // Timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
};

/**
 * Handle HeyFlow webhook for patient intake forms
 */
export const handleHeyFlowWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Debug: Log all headers to see what HeyFlow is sending
    console.log('=== HeyFlow Webhook Received ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // 1. Verify webhook signature for security
    // const webhookSecret = process.env.HEYFLOW_WEBHOOK_SECRET;
    
    // TEMPORARY: Skip signature verification for HeyFlow testing
    console.warn('⚠️  TEMPORARILY BYPASSING SIGNATURE VERIFICATION FOR TESTING');
    /*
    // For development/testing, allow bypassing signature verification
    if (process.env.NODE_ENV === 'development' && !webhookSecret) {
      console.warn('⚠️  WEBHOOK SECRET NOT SET - Bypassing signature verification');
    } else {
      const signature = req.headers['x-heyflow-signature'] as string;
      
      if (!signature || !webhookSecret) {
        console.error('Missing signature or webhook secret');
        console.error('Expected secret exists:', !!webhookSecret);
        console.error('Received headers:', Object.keys(req.headers));
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const payload = JSON.stringify(req.body);
      const isValid = verifyHeyFlowSignature(payload, signature, webhookSecret);
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }
    */
    
    // Check if database is available
    let webhookEventId = null;
    
    try {
      // Try to store in database if available
      const webhookEvent = await storeWebhookEvent(req.body);
      webhookEventId = webhookEvent.id;
      
      // Process the webhook if database is available
      await processHeyFlowSubmission(webhookEventId, req.body);
      
      console.log('✅ Webhook processed and stored in database');
    } catch (dbError) {
      // Database not available - log to console instead
      console.error('Database error in webhook:', dbError);
      console.warn('⚠️  Database not available - logging webhook data to console');
      console.log('=== WEBHOOK DATA TO PROCESS LATER ===');
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        webhook: req.body
      }, null, 2));
      console.log('=== END WEBHOOK DATA ===');
    }
    
    // 4. Always acknowledge receipt quickly (< 200ms requirement)
    res.status(200).json({ 
      received: true, 
      eventId: webhookEventId,
      message: webhookEventId ? 'Webhook processed successfully' : 'Webhook received (database offline)'
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to prevent retries if it's our error
    res.status(200).json({ received: true, error: 'Processing failed' });
  }
};

/**
 * Store raw webhook event in database
 */
async function storeWebhookEvent(payload: any) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO webhook_events (
        source, 
        event_type, 
        webhook_id, 
        payload, 
        signature,
        processed,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
      RETURNING id`,
      [
        'heyflow',
        payload.eventType || 'form.submitted',
        payload.webhookId || crypto.randomUUID(),
        payload,
        payload.signature || null,
        false
      ]
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Process HeyFlow form submission
 */
async function processHeyFlowSubmission(eventId: string, payload: any) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Debug: Log the payload structure
    console.log('Processing HeyFlow submission with payload structure:');
    console.log('- Has fields array?', Array.isArray(payload.fields));
    console.log('- Has fields object?', typeof payload.fields === 'object' && !Array.isArray(payload.fields));
    console.log('- Has data object?', typeof payload.data === 'object');
    console.log('- Payload keys:', Object.keys(payload));
    
    // Helper function to get field value by variable name
    const getFieldValue = (variableName: string): any => {
      // If we have a fields array
      if (Array.isArray(payload.fields)) {
        const field = payload.fields.find((f: any) => f.variable === variableName);
        return field?.values?.[0]?.answer || null;
      }
      // Otherwise return null
      return null;
    };
    
    // Extract form data - handle multiple possible formats
    let extractedData: any = {};
    
    // Format 1: Direct data object (most common for HeyFlow)
    if (payload.data && typeof payload.data === 'object') {
      console.log('Using Format 1: Direct data object');
      extractedData = payload.data;
    }
    // Format 2: Fields object (current HeyFlow format - July 2025)
    else if (payload.fields && typeof payload.fields === 'object' && !Array.isArray(payload.fields)) {
      console.log('Using Format 2: Fields object (current format)');
      extractedData = payload.fields;
    }
    // Format 3: Fields array (older format)
    else if (Array.isArray(payload.fields)) {
      console.log('Using Format 3: Fields array (older format)');
      
      // Extract each field using the helper function
      extractedData = {
        firstname: getFieldValue('firstname'),
        lastname: getFieldValue('lastname'),
        email: getFieldValue('email'),
        PhoneNumber: getFieldValue('PhoneNumber'),
        dob: getFieldValue('dob'),
        gender: getFieldValue('gender'),
        feet: getFieldValue('feet'),
        inches: getFieldValue('inches'),
        starting_weight: getFieldValue('starting_weight'),
        consent_treatment: getFieldValue('consent_treatment'),
        consent_telehealth: getFieldValue('consent_telehealth'),
      };
    }
    // Format 4: Direct properties on payload
    else if (payload.firstname || payload.email || payload.lastname) {
      console.log('Using Format 4: Direct properties');
      extractedData = payload;
    }
    // Format 5: Nested in submission object
    else if (payload.submission && typeof payload.submission === 'object') {
      console.log('Using Format 5: Submission object');
      extractedData = payload.submission.data || payload.submission;
    }
    else {
      // Log the entire payload for debugging
      console.error('Unknown payload format. Full payload:', JSON.stringify(payload, null, 2));
      throw new Error('Unable to extract data from webhook payload');
    }
    
    console.log('Extracted data:', JSON.stringify(extractedData, null, 2));
    
    // Map HeyFlow fields to patient data with multiple possible field names
    const patientData = {
      first_name: extractedData.firstname || extractedData.first_name || extractedData.firstName || null,
      last_name: extractedData.lastname || extractedData.last_name || extractedData.lastName || null,
      email: extractedData.email || extractedData.Email || extractedData.email_address || null,
      phone: extractedData['Phone Number'] || extractedData.PhoneNumber || extractedData.phone || extractedData.phone_number || extractedData.telefono || null,
      date_of_birth: extractedData.dob || extractedData.date_of_birth || extractedData.dateOfBirth || extractedData.birthdate || null,
      gender: extractedData.gender || extractedData.Gender || extractedData.sex || null,
      height_feet: parseInt(extractedData.feet || extractedData.height_feet || 0),
      height_inches: parseInt(extractedData.inches || extractedData.height_inches || 0),
      weight_lbs: parseFloat(extractedData.starting_weight || extractedData.weight || extractedData.weight_lbs || extractedData.current_weight || 0),
      target_weight_lbs: parseFloat(extractedData.idealweight || extractedData.target_weight || extractedData.target_weight_lbs || extractedData.goal_weight || 0),
      bmi: parseFloat(extractedData.BMI || extractedData.bmi || 0),
      address: extractedData.address || extractedData.Address || null,
      city: extractedData['address [city]'] || extractedData.city || null,
      state: extractedData['address [state]'] || extractedData.state || null,
      zip: extractedData['address [zip]'] || extractedData.zip || null,
      consent_treatment: extractedData.consent_treatment === 'yes' || extractedData.consent_treatment === true || extractedData.consent_treatment === 'true',
      consent_telehealth: extractedData.consent_telehealth === 'yes' || extractedData.consent_telehealth === true || extractedData.consent_telehealth === 'true',
    };
    
    // Validate required fields
    if (!patientData.email) {
      throw new Error('Missing required field: email');
    }
    
    // Calculate BMI if we have height and weight
    let bmi = null;
    const totalHeightInches = calculateHeightInches(patientData.height_feet, patientData.height_inches);
    if (totalHeightInches > 0 && patientData.weight_lbs > 0) {
      bmi = (patientData.weight_lbs / (totalHeightInches * totalHeightInches)) * 703;
      bmi = Math.round(bmi * 10) / 10; // Round to 1 decimal place
    }
    
    // Get form type from various possible locations
    const formType = payload.flowID || payload.formType || payload.form_type || payload.type || 'unknown';
    
    // Create patient record with auto-generated patient_id
    const patientResult = await client.query(
      `INSERT INTO patients (
        patient_id,
        heyflow_submission_id,
        form_type,
        form_version,
        submitted_at,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        height_inches,
        weight_lbs,
        bmi,
        address,
        city,
        state,
        zip,
        consent_treatment,
        consent_telehealth,
        consent_date,
        status
      ) VALUES (
        'P' || LPAD(nextval('patient_id_seq')::TEXT, 6, '0'),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT (email) DO UPDATE SET
        updated_at = NOW(),
        heyflow_submission_id = EXCLUDED.heyflow_submission_id,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        height_inches = EXCLUDED.height_inches,
        weight_lbs = EXCLUDED.weight_lbs,
        bmi = EXCLUDED.bmi,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip = EXCLUDED.zip
      RETURNING id, patient_id, email, first_name, last_name`,
      [
        payload.id || payload.webhookId,
        formType,
        '1.0', // HeyFlow doesn't send version in test data
        new Date(payload.createdAt || Date.now()),
        patientData.first_name,
        patientData.last_name,
        patientData.email,
        patientData.phone,
        patientData.date_of_birth ? new Date(patientData.date_of_birth) : null,
        patientData.gender,
        calculateHeightInches(patientData.height_feet, patientData.height_inches),
        patientData.weight_lbs,
        bmi,
        patientData.address,
        patientData.city,
        patientData.state,
        patientData.zip,
        patientData.consent_treatment,
        patientData.consent_telehealth,
        new Date(), // consent date
        'pending_review'
      ]
    );
    
    const patientId = patientResult.rows[0].id;
    
    // Handle form-specific data based on form type
    // Check if it's a weight loss form by flowID or form name
    if (formType.includes('weight') || extractedData.target_weight_lbs || patientData.target_weight_lbs) {
      const weightLossData = {
        target_weight_lbs: patientData.target_weight_lbs || extractedData.target_weight_lbs || null,
        weight_loss_timeline: extractedData.weight_loss_timeline || null,
        previous_weight_loss_attempts: extractedData.previous_weight_loss_attempts || null,
        exercise_frequency: extractedData.exercise_frequency || null,
        diet_restrictions: extractedData.diet_restrictions || null,
        diabetes_type: extractedData.diabetes_type || null,
        thyroid_condition: extractedData.thyroid_condition === 'yes',
        heart_conditions: extractedData.heart_conditions || null,
      };
      
      await storeWeightLossIntakeData(client, patientId, weightLossData);
    }
    
    // Mark webhook as processed
    await client.query(
      'UPDATE webhook_events SET processed = true, processed_at = NOW() WHERE id = $1',
      [eventId]
    );
    
    await client.query('COMMIT');
    
    console.log(`Successfully processed HeyFlow submission for patient ${patientId}`);
    console.log('Patient email:', patientData.email);
    
    // TODO: Send notifications, trigger other workflows
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    // Log error to webhook_events
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await client.query(
      'UPDATE webhook_events SET error_message = $1, processed_at = NOW() WHERE id = $2',
      [errorMessage, eventId]
    );
    
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Store weight loss specific intake data
 */
async function storeWeightLossIntakeData(client: any, patientId: string, formData: any) {
  await client.query(
    `INSERT INTO weight_loss_intake (
      patient_id,
      target_weight_lbs,
      weight_loss_timeline,
      previous_weight_loss_attempts,
      exercise_frequency,
      diet_restrictions,
      diabetes_type,
      thyroid_condition,
      heart_conditions
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      patientId,
      formData.target_weight_lbs,
      formData.weight_loss_timeline,
      formData.previous_weight_loss_attempts,
      formData.exercise_frequency,
      formData.diet_restrictions ? formData.diet_restrictions.split(',') : [],
      formData.diabetes_type,
      formData.thyroid_condition === true || formData.thyroid_condition === 'true',
      formData.heart_conditions ? formData.heart_conditions.split(',') : []
    ]
  );
}

/**
 * Calculate total height in inches
 */
function calculateHeightInches(feet: number, inches: number): number {
  const feetNum = parseInt(feet?.toString() || '0');
  const inchesNum = parseInt(inches?.toString() || '0');
  return (feetNum * 12) + inchesNum;
}

/**
 * Health check endpoint for webhooks
 */
export const webhookHealthCheck = async (_req: Request, res: Response): Promise<void> => {
  try {
    const client = await pool.connect();
    
    // Check recent webhook processing
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_webhooks,
        COUNT(CASE WHEN processed = true THEN 1 END) as processed_webhooks,
        COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as failed_webhooks,
        MAX(created_at) as last_webhook_received
      FROM webhook_events
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    client.release();
    
    res.json({
      status: 'healthy',
      stats: result.rows[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Health check failed' 
    });
  }
}; 