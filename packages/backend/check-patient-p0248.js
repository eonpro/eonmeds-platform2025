#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkPatient() {
  try {
    // Check if patient P0248 exists
    const patient = await pool.query(
      'SELECT patient_id, first_name, last_name, email, stripe_customer_id, status FROM patients WHERE patient_id = $1',
      ['P0248']
    );

    console.log('Patient P0248:', patient.rows[0] || 'NOT FOUND');

    // Also check for Luis Pena
    const luis = await pool.query(
      `SELECT patient_id, first_name, last_name, email, stripe_customer_id, status 
       FROM patients 
       WHERE LOWER(first_name) = $1 AND LOWER(last_name) = $2`,
      ['luis', 'pena']
    );

    console.log('\nLuis Pena records:', luis.rows);

    // Check for danielexander89@hotmail.com
    const byEmail = await pool.query(
      'SELECT patient_id, first_name, last_name, email, stripe_customer_id, status FROM patients WHERE email = $1',
      ['danielexander89@hotmail.com']
    );

    console.log('\nPatient with email danielexander89@hotmail.com:', byEmail.rows);

    // Check invoices for P0248
    const invoices = await pool.query('SELECT * FROM invoices WHERE patient_id = $1', ['P0248']);

    console.log('\nInvoices for P0248:', invoices.rows.length, 'found');
    if (invoices.rows.length > 0) {
      console.log('Invoice details:', invoices.rows);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPatient();
