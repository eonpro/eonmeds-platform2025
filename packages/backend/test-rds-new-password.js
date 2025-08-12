const { Pool } = require('pg');
require('dotenv').config();

// Create a new pool with the connection details
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000, // 10 second timeout
});

async function testConnection() {
  console.log('🔍 Testing RDS connection with new password...');
  console.log(`📍 Host: ${process.env.DB_HOST}`);
  console.log(`👤 User: ${process.env.DB_USER}`);
  console.log(`📊 Database: ${process.env.DB_NAME}`);
  console.log(
    `🔑 Password: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'NOT SET'}`
  );
  console.log('');

  try {
    // Test basic connection
    console.log('📡 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to RDS!');

    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`⏰ Server time: ${result.rows[0].current_time}`);
    console.log(`📦 PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}`);

    // Check if we can query the database
    const dbResult = await client.query(`
      SELECT current_database() as database_name,
             current_user as connected_as
    `);
    console.log(`📁 Connected to database: ${dbResult.rows[0].database_name}`);
    console.log(`👤 Connected as user: ${dbResult.rows[0].connected_as}`);

    // List tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('\n📋 Tables in database:');
    if (tablesResult.rows.length === 0) {
      console.log('   ⚠️  No tables found - you need to run the schema.sql file');
    } else {
      tablesResult.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
    }

    client.release();
    console.log('\n✅ All connection tests passed!');
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error details:', error.message);

    if (error.message.includes('password authentication failed')) {
      console.error('\n🔐 Password authentication failed - the password might be incorrect');
      console.error('   Please verify the password in AWS RDS console');
    } else if (error.message.includes('timeout')) {
      console.error('\n⏱️  Connection timeout - check your security group settings');
      console.error('   Make sure your IP address is allowed in the RDS security group');
    }
  } finally {
    await pool.end();
  }
}

testConnection();
