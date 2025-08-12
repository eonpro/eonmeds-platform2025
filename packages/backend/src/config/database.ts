import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug log the configuration
console.log('Database configuration:', {
  hasDbUrl: !!process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  hasPassword: !!process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL,
});

// Create PostgreSQL connection pool
export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false } // For production, allow self-signed certificates
          : false, // For development, disable SSL entirely
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
      ssl:
        process.env.DB_SSL === 'true' && process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false } // For production with SSL
          : false, // For development or when SSL is disabled
    });

// Test database connection with timeout
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't exit the process - let the service continue running
  // This allows health checks to report the issue without crashing
});

// Helper function to test the connection with timeout
export async function testDatabaseConnection() {
  try {
    // Set a timeout for the connection test
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    );

    const connectionPromise = (async () => {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('Database connection test successful:', result.rows[0]);
      return true;
    })();

    // Race between connection and timeout
    return await Promise.race([connectionPromise, timeoutPromise]);
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

export async function ensureSOAPNotesTable() {
  try {
    // Check if soap_notes table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'soap_notes'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating soap_notes table...');

      await pool.query(`
        CREATE TABLE soap_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id VARCHAR(20) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          original_content TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          created_by VARCHAR(255) NOT NULL DEFAULT 'system',
          approved_by UUID,
          approved_by_name VARCHAR(255),
          approved_by_credentials VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          approved_at TIMESTAMP,
          version INTEGER DEFAULT 1,
          edit_history JSONB,
          ai_model VARCHAR(100),
          ai_response_time_ms INTEGER,
          prompt_tokens INTEGER,
          completion_tokens INTEGER,
          total_tokens INTEGER
        )
      `);

      // Add indexes
      await pool.query('CREATE INDEX idx_soap_notes_patient_id ON soap_notes(patient_id)');
      await pool.query('CREATE INDEX idx_soap_notes_created_at ON soap_notes(created_at)');
      await pool.query('CREATE INDEX idx_soap_notes_status ON soap_notes(status)');

      console.log('✅ Created soap_notes table with correct schema for BECCA AI');
    }
  } catch (error) {
    console.error('Error ensuring soap_notes table:', error);
  }
}
