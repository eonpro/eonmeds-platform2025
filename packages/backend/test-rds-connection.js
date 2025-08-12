require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing RDS Database Connection...\n');

// Display connection info (hiding password)
console.log('Connection Details:');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`Port: ${process.env.DB_PORT}`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`User: ${process.env.DB_USER}`);
console.log(`SSL: ${process.env.DB_SSL}`);
console.log(`Password: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}\n`);

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

// Test connection
async function testConnection() {
  try {
    console.log('🔌 Attempting to connect to RDS...');
    const client = await pool.connect();

    console.log('✅ Successfully connected to RDS!\n');

    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('📊 Database Info:');
    console.log(`Current Time: ${result.rows[0].current_time}`);
    console.log(`PostgreSQL Version: ${result.rows[0].pg_version.split(',')[0]}`);

    // Check if eonmeds database exists
    const dbCheck = await client.query("SELECT datname FROM pg_database WHERE datname = 'eonmeds'");

    if (dbCheck.rows.length > 0) {
      console.log('\n✅ Database "eonmeds" exists');
    } else {
      console.log('\n⚠️  Database "eonmeds" does not exist yet');
      console.log('   You may need to create it or use the default "postgres" database');
    }

    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`\n📋 Tables in database: ${tablesResult.rows.length}`);
    if (tablesResult.rows.length > 0) {
      tablesResult.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('   No tables found. You need to run the schema.sql file.');
    }

    client.release();
    console.log('\n🎉 RDS connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tips:');
      console.error('1. Make sure you added the RDS configuration to your .env file');
      console.error('2. Check that your IP is allowed in the RDS security group');
      console.error('3. Verify the RDS instance is running');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Check that the DB_HOST is correct in your .env file');
    } else if (error.message.includes('password')) {
      console.error('\n💡 Check that DB_PASSWORD is correct in your .env file');
    }

    process.exit(1);
  }
}

testConnection();
