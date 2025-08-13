const { Client } = require("pg");
require("dotenv").config();

async function createInvoicePaymentsTable() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL not found in environment variables");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    console.log("Connecting to database...");
    await client.connect();

    // Create invoice_payments table
    console.log("Creating invoice_payments table if not exists...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        payment_amount DECIMAL(10,2) NOT NULL,
        payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'completed',
        stripe_charge_id VARCHAR(255),
        stripe_payment_method_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    console.log("Creating indexes...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_payments_stripe_charge_id ON invoice_payments(stripe_charge_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_payments_status ON invoice_payments(status);
    `);

    console.log("✅ invoice_payments table created successfully!");

    // Verify the table exists
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_payments'
      ORDER BY ordinal_position;
    `);

    console.log("\nTable columns:");
    result.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
  } catch (err) {
    console.error("Error creating table:", err);
    process.exit(1);
  } finally {
    await client.end();
    console.log("\nDatabase connection closed.");
  }
}

// Run the script
createInvoicePaymentsTable();
