import { pool } from '../../config/database';
import fs from 'fs';
import path from 'path';

/**
 * Run a specific migration file
 */
async function runMigration(filename: string) {
  const migrationPath = path.join(__dirname, filename);
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`🔄 Running migration: ${filename}`);
    
    // Execute the migration
    await pool.query(sql);
    
    console.log(`✅ Migration completed: ${filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`, error);
    throw error;
  }
}

/**
 * Run all migrations in order
 */
async function runAllMigrations() {
  try {
    // Get all SQL files in the migrations directory
    const files = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure they run in order
    
    console.log(`📋 Found ${files.length} migration files`);
    
    for (const file of files) {
      await runMigration(file);
    }
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runAllMigrations();
}

export { runMigration, runAllMigrations };
