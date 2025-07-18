const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function generatePatientId() {
  try {
    const result = await pool.query(
      "SELECT patient_id FROM patients WHERE patient_id LIKE 'P%' ORDER BY patient_id DESC LIMIT 1"
    );
    
    if (result.rows.length === 0) {
      return 'P0001';
    }
    
    const lastId = result.rows[0].patient_id;
    const numberPart = parseInt(lastId.substring(1));
    const nextNumber = numberPart + 1;
    return `P${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating patient ID:', error);
    throw error;
  }
}

async function processWebhook(webhook) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id, payload } = webhook;
    const data = payload.fields || payload;
    
    // Extract patient data
    const firstName = data.firstname || data.first_name || 'Unknown';
    const lastName = data.lastname || data.last_name || 'Unknown';
    const email = data.email || `patient${Date.now()}@temp.com`;
    const phone = data['Phone Number'] || data.phone || data['phone number'] || '';
    const dob = data.dob || data.date_of_birth || data['date of birth'] || '1970-01-01';
    
    // Generate patient ID
    const patientId = await generatePatientId();
    
    // Extract physical measurements
    const heightFeet = parseInt(data['height feet'] || data.height_feet || '5');
    const heightInches = parseInt(data['height inches'] || data.height_inches || '0');
    const totalHeightInches = (heightFeet * 12) + heightInches;
    const weightLbs = parseFloat(data.weight || data.weight_lbs || '0');
    
    // Calculate BMI
    let bmi = null;
    if (totalHeightInches > 0 && weightLbs > 0) {
      bmi = (weightLbs / (totalHeightInches * totalHeightInches)) * 703;
      bmi = Math.round(bmi * 100) / 100;
    }
    
    // Extract address
    const address = data.address || data['address line 1'] || '';
    const city = data.city || '';
    const state = data.state || '';
    const zip = data.zip || data['zip code'] || '';
    
    // Determine gender
    const gender = data.sex || data.gender || 'Not specified';
    
    // Create patient
    const patientResult = await client.query(
      `INSERT INTO patients (
        patient_id, first_name, last_name, email, phone, 
        date_of_birth, gender, height_inches, weight_lbs, bmi,
        address, city, state, zip, status, form_type, 
        submitted_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING id`,
      [
        patientId, firstName, lastName, email, phone,
        dob, gender, totalHeightInches, weightLbs, bmi,
        address, city, state, zip, 'pending', 'weight-loss'
      ]
    );
    
    const newPatientId = patientResult.rows[0].id;
    
    // Skip weight_loss_intake for now - just focus on creating patients
    
    // Mark webhook as processed
    await client.query(
      'UPDATE webhook_events SET processed = true WHERE id = $1',
      [id]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Processed webhook ${id} - Created patient ${patientId}: ${firstName} ${lastName}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Error processing webhook ${webhook.id}:`, error.message);
    
    // Just log the error, don't try to update non-existent column
    console.error('Full error:', error);
  } finally {
    client.release();
  }
}

async function processAllUnprocessedWebhooks() {
  try {
    console.log('🔍 Checking for unprocessed webhooks...');
    
    // Get all unprocessed webhooks
    const result = await pool.query(
      'SELECT * FROM webhook_events WHERE processed = false ORDER BY created_at ASC'
    );
    
    console.log(`Found ${result.rows.length} unprocessed webhooks`);
    
    if (result.rows.length === 0) {
      console.log('✅ No unprocessed webhooks found');
      return;
    }
    
    // Process each webhook
    for (const webhook of result.rows) {
      await processWebhook(webhook);
    }
    
    // Get updated counts
    const patientCount = await pool.query('SELECT COUNT(*) FROM patients');
    const unprocessedCount = await pool.query('SELECT COUNT(*) FROM webhook_events WHERE processed = false');
    
    console.log(`\n📊 Summary:`);
    console.log(`Total patients: ${patientCount.rows[0].count}`);
    console.log(`Remaining unprocessed webhooks: ${unprocessedCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
  }
}

// Run the processor
processAllUnprocessedWebhooks(); 