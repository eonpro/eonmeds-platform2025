const { Pool } = require("pg");

// Railway's DATABASE_URL from production
const DATABASE_URL =
  "postgresql://postgres:lrfKaBXxsqCKRWsVjJYfJNdsvbfBLjLD@viaduct.proxy.rlwy.net:25901/railway";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkRailwayDb() {
  try {
    console.log("Checking Railway/AWS RDS database...\n");

    // Check connection
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Connected to database at:", result.rows[0].now);

    // Check if tables exist
    const tables = ["invoices", "invoice_items", "invoice_payments"];

    for (const table of tables) {
      const result = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `,
        [table],
      );

      const exists = result.rows[0].exists;
      console.log(`Table ${table}: ${exists ? "✅ EXISTS" : "❌ MISSING"}`);
    }

    // If tables don't exist, show what tables DO exist
    const existingTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
      LIMIT 10;
    `);

    console.log("\nExisting tables in database:");
    existingTables.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkRailwayDb();
