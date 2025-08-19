const { Client } = require('pg');

async function testConnection() {
  console.log('Testing database connection...');
  
  const client = new Client({
    host: 'eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com',
    port: 5432,
    database: 'postgres',  // Try default database first
    user: 'eonmeds_admin',
    password: '398Xakf$57',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test query
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('Database:', result.rows[0].current_database);
    console.log('User:', result.rows[0].current_user);
    console.log('Version:', result.rows[0].version);
    
    // List databases
    const dbs = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    console.log('\nAvailable databases:');
    dbs.rows.forEach(db => console.log(' -', db.datname));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();
