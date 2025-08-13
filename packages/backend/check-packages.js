const { Pool } = require("pg");
require("dotenv").config();

async function checkPackages() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    console.log("Fetching service packages...\n");

    const result = await pool.query(
      "SELECT * FROM service_packages ORDER BY category, price",
    );

    console.log(`Found ${result.rows.length} packages:\n`);

    result.rows.forEach((pkg) => {
      console.log(`📦 ${pkg.name}`);
      console.log(`   Category: ${pkg.category}`);
      console.log(`   Price: $${pkg.price}`);
      console.log(`   Billing: ${pkg.billing_period}`);
      console.log(`   Active: ${pkg.is_active ? "✅" : "❌"}`);
      console.log("");
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

checkPackages();
