const { Client } = require("pg");
require("dotenv").config();

async function checkSOAPNotesTable() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://eonmeds_admin:EON#2024secure!@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds",
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // Check if soap_notes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'soap_notes'
      )
    `);

    console.log("SOAP notes table exists:", tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log("Creating SOAP notes table...");

      // Create the table
      await client.query(`
        CREATE TABLE IF NOT EXISTS soap_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
          content TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          version INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          created_by VARCHAR(255),
          approved_at TIMESTAMP,
          approved_by VARCHAR(255),
          approved_by_name VARCHAR(255),
          approved_by_credentials VARCHAR(100),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create index for better performance
      await client.query(`
        CREATE INDEX idx_soap_notes_patient_id ON soap_notes(patient_id);
        CREATE INDEX idx_soap_notes_status ON soap_notes(status);
      `);

      console.log("SOAP notes table created successfully");
    } else {
      // Check table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'soap_notes'
        ORDER BY ordinal_position
      `);

      console.log("\nSOAP notes table columns:");
      columns.rows.forEach((col) => {
        console.log(
          `- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`,
        );
      });
    }

    // Check for any SOAP notes
    const countResult = await client.query("SELECT COUNT(*) FROM soap_notes");
    console.log("\nTotal SOAP notes in database:", countResult.rows[0].count);

    // Check for any recent errors
    const recentNotes = await client.query(`
      SELECT patient_id, status, created_at 
      FROM soap_notes 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (recentNotes.rows.length > 0) {
      console.log("\nRecent SOAP notes:");
      recentNotes.rows.forEach((note) => {
        console.log(
          `- Patient: ${note.patient_id}, Status: ${note.status}, Created: ${note.created_at}`,
        );
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

checkSOAPNotesTable();
