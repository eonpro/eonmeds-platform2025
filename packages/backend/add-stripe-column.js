require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function addStripeColumn() {
  try {
    console.log('Adding stripe_customer_id column to patients table...');

    await pool.query(`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)
    `);

    console.log('✅ Column added successfully!');

    // Verify it was added
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      AND column_name = 'stripe_customer_id'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: stripe_customer_id column exists');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addStripeColumn();
