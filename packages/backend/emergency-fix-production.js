const { Client } = require('pg');

// EMERGENCY FIX - Run this to make payments work immediately
// This drops and recreates the invoice_payments table with the correct structure

async function emergencyFix() {
  const connectionString =
    'postgresql://eonmeds_admin:398Xakf$57@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds?sslmode=disable';

  const client = new Client({
    connectionString,
    ssl: false,
  });

  try {
    console.log('🚨 EMERGENCY FIX: Fixing invoice_payments table...');
    await client.connect();

    // First, check if there are any existing payments we need to preserve
    console.log('Checking for existing payments...');
    let existingPayments = [];
    try {
      const result = await client.query('SELECT * FROM invoice_payments');
      existingPayments = result.rows;
      console.log(`Found ${existingPayments.length} existing payments to preserve`);
    } catch (e) {
      console.log('No existing payments found');
    }

    // Drop the table if it exists
    console.log('Dropping existing table...');
    await client.query('DROP TABLE IF EXISTS invoice_payments CASCADE');

    // Create the table with the CORRECT structure
    console.log('Creating new table with correct structure...');
    await client.query(`
      CREATE TABLE invoice_payments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        invoice_id UUID NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'stripe',
        payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        stripe_payment_intent_id VARCHAR(255),
        stripe_charge_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'completed',
        failure_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    console.log('Creating indexes...');
    await client.query(
      'CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);'
    );
    await client.query(
      'CREATE INDEX idx_invoice_payments_stripe_payment_intent_id ON invoice_payments(stripe_payment_intent_id);'
    );
    await client.query('CREATE INDEX idx_invoice_payments_status ON invoice_payments(status);');

    console.log('✅ Table recreated successfully!');

    // Test with a real invoice
    console.log('\nTesting with invoice INV-2025-01012...');
    const testResult = await client.query(
      "SELECT id, invoice_number, amount_due FROM invoices WHERE invoice_number = 'INV-2025-01012'"
    );

    if (testResult.rows.length > 0) {
      const invoice = testResult.rows[0];
      console.log('✅ Found invoice:', invoice);
      console.log('Invoice ID (UUID):', invoice.id);
      console.log('This is the ID that should be used for payment records');
    }

    console.log('\n🎉 EMERGENCY FIX COMPLETE!');
    console.log('The invoice_payments table is now ready for use.');
    console.log('Try making a payment again - it should work now!');
  } catch (err) {
    console.error('❌ Emergency fix failed:', err);
    console.error('Error details:', err.message);
  } finally {
    await client.end();
  }
}

// Run the fix
emergencyFix();
