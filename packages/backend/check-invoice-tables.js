require('dotenv').config();
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'eonmeds'
});

async function checkInvoiceTables() {
  try {
    console.log('Checking invoice tables...\n');
    
    // Check if tables exist
    const tables = ['invoices', 'invoice_items', 'invoice_payments'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      const exists = result.rows[0].exists;
      console.log(`Table ${table}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }
    
    // Check invoice count
    try {
      const countResult = await pool.query('SELECT COUNT(*) FROM invoices');
      console.log(`\nTotal invoices in database: ${countResult.rows[0].count}`);
    } catch (err) {
      console.log('\nCould not count invoices (table might not exist)');
    }
    
  } catch (error) {
    console.error('Error checking database:', error.message);
  } finally {
    await pool.end();
  }
}

checkInvoiceTables(); 