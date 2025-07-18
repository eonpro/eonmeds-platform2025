const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to database...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database');

    // Read and run the service packages SQL
    const sqlPath = path.join(__dirname, 'src/config/service-packages-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running service packages migration...');
    await pool.query(sql);
    console.log('✅ Service packages table created and populated!');

    // Also run the payments table SQL if it exists
    const paymentsPath = path.join(__dirname, 'src/config/add-payments-table.sql');
    if (fs.existsSync(paymentsPath)) {
      console.log('Running payments table migration...');
      const paymentsSql = fs.readFileSync(paymentsPath, 'utf8');
      await pool.query(paymentsSql);
      console.log('✅ Payments table created!');
    }

    console.log('\n🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running migrations:', error);
  } finally {
    await pool.end();
  }
}

runMigrations(); 