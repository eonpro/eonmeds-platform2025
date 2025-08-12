const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runInvoiceSchema() {
  console.log('🔄 Running invoice schema migration...');

  try {
    // Read the invoice schema SQL file
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'src/config/invoice-schema.sql'),
      'utf8'
    );

    // Execute the schema
    await pool.query(schemaSQL);

    console.log('✅ Invoice tables created/updated successfully!');

    // Check if invoice_payments table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_payments'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ invoice_payments table confirmed to exist');
    } else {
      console.log('❌ invoice_payments table not found');
    }
  } catch (error) {
    console.error('❌ Error running invoice schema:', error);
  } finally {
    await pool.end();
  }
}

runInvoiceSchema();
