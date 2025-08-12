require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'patients'
      ORDER BY ordinal_position;
    `);

    console.log('Patients table columns:');
    console.log('======================');
    result.rows.forEach((col) => {
      console.log(
        `- ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`
      );
    });

    // Check sample patient data
    const sample = await pool.query('SELECT * FROM patients LIMIT 1');
    if (sample.rows.length > 0) {
      console.log('\nSample patient columns:');
      console.log(Object.keys(sample.rows[0]));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkColumns();
