const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function addAddressColumns() {
  const client = await pool.connect();
  try {
    // Check if columns exist
    const checkColumns = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'patients' AND column_name IN ('address', 'city', 'state', 'zip')",
    );
    const existingColumns = checkColumns.rows.map((r) => r.column_name);

    // Add missing columns
    if (!existingColumns.includes("address")) {
      await client.query("ALTER TABLE patients ADD COLUMN address TEXT");
      console.log("✅ Added address column");
    } else {
      console.log("- address column already exists");
    }

    if (!existingColumns.includes("city")) {
      await client.query("ALTER TABLE patients ADD COLUMN city VARCHAR(100)");
      console.log("✅ Added city column");
    } else {
      console.log("- city column already exists");
    }

    if (!existingColumns.includes("state")) {
      await client.query("ALTER TABLE patients ADD COLUMN state VARCHAR(50)");
      console.log("✅ Added state column");
    } else {
      console.log("- state column already exists");
    }

    if (!existingColumns.includes("zip")) {
      await client.query("ALTER TABLE patients ADD COLUMN zip VARCHAR(20)");
      console.log("✅ Added zip column");
    } else {
      console.log("- zip column already exists");
    }

    console.log("\nAddress columns ready!");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

console.log("Checking/adding address columns to patients table...\n");
addAddressColumns();
