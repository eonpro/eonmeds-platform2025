const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function updatePatientAddresses() {
  const client = await pool.connect();
  
  try {
    // Get all patients with webhook data
    const result = await client.query(`
      SELECT p.id, p.patient_id, p.first_name, p.last_name, we.payload
      FROM patients p
      JOIN webhook_events we ON p.heyflow_submission_id = we.webhook_id
      WHERE p.address IS NULL OR p.city IS NULL
    `);
    
    console.log(`Found ${result.rows.length} patients to update with address data\n`);
    
    let updateCount = 0;
    
    for (const row of result.rows) {
      const fields = row.payload?.fields || {};
      
      // Extract address components
      const address = fields.address || null;
      const city = fields['address [city]'] || null;
      const state = fields['address [state]'] || null;
      const zip = fields['address [zip]'] || null;
      
      if (address || city || state || zip) {
        await client.query(`
          UPDATE patients 
          SET 
            address = COALESCE($1, address),
            city = COALESCE($2, city),
            state = COALESCE($3, state),
            zip = COALESCE($4, zip),
            updated_at = NOW()
          WHERE id = $5
        `, [address, city, state, zip, row.id]);
        
        console.log(`✅ Updated ${row.first_name} ${row.last_name} (${row.patient_id})`);
        console.log(`   Address: ${address || 'N/A'}`);
        console.log(`   City: ${city || 'N/A'}, State: ${state || 'N/A'}, ZIP: ${zip || 'N/A'}\n`);
        
        updateCount++;
      }
    }
    
    // Also update any "Unknown Unknown" patients
    const unknownResult = await client.query(`
      SELECT p.id, p.patient_id, we.payload
      FROM patients p
      JOIN webhook_events we ON p.heyflow_submission_id = we.webhook_id
      WHERE p.first_name = 'Unknown' OR p.last_name = 'Unknown'
    `);
    
    console.log(`\nFound ${unknownResult.rows.length} "Unknown" patients to fix\n`);
    
    for (const row of unknownResult.rows) {
      const fields = row.payload?.fields || {};
      
      const firstName = fields.firstname || fields.first_name || 'Unknown';
      const lastName = fields.lastname || fields.last_name || 'Unknown';
      
      if (firstName !== 'Unknown' || lastName !== 'Unknown') {
        await client.query(`
          UPDATE patients 
          SET 
            first_name = $1,
            last_name = $2,
            updated_at = NOW()
          WHERE id = $3
        `, [firstName, lastName, row.id]);
        
        console.log(`✅ Fixed name for patient ${row.patient_id}: ${firstName} ${lastName}`);
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

console.log('Updating patient addresses from webhook data...\n');
updatePatientAddresses(); 