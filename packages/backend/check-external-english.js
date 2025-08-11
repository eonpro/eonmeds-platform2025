const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : false
});

async function checkExternalEnglish() {
  const client = await pool.connect();
  
  try {
    console.log('Checking for External English patients...\n');
    
    // Check patients with externalenglish hashtag
    const result = await client.query(`
      SELECT 
        patient_id,
        first_name,
        last_name,
        email,
        membership_hashtags,
        created_at
      FROM patients
      WHERE 'externalenglish' = ANY(membership_hashtags)
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${result.rows.length} patients with 'externalenglish' hashtag:\n`);
    
    if (result.rows.length === 0) {
      console.log('No patients found with externalenglish hashtag.');
      console.log('\nChecking all recent patients to see their hashtags...\n');
      
      const allPatients = await client.query(`
        SELECT 
          patient_id,
          first_name,
          last_name,
          membership_hashtags,
          created_at
        FROM patients
        ORDER BY created_at DESC
        LIMIT 5
      `);
      
      console.log('Recent patients and their hashtags:');
      allPatients.rows.forEach(patient => {
        console.log(`${patient.patient_id}: ${patient.first_name} ${patient.last_name}`);
        console.log(`  Hashtags: ${patient.membership_hashtags ? patient.membership_hashtags.join(', ') : 'None'}`);
        console.log(`  Created: ${patient.created_at}\n`);
      });
    } else {
      result.rows.forEach(patient => {
        console.log(`${patient.patient_id}: ${patient.first_name} ${patient.last_name}`);
        console.log(`  Email: ${patient.email}`);
        console.log(`  Hashtags: ${patient.membership_hashtags.join(', ')}`);
        console.log(`  Created: ${patient.created_at}\n`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkExternalEnglish();
