require('dotenv').config();
const { Pool } = require('pg');

async function checkPatient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const patientId = process.argv[2] || 'P0061';
    console.log(`\n🔍 Checking patient ${patientId}...\n`);

    const result = await pool.query(
      `
      SELECT 
        patient_id,
        first_name,
        last_name,
        address,
        address_house,
        address_street,
        apartment_number,
        city,
        state,
        zip,
        created_at,
        updated_at
      FROM patients
      WHERE patient_id = $1
    `,
      [patientId]
    );

    if (result.rows.length === 0) {
      console.log('❌ Patient not found');
      return;
    }

    const patient = result.rows[0];

    console.log('📋 Patient Address Data:');
    console.log('========================');
    console.log(`Name: ${patient.first_name} ${patient.last_name}`);
    console.log(`\nLegacy Format:`);
    console.log(`  address: ${patient.address || 'NULL'}`);
    console.log(`  city: ${patient.city || 'NULL'}`);
    console.log(`  state: ${patient.state || 'NULL'}`);
    console.log(`  zip: ${patient.zip || 'NULL'}`);
    console.log(`\nNew Format:`);
    console.log(`  address_house: ${patient.address_house || 'NULL'}`);
    console.log(`  address_street: ${patient.address_street || 'NULL'}`);
    console.log(`  apartment_number: ${patient.apartment_number || 'NULL'}`);
    console.log(`\nTimestamps:`);
    console.log(`  Created: ${patient.created_at}`);
    console.log(`  Updated: ${patient.updated_at}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPatient();
