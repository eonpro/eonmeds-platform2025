import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export class DatabaseService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Initialize the database with the complete schema
   */
  async initializeDatabase(): Promise<void> {
    try {
      console.log('🔄 Initializing database schema...');

      // Read the complete schema file
      const schemaPath = path.join(__dirname, '../config/complete-schema.sql');
      const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

      // Execute the schema
      await this.pool.query(schemaSQL);

      console.log('✅ Database schema initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database schema:', error);
      throw error;
    }
  }

  /**
   * Verify database integrity
   */
  async verifyDatabaseIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if patients table has patient_id column
      const patientIdCheck = await this.pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND column_name = 'patient_id'
      `);

      if (patientIdCheck.rows.length === 0) {
        issues.push('patients table missing patient_id column');
      } else if (patientIdCheck.rows[0].data_type !== 'character varying') {
        issues.push(`patients.patient_id has wrong type: ${patientIdCheck.rows[0].data_type}`);
      }

      // Check SOAP notes foreign key
      const soapNotesFK = await this.pool.query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name='soap_notes'
          AND kcu.column_name='patient_id'
      `);

      if (soapNotesFK.rows.length === 0) {
        issues.push('soap_notes missing foreign key for patient_id');
      } else {
        const fk = soapNotesFK.rows[0];
        if (fk.foreign_table_name !== 'patients' || fk.foreign_column_name !== 'patient_id') {
          issues.push(
            `soap_notes.patient_id has wrong foreign key reference: ${fk.foreign_table_name}.${fk.foreign_column_name}`
          );
        }
      }

      // Check all required tables exist
      const requiredTables = [
        'patients',
        'practitioners',
        'soap_notes',
        'invoices',
        'invoice_items',
        'invoice_payments',
        'service_packages',
        'patient_packages',
        'appointments',
        'audit_logs',
      ];

      for (const table of requiredTables) {
        const tableExists = await this.pool.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `,
          [table]
        );

        if (!tableExists.rows[0].exists) {
          issues.push(`Missing required table: ${table}`);
        }
      }
    } catch (error) {
      console.error('Error verifying database integrity:', error);
      issues.push(`Verification error: ${(error as Error).message}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Migrate existing data to proper schema
   */
  async migrateExistingData(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Add patient_id to existing patients if missing
      const hasPatientId = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'patients' 
          AND column_name = 'patient_id'
        )
      `);

      if (!hasPatientId.rows[0].exists) {
        console.log('Adding patient_id column to patients table...');
        await client.query(`
          ALTER TABLE patients 
          ADD COLUMN patient_id VARCHAR(20) UNIQUE DEFAULT generate_patient_id()
        `);

        // Generate patient IDs for existing records
        await client.query(`
          UPDATE patients 
          SET patient_id = generate_patient_id() 
          WHERE patient_id IS NULL
        `);
      }

      await client.query('COMMIT');
      console.log('✅ Data migration completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Data migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
