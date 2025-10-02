import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runBillingSystemMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Starting billing system migration...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../db/migrations/create-billing-system-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    console.log('📊 Creating billing system tables...');
    await pool.query(migrationSQL);

    // Verify tables were created
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'billing_plans', 
        'subscriptions', 
        'transactions', 
        'payment_methods',
        'subscription_items',
        'usage_records',
        'coupons',
        'applied_coupons',
        'financial_summary'
      )
      ORDER BY table_name;
    `;

    const result = await pool.query(tableCheckQuery);
    console.log('\n✅ Successfully created tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Check if views were created
    const viewCheckQuery = `
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public' 
      AND viewname IN ('monthly_recurring_revenue', 'revenue_by_plan');
    `;

    const viewResult = await pool.query(viewCheckQuery);
    console.log('\n✅ Successfully created views:');
    viewResult.rows.forEach(row => {
      console.log(`   - ${row.viewname}`);
    });

    console.log('\n🎉 Billing system migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your .env file with Stripe API keys');
    console.log('   2. Add the billing routes to your Express app');
    console.log('   3. Test the API endpoints');
    console.log('   4. Set up Stripe webhooks');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runBillingSystemMigration();
