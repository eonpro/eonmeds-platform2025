const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function reprocessWebhooks() {
  const client = await pool.connect();

  try {
    // Get all unprocessed webhooks
    const result = await client.query(
      'SELECT id, payload FROM webhook_events WHERE processed = false ORDER BY created_at ASC LIMIT 10'
    );

    console.log(`Found ${result.rows.length} unprocessed webhooks to process (limited to 10)`);

    let successCount = 0;
    let errorCount = 0;

    for (const webhook of result.rows) {
      console.log(`\n========================================`);
      console.log(`Processing webhook ${webhook.id}...`);

      try {
        await client.query('BEGIN');

        // Extract data from webhook payload
        const payload = webhook.payload;
        const fields = payload.fields || {};

        // Generate unique patient ID
        const timestamp = Date.now();
        const patientId = `P${String(timestamp).slice(-6)}`;

        // Prepare patient data
        const patientData = {
          patient_id: patientId,
          heyflow_submission_id: payload.id || `webhook_${timestamp}`,
          form_type: 'weight_loss',
          submitted_at: payload.createdAt ? new Date(payload.createdAt) : new Date(),
          first_name: fields.firstname || 'Unknown',
          last_name: fields.lastname || 'Unknown',
          email: fields.email || `patient${timestamp}@temp.com`,
          phone: fields['Phone Number'] || fields.PhoneNumber || null,
          date_of_birth: fields.dob || null,
          gender: fields.gender || null,
          height_inches: calculateTotalInches(fields.feet, fields.inches),
          weight_lbs: parseFloat(fields.starting_weight || 0) || null,
          bmi: parseFloat(fields.BMI || 0) || null,
          status: 'qualified',
          created_at: new Date(),
          updated_at: new Date(),
        };

        console.log(
          `Creating patient: ${patientData.first_name} ${patientData.last_name} (${patientData.email})`
        );

        // Insert patient
        const insertQuery = `
          INSERT INTO patients (
            patient_id, heyflow_submission_id, form_type, submitted_at,
            first_name, last_name, email, phone, date_of_birth, gender,
            height_inches, weight_lbs, bmi, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          ) ON CONFLICT (email) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
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
          patientData.updated_at,
        ];

        const patientResult = await client.query(insertQuery, values);
        const createdPatient = patientResult.rows[0];

        // Mark webhook as processed
        await client.query(
          'UPDATE webhook_events SET processed = true, processed_at = NOW() WHERE id = $1',
          [webhook.id]
        );

        await client.query('COMMIT');

        console.log(
          `✅ SUCCESS: Created patient ${createdPatient.patient_id} - ${createdPatient.first_name} ${createdPatient.last_name}`
        );
        successCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ ERROR processing webhook ${webhook.id}:`, error.message);

        // Update error message
        await client.query('UPDATE webhook_events SET error_message = $1 WHERE id = $2', [
          error.message,
          webhook.id,
        ]);
        errorCount++;
      }
    }

    console.log('\n========================================');
    console.log('REPROCESSING COMPLETE!');
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
  return feetNum * 12 + inchesNum;
}

// Run the reprocessing
console.log('Starting webhook reprocessing...\n');
reprocessWebhooks();
