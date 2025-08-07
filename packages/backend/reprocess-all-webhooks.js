const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function reprocessWebhooks(batchSize = 100) {
  const client = await pool.connect();
  
  try {
    // Get count of unprocessed webhooks
    const countResult = await client.query(
      'SELECT COUNT(*) as total FROM webhook_events WHERE processed = false'
    );
    const totalCount = parseInt(countResult.rows[0].total);
    
    console.log(`\n🔄 STARTING WEBHOOK REPROCESSING`);
    console.log(`📊 Total unprocessed webhooks: ${totalCount}`);
    console.log(`📦 Processing in batches of: ${batchSize}`);
    console.log(`========================================\n`);
    
    let totalSuccess = 0;
    let totalErrors = 0;
    let batchNumber = 0;
    
    while (true) {
      batchNumber++;
      
      // Get batch of unprocessed webhooks
      const result = await client.query(
        'SELECT id, payload FROM webhook_events WHERE processed = false ORDER BY created_at ASC LIMIT $1',
        [batchSize]
      );
      
      if (result.rows.length === 0) {
        console.log('\n✅ No more webhooks to process!');
        break;
      }
      
      console.log(`\n📦 Processing batch ${batchNumber} (${result.rows.length} webhooks)...`);
      
      let batchSuccess = 0;
      let batchErrors = 0;
      
      for (const webhook of result.rows) {
        try {
          await client.query('BEGIN');
          
          // Extract data from webhook payload
          const payload = webhook.payload;
          const fields = payload.fields || {};
          
          // Skip if no email (required field)
          if (!fields.email) {
            throw new Error('Missing required field: email');
          }
          
          // Generate unique patient ID
          const timestamp = Date.now();
          const randomSuffix = Math.floor(Math.random() * 1000);
          const patientId = `P${String(timestamp).slice(-6)}${randomSuffix}`;
          
          // Prepare patient data
          const patientData = {
            patient_id: patientId,
            heyflow_submission_id: payload.id || `webhook_${timestamp}`,
            form_type: 'weight_loss',
            submitted_at: payload.createdAt ? new Date(payload.createdAt) : new Date(),
            first_name: fields.firstname || fields.first_name || 'Unknown',
            last_name: fields.lastname || fields.last_name || 'Unknown', 
            email: fields.email,
            phone: fields['Phone Number'] || fields.PhoneNumber || fields.phone || null,
            date_of_birth: fields.dob || fields.date_of_birth || null,
            gender: fields.gender || null,
            height_inches: calculateTotalInches(fields.feet || fields.height_feet, fields.inches || fields.height_inches),
            weight_lbs: parseFloat(fields.starting_weight || fields.weight || 0) || null,
            bmi: parseFloat(fields.BMI || fields.bmi || 0) || null,
            status: 'qualified',
            created_at: new Date(),
            updated_at: new Date()
          };
          
          // Insert patient
          const insertQuery = `
            INSERT INTO patients (
              patient_id, heyflow_submission_id, form_type, submitted_at,
              first_name, last_name, email, phone, date_of_birth, gender,
              height_inches, weight_lbs, bmi, status, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            ) ON CONFLICT (email) DO UPDATE SET
              first_name = COALESCE(EXCLUDED.first_name, patients.first_name),
              last_name = COALESCE(EXCLUDED.last_name, patients.last_name),
              phone = COALESCE(EXCLUDED.phone, patients.phone),
              updated_at = NOW()
            RETURNING patient_id, first_name, last_name, email
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
            patientData.height_inches,
            patientData.weight_lbs,
            patientData.bmi,
            patientData.status,
            patientData.created_at,
            patientData.updated_at
          ];
          
          const patientResult = await client.query(insertQuery, values);
          const createdPatient = patientResult.rows[0];
          
          // Mark webhook as processed
          await client.query(
            'UPDATE webhook_events SET processed = true, processed_at = NOW(), error_message = NULL WHERE id = $1',
            [webhook.id]
          );
          
          await client.query('COMMIT');
          
          batchSuccess++;
          totalSuccess++;
          
          // Log every 10th success to avoid too much output
          if (totalSuccess % 10 === 0) {
            console.log(`  ✅ Progress: ${totalSuccess} successful`);
          }
          
        } catch (error) {
          await client.query('ROLLBACK');
          
          // Update error message
          await client.query(
            'UPDATE webhook_events SET error_message = $1 WHERE id = $2',
            [error.message, webhook.id]
          );
          
          batchErrors++;
          totalErrors++;
          
          // Log every error for debugging
          if (error.message !== 'Missing required field: email') {
            console.log(`  ❌ Error: ${error.message}`);
          }
        }
      }
      
      console.log(`  Batch ${batchNumber} complete: ${batchSuccess} success, ${batchErrors} errors`);
      
      // Show progress
      const remaining = totalCount - totalSuccess - totalErrors;
      console.log(`  📊 Overall progress: ${totalSuccess + totalErrors}/${totalCount} (${remaining} remaining)`);
    }
    
    console.log('\n========================================');
    console.log('🎉 REPROCESSING COMPLETE!');
    console.log(`✅ Total Successful: ${totalSuccess}`);
    console.log(`❌ Total Failed: ${totalErrors}`);
    console.log(`📊 Success Rate: ${((totalSuccess / (totalSuccess + totalErrors)) * 100).toFixed(1)}%`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

function calculateTotalInches(feet, inches) {
  const feetNum = parseInt(feet || 0);
  const inchesNum = parseInt(inches || 0);
  return (feetNum * 12) + inchesNum;
}

// Get batch size from command line or use default
const batchSize = parseInt(process.argv[2]) || 100;

// Run the reprocessing
console.log('🚀 Starting webhook reprocessing...');
reprocessWebhooks(batchSize);
