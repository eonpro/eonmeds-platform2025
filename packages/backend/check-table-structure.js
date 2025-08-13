const { Client } = require("pg");
require("dotenv").config();

async function checkTableStructure() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://eonmeds_admin:398Xakf$57@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds?sslmode=disable";

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

    // Check invoices table structure
    console.log("\n=== INVOICES TABLE STRUCTURE ===");
    const invoicesResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoices'
      ORDER BY ordinal_position
      LIMIT 10;
    `);

    console.log("Key columns:");
    invoicesResult.rows.forEach((row) => {
      console.log(
        `  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`,
      );
    });

    // Check invoice_payments table structure
    console.log("\n=== INVOICE_PAYMENTS TABLE STRUCTURE ===");
    const paymentsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoice_payments'
      ORDER BY ordinal_position;
    `);

    console.log("All columns:");
    paymentsResult.rows.forEach((row) => {
      console.log(
        `  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`,
      );
    });

    // Check if there's a mismatch
    const invoiceIdType = invoicesResult.rows.find(
      (r) => r.column_name === "id",
    )?.data_type;
    const paymentInvoiceIdType = paymentsResult.rows.find(
      (r) => r.column_name === "invoice_id",
    )?.data_type;

    console.log("\n=== TYPE MISMATCH CHECK ===");
    console.log(`invoices.id type: ${invoiceIdType}`);
    console.log(`invoice_payments.invoice_id type: ${paymentInvoiceIdType}`);

    if (invoiceIdType !== paymentInvoiceIdType) {
      console.log("\n❌ TYPE MISMATCH DETECTED!");
      console.log(
        "This is causing the 500 error when inserting payment records.",
      );
    } else {
      console.log("\n✅ Types match correctly.");
    }
  } catch (err) {
    console.error("Error checking tables:", err);
    process.exit(1);
  } finally {
    await client.end();
    console.log("\nDatabase connection closed.");
  }
}

// Run the script
checkTableStructure();
