const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function processHeyFlowWebhooks() {
  const client = await pool.connect();
  
  try {
    // Get only HeyFlow webhooks (not Stripe)
    const result = await client.query(`
      SELECT id, payload, created_at 
      FROM webhook_events 
      WHERE processed = false 
      AND (
        payload->>'eventType' = 'form.submitted' 
        OR payload->'fields' IS NOT NULL
        OR payload->>'flowID' IS NOT NULL
      )
      ORDER BY created_at ASC
    `);
    
    console.log(`\n🔄 PROCESSING HEYFLOW WEBHOOKS`);
    console.log(`📊 Found ${result.rows.length} HeyFlow webhooks to process`);
    console.log(`========================================\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const webhook of result.rows) {
      console.log(`\nProcessing webhook ${webhook.id}...`);
      console.log(`Created at: ${webhook.created_at}`);
      
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
        
        // Extract address components
        const fullAddress = fields.address || '';
        const addressHouse = fields['address [house]'] || '';
        const addressStreet = fields['address [street]'] || '';
        const city = fields['address [city]'] || '';
        const state = fields['address [state]'] || '';
        const zip = fields['address [zip]'] || '';
        
        // Prepare patient data
        const patientData = {
          patient_id: patientId,
          heyflow_submission_id: payload.id || `heyflow_${timestamp}`,
          form_type: 'weight_loss',
          submitted_at: payload.createdAt ? new Date(payload.createdAt) : new Date(),
          first_name: fields.firstname || 'Unknown',
          last_name: fields.lastname || 'Unknown', 
          email: fields.email,
          phone: fields['Phone Number'] || fields.PhoneNumber || null,
          date_of_birth: fields.dob || null,
          gender: fields.gender || null,
          height_inches: calculateTotalInches(fields.feet || 0, fields.inches || 0),
          weight_lbs: parseFloat(fields.starting_weight || 0) || null,
          bmi: Math.min(parseFloat(fields.BMI || 0) || 0, 99.99), // Cap at 99.99 due to DB constraint
          status: 'qualified',
          address: fullAddress,
          address_house: addressHouse,
          address_street: addressStreet,
          city: city,
          state: state,
          zip: zip,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        console.log(`Patient: ${patientData.first_name} ${patientData.last_name}`);
        console.log(`Email: ${patientData.email}`);
        console.log(`Phone: ${patientData.phone}`);
        console.log(`Location: ${city}, ${state} ${zip}`);
        
        // Note if BMI was capped
        const originalBmi = parseFloat(fields.BMI || 0);
        if (originalBmi > 99.99) {
          console.log(`⚠️  BMI capped from ${originalBmi} to 99.99 due to database constraint`);
        }
        
        // Insert patient
        const insertQuery = `
          INSERT INTO patients (
            patient_id, heyflow_submission_id, form_type, submitted_at,
            first_name, last_name, email, phone, date_of_birth, gender,
            height_inches, weight_lbs, bmi, status, 
            address, address_house, address_street, city, state, zip,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
          ) ON CONFLICT (email) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = COALESCE(EXCLUDED.phone, patients.phone),
            address = COALESCE(EXCLUDED.address, patients.address),
            address_house = COALESCE(EXCLUDED.address_house, patients.address_house),
            address_street = COALESCE(EXCLUDED.address_street, patients.address_street),
            city = COALESCE(EXCLUDED.city, patients.city),
            state = COALESCE(EXCLUDED.state, patients.state),
            zip = COALESCE(EXCLUDED.zip, patients.zip),
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
          patientData.address,
          patientData.address_house,
          patientData.address_street,
          patientData.city,
          patientData.state,
          patientData.zip,
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
        
        console.log(`✅ SUCCESS: Created/Updated patient ${createdPatient.patient_id}`);
        successCount++;
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ ERROR:`, error.message);
        
        // Update error message
        await client.query(
          'UPDATE webhook_events SET error_message = $1 WHERE id = $2',
          [error.message, webhook.id]
        );
        errorCount++;
      }
    }
    
    console.log('\n========================================');
    console.log('🎉 HEYFLOW PROCESSING COMPLETE!');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
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

// Run the processing
console.log('🚀 Starting HeyFlow webhook processing...');
processHeyFlowWebhooks();
