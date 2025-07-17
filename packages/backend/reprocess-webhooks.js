const { Pool } = require('pg');
const { processHeyFlowSubmission } = require('./src/controllers/webhook.controller');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function reprocessWebhooks() {
  const client = await pool.connect();
  
  try {
    // Get all unprocessed webhooks
    const result = await client.query(
      'SELECT id, payload FROM webhook_events WHERE processed = false ORDER BY created_at ASC'
    );
    
    console.log(`Found ${result.rows.length} unprocessed webhooks`);
    
    for (const webhook of result.rows) {
      console.log(`\nProcessing webhook ${webhook.id}...`);
      
      try {
        // Process the webhook payload using the existing function
        await processWebhookData(webhook.payload, client);
        
        // Mark as processed
        await client.query(
          'UPDATE webhook_events SET processed = true, processed_at = NOW() WHERE id = $1',
          [webhook.id]
        );
        
        console.log(`✅ Successfully processed webhook ${webhook.id}`);
      } catch (error) {
        console.error(`❌ Failed to process webhook ${webhook.id}:`, error.message);
        
        // Update error message
        await client.query(
          'UPDATE webhook_events SET error_message = $1 WHERE id = $2',
          [error.message, webhook.id]
        );
      }
    }
    
    console.log('\n✅ Reprocessing complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Simplified processing function that handles the current HeyFlow format
async function processWebhookData(payload, client) {
  // Current HeyFlow format has fields as an object
  const fields = payload.fields || {};
  
  // Extract patient data
  const patientData = {
    patient_id: `P${String(Date.now()).slice(-6)}`, // Generate unique ID
    heyflow_submission_id: payload.id || `webhook_${Date.now()}`,
    form_type: 'weight_loss',
    submitted_at: payload.createdAt || new Date().toISOString(),
    first_name: fields.firstname || 'Unknown',
    last_name: fields.lastname || 'Unknown',
    email: fields.email,
    phone: fields['Phone Number'] || fields.PhoneNumber,
    date_of_birth: fields.dob,
    gender: fields.gender,
    height_feet: parseInt(fields.feet || 0),
    height_inches: parseInt(fields.inches || 0),
    weight_lbs: parseFloat(fields.starting_weight || 0),
    target_weight_lbs: parseFloat(fields.idealweight || 0),
    bmi: parseFloat(fields.BMI || 0),
    address: fields.address,
    city: fields['address [city]'],
    state: fields['address [state]'],
    zip: fields['address [zip]'],
    status: 'qualified',
    created_at: new Date(),
    updated_at: new Date()
  };
  
  // Insert patient
  const insertQuery = `
    INSERT INTO patients (
      patient_id, heyflow_submission_id, form_type, submitted_at,
      first_name, last_name, email, phone, date_of_birth, gender,
      height_feet, height_inches, weight_lbs, target_weight_lbs, bmi,
      address, city, state, zip, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
    ) ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      updated_at = NOW()
    RETURNING *
  `;
  
  const values = [
    patientData.patient_id,
    patientData.heyflow_submission_id,
    patientData.form_type,
    patientData.submitted_at,
    patientData.first_name,
    patientData.last_name,
    patientData.email,
    patientData.phone,
    patientData.date_of_birth,
    patientData.gender,
    patientData.height_feet,
    patientData.height_inches,
    patientData.weight_lbs,
    patientData.target_weight_lbs,
    patientData.bmi,
    patientData.address,
    patientData.city,
    patientData.state,
    patientData.zip,
    patientData.status,
    patientData.created_at,
    patientData.updated_at
  ];
  
  const result = await client.query(insertQuery, values);
  console.log(`Created patient: ${result.rows[0].first_name} ${result.rows[0].last_name} (${result.rows[0].patient_id})`);
  
  return result.rows[0];
}

// Run the reprocessing
reprocessWebhooks(); 