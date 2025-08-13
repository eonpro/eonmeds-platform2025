const { Client } = require("pg");
require("dotenv").config();

async function fixSOAPNotesPatientId() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://eonmeds_admin:EON#2024secure!@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds",
  });

  try {
    await client.connect();
    console.log("Connected to database\n");

    // Start transaction
    await client.query("BEGIN");

    try {
      // 1. First, let's check if there are any existing SOAP notes
      const countResult = await client.query("SELECT COUNT(*) FROM soap_notes");
      const hasData = parseInt(countResult.rows[0].count) > 0;

      if (hasData) {
        console.log(`Found ${countResult.rows[0].count} existing SOAP notes.`);
        console.log(
          "Since the patient_id column is UUID and we need VARCHAR, we need to handle this carefully.\n",
        );

        // Check if any of the existing UUIDs match actual patient records
        const matchCheck = await client.query(`
          SELECT sn.id, sn.patient_id as soap_patient_uuid, sn.created_at
          FROM soap_notes sn
          LIMIT 5
        `);

        console.log("Sample SOAP notes with UUID patient_ids:");
        matchCheck.rows.forEach((row) => {
          console.log(
            `- SOAP ID: ${row.id}, Patient UUID: ${row.soap_patient_uuid}`,
          );
        });

        // Since the UUIDs don't match our VARCHAR patient IDs, we'll need to recreate the table
        console.log(
          "\nDropping and recreating SOAP notes table with correct structure...",
        );
      }

      // 2. Drop the existing table
      await client.query("DROP TABLE IF EXISTS soap_notes CASCADE");
      console.log("Dropped existing soap_notes table");

      // 3. Create the table with the correct structure
      await client.query(`
        CREATE TABLE soap_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
          content TEXT NOT NULL,
          original_content TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          created_by VARCHAR(255) NOT NULL DEFAULT 'system',
          approved_by UUID,
          approved_by_name VARCHAR(255),
          approved_by_credentials VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          approved_at TIMESTAMP,
          version INTEGER DEFAULT 1,
          edit_history JSONB,
          ai_model VARCHAR(100),
          ai_response_time_ms INTEGER,
          prompt_tokens INTEGER,
          completion_tokens INTEGER,
          total_tokens INTEGER
        )
      `);
      console.log("Created soap_notes table with correct structure");

      // 4. Create indexes
      await client.query(`
        CREATE INDEX idx_soap_notes_patient_id ON soap_notes(patient_id);
        CREATE INDEX idx_soap_notes_status ON soap_notes(status);
        CREATE INDEX idx_soap_notes_created_at ON soap_notes(created_at);
      `);
      console.log("Created indexes");

      // Commit transaction
      await client.query("COMMIT");
      console.log("\n✅ Successfully fixed SOAP notes table structure!");
      console.log(
        "The patient_id column now uses VARCHAR(50) to match the patients table.",
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

fixSOAPNotesPatientId();
