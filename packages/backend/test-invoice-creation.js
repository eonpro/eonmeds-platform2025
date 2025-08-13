require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "eonmeds",
});

async function testInvoiceCreation() {
  try {
    console.log("Testing invoice creation process...\n");

    // 1. Check if invoice tables exist
    console.log("1. Checking tables...");
    const tables = ["invoices", "invoice_items", "invoice_payments"];
    for (const table of tables) {
      const result = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `,
        [table],
      );
      console.log(`   ${table}: ${result.rows[0].exists ? "✅" : "❌"}`);
    }

    // 2. Check if generate_invoice_number function exists
    console.log("\n2. Checking invoice number generator...");
    try {
      const result = await pool.query(
        "SELECT generate_invoice_number() as number",
      );
      console.log(`   ✅ Function exists, generated: ${result.rows[0].number}`);
    } catch (err) {
      console.log(`   ❌ Function missing: ${err.message}`);
    }

    // 3. Check if patient P0101 exists
    console.log("\n3. Checking patient P0101...");
    const patientResult = await pool.query(
      "SELECT patient_id, stripe_customer_id FROM patients WHERE patient_id = $1",
      ["P0101"],
    );
    if (patientResult.rows.length > 0) {
      console.log(
        `   ✅ Patient found: ${JSON.stringify(patientResult.rows[0])}`,
      );
    } else {
      console.log("   ❌ Patient P0101 not found");
    }

    // 4. Try to create a test invoice
    console.log("\n4. Testing invoice creation...");
    await pool.query("BEGIN");

    try {
      // Generate invoice number
      const invoiceNumResult = await pool.query(
        "SELECT generate_invoice_number() as number",
      );
      const invoiceNumber = invoiceNumResult.rows[0].number;
      console.log(`   Generated number: ${invoiceNumber}`);

      // Create invoice
      const invoiceResult = await pool.query(
        `INSERT INTO invoices (
          invoice_number, patient_id, stripe_customer_id,
          invoice_date, due_date, status, subtotal, total_amount,
          description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          invoiceNumber,
          "P0101",
          null,
          new Date(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          "open",
          100,
          100,
          "Test invoice",
        ],
      );

      console.log(`   ✅ Invoice created with ID: ${invoiceResult.rows[0].id}`);

      // Add line item
      await pool.query(
        `INSERT INTO invoice_items (
          invoice_id, description, quantity, unit_price, service_type, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          invoiceResult.rows[0].id,
          "Test Service",
          1,
          100,
          "test",
          JSON.stringify({ service_package_id: "1" }),
        ],
      );

      console.log("   ✅ Line item added successfully");

      await pool.query("ROLLBACK"); // Don't actually save the test
      console.log("\n✅ Invoice creation test passed! (rolled back)");
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error("\n❌ Invoice creation failed:", error.message);
      console.error("Full error:", error);
    }
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    await pool.end();
  }
}

testInvoiceCreation();
