const { Pool } = require('pg');

// Direct connection without env variables to test if password works
const pool = new Pool({
  host: 'eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com',
  port: 5432,
  database: 'eonmeds',
  user: 'eonmeds_admin',
  password: '398Xakf$57',  // New password directly
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
});

async function testConnection() {
  console.log('🔍 Testing RDS connection with hardcoded credentials...');
  console.log('📍 Host: eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com');
  console.log('👤 User: eonmeds_admin');
  console.log('📊 Database: eonmeds');
  console.log('🔑 Password: 398Xakf$57');
  console.log('');

  try {
    console.log('📡 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to RDS!');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`⏰ Server time: ${result.rows[0].current_time}`);
    
    client.release();
    console.log('\n✅ Connection successful with new password!');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.error('\n🔐 The password might not have been updated in RDS yet.');
      console.error('   It can take a few minutes for password changes to take effect.');
      console.error('   Or the password might need to be set differently in AWS console.');
    }
  } finally {
    await pool.end();
  }
}

testConnection(); 