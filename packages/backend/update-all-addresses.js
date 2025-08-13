const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function updateAllAddresses() {
  const client = await pool.connect();

  try {
    // Get ALL patients with their webhook data
    const result = await client.query(`
      SELECT p.id, p.patient_id, p.first_name, p.last_name, we.payload
      FROM patients p
      LEFT JOIN webhook_events we ON p.heyflow_submission_id = we.webhook_id
      WHERE we.payload IS NOT NULL
    `);

    console.log(
      `Found ${result.rows.length} patients to check for address updates\n`,
    );

    let updateCount = 0;

    for (const row of result.rows) {
      const fields = row.payload?.fields || {};

      // Extract address components
      const address = fields.address || null;
      const city = fields["address [city]"] || null;
      const state = fields["address [state]"] || null;
      const zip = fields["address [zip]"] || null;

      // Update patient
      const updateResult = await client.query(
        `
        UPDATE patients 
        SET 
          address = COALESCE($1, address),
          city = COALESCE($2, city),
          state = COALESCE($3, state),
          zip = COALESCE($4, zip),
          updated_at = NOW()
        WHERE id = $5
        RETURNING address, city, state, zip
      `,
        [address, city, state, zip, row.id],
      );

      if (address || city || state || zip) {
        console.log(
          `✅ Updated ${row.first_name} ${row.last_name} (${row.patient_id})`,
        );
        console.log(`   Address: ${address || "N/A"}`);
        console.log(
          `   City: ${city || "N/A"}, State: ${state || "N/A"}, ZIP: ${zip || "N/A"}\n`,
        );
        updateCount++;
      }
    }

    console.log(
      `\n✅ Update complete! Updated ${updateCount} patients with address data.`,
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

console.log("Updating ALL patient addresses from webhook data...\n");
updateAllAddresses();
