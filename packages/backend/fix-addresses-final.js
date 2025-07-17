const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function fixAddresses() {
  const client = await pool.connect();
  
  try {
    // Get all patients
    const patients = await client.query(`
      SELECT id, patient_id, first_name, last_name, email, heyflow_submission_id 
      FROM patients 
      WHERE address IS NULL
    `);
    
    console.log(`Found ${patients.rows.length} patients without addresses\n`);
    
    let updateCount = 0;
    
    for (const patient of patients.rows) {
      // Find webhook by matching the payload ID or email
      const webhookResult = await client.query(`
        SELECT payload 
        FROM webhook_events 
        WHERE payload->>'id' = $1 
           OR payload->'fields'->>'email' = $2
        LIMIT 1
      `, [patient.heyflow_submission_id, patient.email]);
      
      if (webhookResult.rows.length > 0) {
        const fields = webhookResult.rows[0].payload?.fields || {};
        
        // Extract address components
        const address = fields.address || null;
        const city = fields['address [city]'] || null;
        const state = fields['address [state]'] || null;
        const zip = fields['address [zip]'] || null;
        
        if (address || city || state || zip) {
          await client.query(`
            UPDATE patients 
            SET 
              address = $1,
              city = $2,
              state = $3,
              zip = $4,
              updated_at = NOW()
            WHERE id = $5
          `, [address, city, state, zip, patient.id]);
          
          console.log(`✅ Updated ${patient.first_name} ${patient.last_name} (${patient.patient_id})`);
          console.log(`   Address: ${address || 'N/A'}`);
          console.log(`   City: ${city || 'N/A'}, State: ${state || 'N/A'}, ZIP: ${zip || 'N/A'}\n`);
          updateCount++;
        }
      }
    }
    
    console.log(`\n✅ Update complete! Updated ${updateCount} patients with address data.`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

console.log('Fixing patient addresses from webhook data...\n');
fixAddresses(); 