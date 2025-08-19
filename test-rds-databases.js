const { Client } = require('pg');

async function listDatabases() {
  const client = new Client({
    host: 'eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com',
    port: 5432,
    user: 'eonmeds_admin',
    password: '398Xakf$57',
    database: 'postgres',  // Connect to default database
    ssl: {
      rejectUnauthorized: false  // For AWS RDS
    }
  });

  try {
    console.log('🔄 Connecting to AWS RDS...');
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    // Get current connection info
    const connInfo = await client.query('SELECT current_database(), current_user');
    console.log('Current Database:', connInfo.rows[0].current_database);
    console.log('Current User:', connInfo.rows[0].current_user);
    console.log('');
    
    // List all databases
    const result = await client.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `);
    
    console.log('📁 Available Databases:');
    result.rows.forEach(row => {
      console.log(`   - ${row.datname}`);
    });
    
    // Check if eonmeds database exists
    const eonmedsExists = result.rows.some(row => row.datname === 'eonmeds');
    if (!eonmedsExists) {
      console.log('\n⚠️  Note: "eonmeds" database does not exist');
      console.log('   You may need to create it or use one of the databases above');
    }
    
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
    console.error('   Error Code:', error.code);
    
    if (error.message.includes('certificate')) {
      console.log('\n💡 SSL Certificate Issue - Try these N8N settings:');
      console.log('   - SSL: Require');
      console.log('   - Ignore SSL Issues: ON');
    }
  } finally {
    await client.end();
  }
}

// Check if pg is installed
try {
  require('pg');
  listDatabases();
} catch (error) {
  console.log('Installing pg package...');
  require('child_process').execSync('npm install pg', { stdio: 'inherit' });
  listDatabases();
}
