const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function runSOAPNotesFix() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://eonmeds_admin:EON#2024secure!@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds",
  });

  try {
    await client.connect();
    console.log("Connected to database\n");

    // Read the SQL file
    const sqlPath = path.join(__dirname, "src/config/fix-soap-notes-table.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    console.log("Running SOAP notes table fix...\n");

    // Execute the SQL
    await client.query(sqlContent);

    console.log("✅ SOAP notes table structure fixed successfully!");
    console.log(
      "The table now uses VARCHAR(50) for patient_id to match the patients table.",
    );

    // Verify the fix
    console.log("\nVerifying the fix...");
    const columnCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'soap_notes' AND column_name = 'patient_id'
    `);

    if (columnCheck.rows.length > 0) {
      console.log(`patient_id column type: ${columnCheck.rows[0].data_type}`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

runSOAPNotesFix();
