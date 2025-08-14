import { config } from 'dotenv';
import { pool } from '../config/database';
import { stripeService } from '../services/stripe.service';

// Load environment variables
config();

async function createStripeCustomersForPatients() {
  console.log('🚀 Starting Stripe customer creation for existing patients...');
  
  try {
    // Get all patients without a Stripe customer ID
    const result = await pool.query(`
      SELECT 
        p.patient_id,
        p.first_name,
        p.last_name,
        p.email,
        p.phone,
        p.stripe_customer_id,
        u.email as user_email
      FROM patients p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.stripe_customer_id IS NULL OR p.stripe_customer_id = ''
    `);

    const patients = result.rows;
    console.log(`Found ${patients.length} patients without Stripe customer IDs`);

    if (patients.length === 0) {
      console.log('✅ All patients already have Stripe customer IDs!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const patient of patients) {
      try {
        // Prepare customer data
        const customerData = {
          email: patient.email || patient.user_email,
          name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
          phone: patient.phone,
          metadata: {
            patient_id: patient.patient_id,
            source: 'bulk_migration',
            created_at: new Date().toISOString()
          }
        };

        // Skip if no email available
        if (!customerData.email) {
          console.warn(`⚠️  Skipping patient ${patient.patient_id} - no email address`);
          errorCount++;
          continue;
        }

        console.log(`Creating Stripe customer for patient ${patient.patient_id} (${customerData.name})...`);
        
        // Create Stripe customer
        const stripeCustomer = await stripeService.createCustomer(
          customerData.email,
          customerData.name,
          customerData.phone,
          customerData.metadata
        );

        // Update patient record with Stripe customer ID
        await pool.query(
          'UPDATE patients SET stripe_customer_id = $1, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $2',
          [stripeCustomer.id, patient.patient_id]
        );

        console.log(`✅ Created Stripe customer ${stripeCustomer.id} for patient ${patient.patient_id}`);
        successCount++;

      } catch (error: any) {
        console.error(`❌ Error creating Stripe customer for patient ${patient.patient_id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully created: ${successCount} Stripe customers`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total processed: ${patients.length}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
createStripeCustomersForPatients()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
