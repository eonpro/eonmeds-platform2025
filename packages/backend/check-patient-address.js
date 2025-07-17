require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

async function checkPatientAddress() {
  try {
    const patientId = 'P147118'; // Caren Sanchez
    
    console.log(`Checking address data for patient ${patientId}...`);
    
    const result = await pool.query(`
      SELECT 
        patient_id,
        first_name,
        last_name,
        address,
        city,
        state,
        zip
      FROM patients
      WHERE patient_id = $1
    `, [patientId]);
    
    if (result.rows.length === 0) {
      console.log('Patient not found');
    } else {
      const patient = result.rows[0];
      console.log('\nPatient found:');
      console.log(`Name: ${patient.first_name} ${patient.last_name}`);
      console.log(`Address: ${patient.address || 'NULL'}`);
      console.log(`City: ${patient.city || 'NULL'}`);
      console.log(`State: ${patient.state || 'NULL'}`);
      console.log(`Zip: ${patient.zip || 'NULL'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkPatientAddress(); 