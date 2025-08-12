require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runAWSInvoiceMigration() {
  // Use the production DATABASE_URL from your .env file
  const connectionString = process.env.DATABASE_URL || process.env.PRODUCTION_DATABASE_URL;

  if (!connectionString) {
    console.error('❌ No DATABASE_URL found in environment variables!');
    console.error('Please make sure your .env file contains the AWS RDS connection string.');
    process.exit(1);
  }

  console.log('🔗 Connecting to AWS RDS PostgreSQL...');
  console.log(`   Host: ${connectionString.split('@')[1]?.split('/')[0] || 'unknown'}`);

  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false, // AWS RDS requires SSL
    },
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to AWS RDS successfully!\n');

    console.log('🚀 Running invoice schema migration...\n');

    // Read the SQL file
    let sqlPath = path.join(__dirname, 'railway-invoice-setup.sql');
    if (!fs.existsSync(sqlPath)) {
      // Try alternative path
      const altPath = path.join(__dirname, 'src/config/invoice-schema.sql');
      if (fs.existsSync(altPath)) {
        sqlPath = altPath;
      } else {
        throw new Error('Could not find invoice schema SQL file');
      }
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ Invoice tables created successfully!');
    console.log('✅ Invoice number function created!');
    console.log('✅ Triggers and sequences set up!');

    // Verify tables were created
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('invoices', 'invoice_items', 'invoice_payments')
      ORDER BY table_name;
    `);

    console.log('\n📋 Tables created:');
    tableCheck.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });

    // Test invoice number generation
    const testResult = await pool.query('SELECT generate_invoice_number() as number');
    console.log(`\n🧪 Test invoice number: ${testResult.rows[0].number}`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('Your invoice system is now ready to use!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n💡 It looks like some tables already exist. This is usually fine.');
      console.log(
        '   The migration uses CREATE TABLE IF NOT EXISTS, so existing tables are preserved.'
      );
    }
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
runAWSInvoiceMigration();
