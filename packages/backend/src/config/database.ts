import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create PostgreSQL connection pool
export const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('ssl=true') ? {
        rejectUnauthorized: false
      } : false
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'eonmeds',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 10000, // Increase timeout to 10 seconds for Railway
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false
    });

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't exit the process - let the service continue running
  // This allows health checks to report the issue without crashing
});

// Helper function to test the connection
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Query helper function
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
} 