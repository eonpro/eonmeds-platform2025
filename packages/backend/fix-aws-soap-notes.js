const { Pool } = require("pg");

// AWS RDS connection
const pool = new Pool({
  host: "eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com",
  port: 5432,
  database: "eonmeds",
  user: "eonmeds_admin",
  password: ".S:wbEHBnOcnqlyFa9[RxnMC99]I",
  ssl: { rejectUnauthorized: false },
});

async function fixSoapNotesTable() {
  try {
    console.log("Connecting to AWS RDS database...");

    // Drop the existing constraint
    console.log("Dropping existing constraint...");
    await pool.query(
      "ALTER TABLE soap_notes DROP CONSTRAINT IF EXISTS soap_notes_patient_id_fkey",
    );

    // Change column type
    console.log("Changing patient_id column type to VARCHAR(50)...");
    await pool.query(
      "ALTER TABLE soap_notes ALTER COLUMN patient_id TYPE VARCHAR(50) USING patient_id::VARCHAR(50)",
    );

    // Add the constraint back
    console.log("Adding foreign key constraint...");
    await pool.query(`
      ALTER TABLE soap_notes ADD CONSTRAINT soap_notes_patient_id_fkey 
      FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
    `);

    // Verify the fix
    console.log("Verifying the fix...");
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'soap_notes' AND column_name = 'patient_id'
    `);

    console.log("\n✅ SOAP notes table fixed successfully!");
    console.log("Patient ID column:", result.rows[0]);
  } catch (error) {
    console.error("❌ Error fixing SOAP notes table:", error.message);
    if (error.detail) console.error("Detail:", error.detail);
  } finally {
    await pool.end();
  }
}

fixSoapNotesTable();
