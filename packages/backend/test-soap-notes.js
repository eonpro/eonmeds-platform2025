const { Client } = require("pg");
require("dotenv").config();

async function testSOAPNotes() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://eonmeds_admin:EON#2024secure!@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds",
  });

  try {
    await client.connect();
    console.log("Testing SOAP notes functionality...\n");

    // 1. Test if we can query SOAP notes for patient P0244 (Glenda)
    console.log("1. Testing query for patient P0244:");
    try {
      const result = await client.query(
        "SELECT * FROM soap_notes WHERE patient_id = $1",
        ["P0244"],
      );
      console.log("Query successful. Found", result.rows.length, "SOAP notes");
    } catch (err) {
      console.error("Query error:", err.message);
    }

    // 2. Check table constraints
    console.log("\n2. Checking table constraints:");
    const constraints = await client.query(`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'soap_notes'
    `);

    constraints.rows.forEach((c) => {
      console.log(
        `- ${c.constraint_name}: ${c.constraint_type} on ${c.column_name}`,
      );
      if (c.foreign_table_name) {
        console.log(
          `  References: ${c.foreign_table_name}.${c.foreign_column_name}`,
        );
      }
    });

    // 3. Check if patient P0244 exists
    console.log("\n3. Checking if patient P0244 exists:");
    const patientCheck = await client.query(
      "SELECT patient_id, first_name, last_name FROM patients WHERE patient_id = $1",
      ["P0244"],
    );

    if (patientCheck.rows.length > 0) {
      console.log("Patient found:", patientCheck.rows[0]);
    } else {
      console.log("Patient P0244 NOT FOUND!");
    }

    // 4. Test insert if patient exists
    if (patientCheck.rows.length > 0) {
      console.log("\n4. Testing insert with patient P0244:");
      try {
        const insertResult = await client.query(
          `
          INSERT INTO soap_notes (patient_id, content, status, created_by)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `,
          ["P0244", "Test SOAP note", "pending", "system"],
        );

        console.log(
          "Insert successful! SOAP note ID:",
          insertResult.rows[0].id,
        );

        // Clean up test data
        await client.query("DELETE FROM soap_notes WHERE id = $1", [
          insertResult.rows[0].id,
        ]);
        console.log("Test data cleaned up");
      } catch (err) {
        console.error("Insert error:", err.message);
        console.error("Error detail:", err.detail);
        console.error("Error hint:", err.hint);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

testSOAPNotes();
