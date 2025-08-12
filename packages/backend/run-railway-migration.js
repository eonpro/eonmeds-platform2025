const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Railway's PostgreSQL connection
const DATABASE_URL =
  'postgresql://postgres:lrfKaBXxsqCKRWsVjJYfJNdsvbfBLjLD@viaduct.proxy.rlwy.net:25901/railway';

async function runRailwayMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🚀 Starting invoice migration on Railway PostgreSQL...\n');

    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected to Railway database at:', testResult.rows[0].now);

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'src/config/invoice-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL statements properly
    const statements = [];
    let currentStatement = '';
    let inFunction = false;

    const lines = sql.split('\n');
    for (const line of lines) {
      currentStatement += line + '\n';

      if (line.includes('$$')) {
        inFunction = !inFunction;
      }

      if (line.trim().endsWith(';') && !inFunction) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const firstLine = statement.split('\n')[0].substring(0, 50);

      try {
        await pool.query(statement);
        console.log(`✅ [${i + 1}/${statements.length}] ${firstLine}...`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⏭️  [${i + 1}/${statements.length}] ${firstLine}... (already exists)`);
        } else {
          console.error(`❌ [${i + 1}/${statements.length}] Failed:`, err.message);
          throw err;
        }
      }
    }

    // Verify tables were created
    console.log('\n🔍 Verifying migration...\n');

    const tables = ['invoices', 'invoice_items', 'invoice_payments'];
    for (const table of tables) {
      const result = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `,
        [table]
      );

      const exists = result.rows[0].exists;
      console.log(`Table ${table}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    // Test invoice number generation
    const testInvoice = await pool.query('SELECT generate_invoice_number() as number');
    console.log(`\n✅ Invoice number generation test: ${testInvoice.rows[0].number}`);

    console.log('\n🎉 Railway database migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runRailwayMigration();
