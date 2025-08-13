require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

async function updatePatientIds() {
  const client = await pool.connect();

  try {
    console.log("Starting patient ID update...");

    // First, get all patients ordered by created_at
    const result = await client.query(`
      SELECT id, patient_id, created_at 
      FROM patients 
      ORDER BY created_at ASC
    `);

    console.log(`Found ${result.rows.length} patients to update`);

    // Start transaction
    await client.query("BEGIN");

    // Update each patient with new ID format
    let counter = 1;
    for (const patient of result.rows) {
      const newPatientId = `P${String(counter).padStart(4, "0")}`;

      await client.query("UPDATE patients SET patient_id = $1 WHERE id = $2", [
        newPatientId,
        patient.id,
      ]);

      console.log(`Updated ${patient.patient_id} -> ${newPatientId}`);
      counter++;
    }

    // Commit transaction
    await client.query("COMMIT");
    console.log("\nSuccessfully updated all patient IDs!");
  } catch (error) {
    // Rollback on error
    await client.query("ROLLBACK");
    console.error("Error updating patient IDs:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updatePatientIds();
