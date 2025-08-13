const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createInvoicePaymentsTable() {
  console.log("🔄 Creating invoice_payments table...");

  try {
    // Create the invoice_payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES invoices(id),
        
        -- Payment details
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
        
        -- Stripe references
        stripe_payment_intent_id VARCHAR(255),
        stripe_charge_id VARCHAR(255),
        
        -- Status
        status VARCHAR(50) NOT NULL DEFAULT 'succeeded',
        failure_reason TEXT,
        
        -- Metadata
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ invoice_payments table created successfully!");

    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_invoice ON invoice_payments(invoice_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_date ON invoice_payments(payment_date);
    `);

    console.log("✅ Indexes created successfully!");

    // Verify the table exists
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_payments'
      ORDER BY ordinal_position;
    `);

    console.log("\n📋 invoice_payments table structure:");
    result.rows.forEach((col) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
  } catch (error) {
    console.error("❌ Error creating invoice_payments table:", error.message);
  } finally {
    await pool.end();
  }
}

createInvoicePaymentsTable();
