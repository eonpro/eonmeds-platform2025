#!/usr/bin/env node

/**
 * Run HIPAA Audit Tables Migration
 * This script creates all necessary tables for HIPAA compliance
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  console.log('🔒 Running HIPAA Audit Tables Migration...');
  console.log('=====================================');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'src/db/migrations/hipaa-audit-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons but keep them for execution
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue;
      
      // Get the first meaningful line for logging
      const firstLine = statement
        .split('\n')
        .find(line => line.trim() && !line.trim().startsWith('--'));
      
      if (firstLine) {
        console.log(`\nExecuting: ${firstLine.trim().substring(0, 50)}...`);
        
        try {
          await pool.query(statement);
          console.log('✅ Success');
        } catch (err) {
          // Some statements might fail if objects already exist, that's okay
          if (err.message.includes('already exists')) {
            console.log('⚠️  Already exists (skipping)');
          } else {
            console.error('❌ Error:', err.message);
          }
        }
      }
    }
    
    // Verify tables were created
    console.log('\n📋 Verifying HIPAA tables...');
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'hipaa_%'
      ORDER BY table_name;
    `);
    
    console.log('\nHIPAA Tables Created:');
    tableCheck.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    
    // Check for views
    const viewCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'hipaa_%'
      ORDER BY table_name;
    `);
    
    if (viewCheck.rows.length > 0) {
      console.log('\nHIPAA Views Created:');
      viewCheck.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}`);
      });
    }
    
    console.log('\n✅✅✅ HIPAA Audit Tables Migration Complete! ✅✅✅');
    console.log('=====================================');
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. Rotate Auth0 client secret in dashboard');
    console.log('2. Remove S3 website URLs from Auth0 configuration');
    console.log('3. Deploy the backend with emergency auth middleware');
    console.log('4. Test that all endpoints require authentication');
    console.log('5. Run a security audit to verify compliance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);
