const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

async function initDatabase() {
  try {
    console.log('🚀 Initializing database...');
    console.log('📡 Connecting to:', process.env.DB_HOST);
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database!');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'src/config/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Running schema.sql...');
    await pool.query(schema);
    
    console.log('✅ Database initialized successfully!');
    console.log('📊 Tables created:');
    console.log('  - roles');
    console.log('  - users');
    console.log('  - patients');
    console.log('  - webhook_events');
    console.log('  - weight_loss_intake');
    console.log('  - And more...');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

initDatabase(); 