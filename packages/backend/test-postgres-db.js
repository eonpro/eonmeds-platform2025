require("dotenv").config();
const { Pool } = require("pg");

console.log("🔍 Testing RDS Connection to postgres database first...\n");

// First try connecting to the default 'postgres' database
const testPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: "postgres", // Default database
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

async function testConnection() {
  try {
    console.log("🔌 Attempting to connect to default postgres database...");
    const client = await testPool.connect();

    console.log("✅ Successfully connected to RDS!\n");

    // Check if eonmeds database exists
    const dbCheck = await client.query(
      "SELECT datname FROM pg_database WHERE datname = 'eonmeds'",
    );

    if (dbCheck.rows.length > 0) {
      console.log('✅ Database "eonmeds" exists');
    } else {
      console.log('⚠️  Database "eonmeds" does not exist');
      console.log('\n📝 Creating database "eonmeds"...');

      try {
        await client.query("CREATE DATABASE eonmeds");
        console.log('✅ Database "eonmeds" created successfully!');
      } catch (createError) {
        if (createError.code === "42P04") {
          console.log("ℹ️  Database already exists");
        } else {
          console.error("❌ Error creating database:", createError.message);
        }
      }
    }

    client.release();
    await testPool.end();

    console.log(
      "\n🎉 Connection test successful! You can now use the eonmeds database.",
    );
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Connection failed:", error.message);

    if (error.message.includes("password")) {
      console.error("\n💡 Password authentication failed. Please check:");
      console.error(
        "1. The DB_PASSWORD in your .env file matches the RDS master password",
      );
      console.error("2. The password doesn't have any encoding issues");
      console.error("3. Try resetting the RDS master password in AWS console");
    }

    process.exit(1);
  }
}

testConnection();
