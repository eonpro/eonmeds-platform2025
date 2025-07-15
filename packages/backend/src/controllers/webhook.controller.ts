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
    const webhookSecret = process.env.HEYFLOW_WEBHOOK_SECRET;
    
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
    
    // 2. Store raw webhook event for compliance and debugging
    const webhookEvent = await storeWebhookEvent(req.body);
    
    // 3. Process the webhook asynchronously to respond quickly
    // For now, we'll process synchronously but this should be moved to a queue
    await processHeyFlowSubmission(webhookEvent.id, req.body);
    
    // 4. Acknowledge receipt quickly (< 200ms requirement)
    res.status(200).json({ received: true, eventId: webhookEvent.id });
    
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
    
    // Extract form data from HeyFlow's field structure
    const fields = payload.fields || [];
    const formType = payload.flowID || 'unknown';
    
    // Helper function to get field value by variable name
    const getFieldValue = (variableName: string): any => {
      const field = fields.find((f: any) => f.variable === variableName);
      return field?.values?.[0]?.answer || null;
    };
    
    // Map HeyFlow fields to patient data
    const patientData = {
      first_name: getFieldValue('firstname'),  // HeyFlow uses 'firstname' not 'first_name'
      last_name: getFieldValue('lastname'),    // HeyFlow uses 'lastname' not 'last_name'
      email: getFieldValue('email'),
      phone: getFieldValue('PhoneNumber'),     // HeyFlow uses 'PhoneNumber' not 'phone'
      date_of_birth: getFieldValue('dob'),     // HeyFlow uses 'dob' not 'date_of_birth'
      gender: getFieldValue('gender'),
      height_feet: getFieldValue('feet'),      // HeyFlow uses 'feet' not 'height_feet'
      height_inches: getFieldValue('inches'),  // HeyFlow uses 'inches' not 'height_inches'
      weight_lbs: getFieldValue('starting_weight'), // HeyFlow uses 'starting_weight'
      consent_treatment: getFieldValue('consent_treatment') === 'yes' || getFieldValue('consent_treatment') === true,
      consent_telehealth: getFieldValue('consent_telehealth') === 'yes' || getFieldValue('consent_telehealth') === true,
    };
    
    // Create patient record with auto-generated patient_id
    const patientResult = await client.query(
      `INSERT INTO patients (
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
        consent_treatment,
        consent_telehealth,
        consent_date,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (email) DO UPDATE SET
        updated_at = NOW(),
        heyflow_submission_id = EXCLUDED.heyflow_submission_id,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone
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
        patientData.consent_treatment,
        patientData.consent_telehealth,
        new Date(), // consent date
        'pending_review'
      ]
    );
    
    const patientId = patientResult.rows[0].id;
    
    // Handle form-specific data based on form type
    // Check if it's a weight loss form by flowID or form name
    if (formType.includes('weight') || getFieldValue('target_weight_lbs')) {
      const weightLossData = {
        target_weight_lbs: getFieldValue('target_weight_lbs'),
        weight_loss_timeline: getFieldValue('weight_loss_timeline'),
        previous_weight_loss_attempts: getFieldValue('previous_weight_loss_attempts'),
        exercise_frequency: getFieldValue('exercise_frequency'),
        diet_restrictions: getFieldValue('diet_restrictions'),
        diabetes_type: getFieldValue('diabetes_type'),
        thyroid_condition: getFieldValue('thyroid_condition') === 'yes',
        heart_conditions: getFieldValue('heart_conditions'),
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
export const webhookHealthCheck = async (req: Request, res: Response): Promise<void> => {
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