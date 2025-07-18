require('dotenv').config();
const { Pool } = require('pg');

async function checkInvoiceTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Checking invoice tables...\n');
    
    // Check if tables exist
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('invoices', 'invoice_items', 'invoice_payments')
      ORDER BY table_name;
    `);
    
    console.log('Tables found:');
    tableCheck.rows.forEach(row => {
      console.log(`✅ ${row.table_name}`);
    });
    
    if (tableCheck.rows.length < 3) {
      console.log('\n❌ Missing tables! Run the invoice schema SQL to create them.');
      console.log('Run: psql $DATABASE_URL < src/config/invoice-schema.sql');
    }
    
    // Check if function exists
    const funcCheck = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'generate_invoice_number';
    `);
    
    if (funcCheck.rows.length > 0) {
      console.log('\n✅ generate_invoice_number function exists');
      
      // Test the function
      const testResult = await pool.query('SELECT generate_invoice_number() as number');
      console.log(`   Test invoice number: ${testResult.rows[0].number}`);
    } else {
      console.log('\n❌ generate_invoice_number function NOT found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkInvoiceTables(); 