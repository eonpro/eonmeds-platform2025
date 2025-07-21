/**
 * Backfill Script for Historical Stripe Payments
 * 
 * Usage:
 *   npm run backfill-payments -- --dry-run  # Test without making changes
 *   npm run backfill-payments               # Actually process payments
 *   npm run backfill-payments -- --from 2024-06-01  # Process from specific date
 */

import dotenv from 'dotenv';
import Stripe from 'stripe';
import { pool } from '../config/database';
import { handleChargeSucceeded, handleCheckoutSessionCompleted } from '../controllers/stripe-webhook.controller';
import { stripeConfig } from '../config/stripe.config';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const fromIndex = args.indexOf('--from');
const fromDate = fromIndex !== -1 && args[fromIndex + 1] ? new Date(args[fromIndex + 1]) : new Date('2024-01-01');

// Initialize Stripe
const stripe = new Stripe(stripeConfig.apiKey || '', {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion
});

interface BackfillStats {
  processed: number;
  skipped: number;
  errors: number;
  newPatients: number;
  updatedPatients: number;
}

async function backfillPayments() {
  console.log('🔄 Starting Stripe payment backfill...\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will process payments)'}`);
  
  const stats: BackfillStats = {
    processed: 0,
    skipped: 0,
    errors: 0,
    newPatients: 0,
    updatedPatients: 0
  };
  
  try {
    // Test connections
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');
    
    if (!stripeConfig.apiKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Connected to Stripe account: ${account.email}\n`);
    
    // Date range
    const endDate = new Date();
    console.log(`📅 Processing payments from ${fromDate.toDateString()} to ${endDate.toDateString()}\n`);
    
    // Process charges
    await processCharges(fromDate, endDate, stats, isDryRun);
    
    // Process checkout sessions
    await processCheckoutSessions(fromDate, endDate, stats, isDryRun);
    
    // Display summary
    displaySummary(stats);
    
  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
  }
}

async function processCharges(startDate: Date, endDate: Date, stats: BackfillStats, isDryRun: boolean) {
  console.log('📊 Fetching charges from Stripe...');
  
  let hasMore = true;
  let startingAfter: string | undefined;
  
  while (hasMore) {
    const charges = await stripe.charges.list({
      limit: 100,
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000)
      },
      ...(startingAfter && { starting_after: startingAfter })
    });
    
    console.log(`\n📦 Processing batch of ${charges.data.length} charges...`);
    
    for (const charge of charges.data) {
      if (charge.status !== 'succeeded' || charge.payment_intent) {
        stats.skipped++;
        continue;
      }
      
      try {
        console.log(`\n💳 ${isDryRun ? '[DRY RUN]' : ''} Processing charge ${charge.id}`);
        console.log(`   Amount: $${charge.amount / 100}`);
        console.log(`   Email: ${charge.billing_details?.email || 'N/A'}`);
        console.log(`   Date: ${new Date(charge.created * 1000).toLocaleString()}`);
        
        // Check if already processed
        const existing = await pool.query(
          'SELECT id FROM invoices WHERE stripe_charge_id = $1',
          [charge.id]
        );
        
        if (existing.rows.length > 0) {
          console.log(`   ⏭️  Already processed - skipping`);
          stats.skipped++;
          continue;
        }
        
        if (!isDryRun) {
          // Track if this creates a new patient
          const patientBefore = charge.billing_details?.email ? 
            await pool.query('SELECT patient_id FROM patients WHERE email = $1', [charge.billing_details.email]) : 
            { rows: [] };
            
          await handleChargeSucceeded(charge);
          
          if (patientBefore.rows.length === 0 && charge.billing_details?.email) {
            const patientAfter = await pool.query('SELECT patient_id FROM patients WHERE email = $1', [charge.billing_details.email]);
            if (patientAfter.rows.length > 0) {
              stats.newPatients++;
            }
          } else {
            stats.updatedPatients++;
          }
          
          console.log(`   ✅ Successfully processed`);
        } else {
          console.log(`   ✅ Would process (dry run)`);
        }
        
        stats.processed++;
        
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        stats.errors++;
      }
    }
    
    hasMore = charges.has_more;
    if (hasMore && charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id;
    }
  }
}

async function processCheckoutSessions(startDate: Date, endDate: Date, stats: BackfillStats, isDryRun: boolean) {
  console.log('\n\n📊 Fetching checkout sessions from Stripe...');
  
  let hasMore = true;
  let startingAfter: string | undefined;
  
  while (hasMore) {
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000)
      },
      ...(startingAfter && { starting_after: startingAfter })
    });
    
    console.log(`\n📦 Processing batch of ${sessions.data.length} sessions...`);
    
    for (const session of sessions.data) {
      if (session.payment_status !== 'paid') {
        stats.skipped++;
        continue;
      }
      
      try {
        console.log(`\n🛒 ${isDryRun ? '[DRY RUN]' : ''} Processing session ${session.id}`);
        console.log(`   Amount: $${(session.amount_total || 0) / 100}`);
        console.log(`   Email: ${session.customer_email || 'N/A'}`);
        console.log(`   Date: ${new Date(session.created * 1000).toLocaleString()}`);
        
        // Check if already processed
        const existing = await pool.query(
          'SELECT id FROM invoices WHERE stripe_session_id = $1',
          [session.id]
        );
        
        if (existing.rows.length > 0) {
          console.log(`   ⏭️  Already processed - skipping`);
          stats.skipped++;
          continue;
        }
        
        if (!isDryRun) {
          await handleCheckoutSessionCompleted(session);
          console.log(`   ✅ Successfully processed`);
        } else {
          console.log(`   ✅ Would process (dry run)`);
        }
        
        stats.processed++;
        
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        stats.errors++;
      }
    }
    
    hasMore = sessions.has_more;
    if (hasMore && sessions.data.length > 0) {
      startingAfter = sessions.data[sessions.data.length - 1].id;
    }
  }
}

function displaySummary(stats: BackfillStats) {
  console.log('\n\n📊 Backfill Summary:');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Successfully processed: ${stats.processed}`);
  console.log(`👤 New patients created: ${stats.newPatients}`);
  console.log(`📝 Existing patients updated: ${stats.updatedPatients}`);
  console.log(`⏭️  Skipped: ${stats.skipped}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`📊 Total reviewed: ${stats.processed + stats.skipped + stats.errors}`);
  
  if (!isDryRun) {
    console.log('\n🎉 Backfill completed! All historical payments have been processed.');
  } else {
    console.log('\n🔍 Dry run completed. Run without --dry-run to actually process payments.');
  }
}

// Run the backfill
backfillPayments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 