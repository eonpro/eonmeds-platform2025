require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function checkPatient() {
  try {
    // Check patient P1358 (from the screenshot)
    const result = await pool.query(
      "SELECT patient_id, first_name, last_name, stripe_customer_id FROM patients WHERE patient_id = 'P1358'",
    );
    
    if (result.rows.length > 0) {
      const patient = result.rows[0];
      console.log('Patient:', patient.patient_id, patient.first_name, patient.last_name);
      console.log('Stripe Customer ID:', patient.stripe_customer_id || 'NOT SET');
    } else {
      console.log('Patient P1358 not found');
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkPatient();
