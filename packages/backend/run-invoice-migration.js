require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function runInvoiceMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    console.log("🚀 Running invoice schema migration...\n");

    // Read the SQL file
    const sqlPath = path.join(__dirname, "src/config/invoice-schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Execute the SQL
    await pool.query(sql);

    console.log("✅ Invoice tables created successfully!");
    console.log("✅ Invoice number function created!");
    console.log("✅ Triggers and sequences set up!");

    // Verify tables were created
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('invoices', 'invoice_items', 'invoice_payments')
      ORDER BY table_name;
    `);

    console.log("\n📋 Tables created:");
    tableCheck.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });

    // Test invoice number generation
    const testResult = await pool.query(
      "SELECT generate_invoice_number() as number",
    );
    console.log(`\n🧪 Test invoice number: ${testResult.rows[0].number}`);

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
  } finally {
    await pool.end();
  }
}

runInvoiceMigration();
