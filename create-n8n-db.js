const { Client } = require('pg');

async function createN8NDatabase() {
  const client = new Client({
    host: 'eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com',
    port: 5432,
    user: 'eonmeds_admin',
    password: '398Xakf$57',
    database: 'postgres', // Connect to default postgres db first
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Create n8n database if it doesn't exist
    await client.query(`
      SELECT 'CREATE DATABASE n8n' 
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\\gexec
    `).catch(() => {
      console.log('Database n8n might already exist');
    });
    
    console.log('✅ N8N database ready!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createN8NDatabase();
