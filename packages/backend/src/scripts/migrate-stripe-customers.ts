import dotenv from 'dotenv';
import { pool } from '../config/database';
import { stripeService } from '../services/stripe.service';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Migration script to create Stripe customers for existing patients
 * Run with: npx ts-node src/scripts/migrate-stripe-customers.ts
 */
async function migrateStripeCustomers() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting Stripe customer migration...');
    
    // Get all patients without Stripe customers
    const result = await client.query(
      `SELECT patient_id, first_name, last_name, email, phone 
       FROM patients 
       WHERE stripe_customer_id IS NULL 
       ORDER BY created_at ASC`
    );
    
    const patients = result.rows;
    logger.info(`Found ${patients.length} patients without Stripe customers`);
    
    if (patients.length === 0) {
      logger.info('No patients need migration');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];
    
    for (const patient of patients) {
      try {
        logger.info(`Processing patient ${patient.patient_id}: ${patient.first_name} ${patient.last_name}`);
        
        // Create Stripe customer
        const stripeCustomer = await stripeService.createCustomer({
          patientId: patient.patient_id,
          email: patient.email,
          name: `${patient.first_name} ${patient.last_name}`,
          phone: patient.phone
        });
        
        // Update patient record
        await client.query(
          `UPDATE patients 
           SET stripe_customer_id = $1, 
               updated_at = NOW() 
           WHERE patient_id = $2`,
          [stripeCustomer.id, patient.patient_id]
        );
        
        logger.info(`✅ Created Stripe customer ${stripeCustomer.id} for patient ${patient.patient_id}`);
        successCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        logger.error(`❌ Failed to create Stripe customer for patient ${patient.patient_id}:`, error.message);
        errors.push({
          patient_id: patient.patient_id,
          email: patient.email,
          error: error.message
        });
        errorCount++;
      }
    }
    
    // Print summary
    logger.info('=====================================');
    logger.info('Migration Summary:');
    logger.info(`✅ Successfully migrated: ${successCount} patients`);
    logger.info(`❌ Failed: ${errorCount} patients`);
    
    if (errors.length > 0) {
      logger.info('Failed patients:');
      errors.forEach(err => {
        logger.info(`  - Patient ${err.patient_id} (${err.email}): ${err.error}`);
      });
    }
    
    // Verify migration
    const verifyResult = await client.query(
      `SELECT 
        COUNT(*) as total_patients,
        COUNT(stripe_customer_id) as with_stripe,
        COUNT(*) - COUNT(stripe_customer_id) as without_stripe
       FROM patients`
    );
    
    const stats = verifyResult.rows[0];
    logger.info('=====================================');
    logger.info('Database Statistics:');
    logger.info(`Total patients: ${stats.total_patients}`);
    logger.info(`With Stripe customer: ${stats.with_stripe}`);
    logger.info(`Without Stripe customer: ${stats.without_stripe}`);
    
  } catch (error: any) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateStripeCustomers()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateStripeCustomers };