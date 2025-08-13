#!/usr/bin/env node

/**
 * Sync Stripe Customers with Existing Patients
 *
 * This script will:
 * 1. Fetch all Stripe customers and their payment history
 * 2. Match them to existing patients by email or phone
 * 3. Update patient status to 'client' if they have successful payments
 * 4. Add #activemember hashtag for paid subscriptions
 */

require("dotenv").config();
const { Pool } = require("pg");
const Stripe = require("stripe");

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Helper function to format phone for comparison
function normalizePhone(phone) {
  if (!phone) return null;
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  // Handle different formats
  if (digits.length === 10) {
    return digits; // US number without country code
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return digits.substring(1); // US number with country code
  }
  return digits;
}

async function findPatientByEmailOrPhone(email, phone) {
  try {
    // First try email (exact match)
    if (email) {
      const emailResult = await pool.query(
        "SELECT * FROM patients WHERE LOWER(email) = LOWER($1)",
        [email],
      );
      if (emailResult.rows.length > 0) {
        return emailResult.rows[0];
      }
    }

    // Then try phone (normalized)
    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone) {
        // Try different phone fields
        const phoneResult = await pool.query(
          `
          SELECT * FROM patients 
          WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, '-', ''), '(', ''), ')', ''), ' ', '') = $1
        `,
          [normalizedPhone],
        );

        if (phoneResult.rows.length > 0) {
          return phoneResult.rows[0];
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding patient:", error);
    return null;
  }
}

async function updatePatientStatus(patientId, stripeCustomerId) {
  try {
    // Update to client status and add stripe customer ID
    await pool.query(
      `
      UPDATE patients 
      SET status = 'client',
          stripe_customer_id = $2,
          updated_at = NOW()
      WHERE patient_id = $1
    `,
      [patientId, stripeCustomerId],
    );

    console.log(`✅ Updated patient ${patientId} to client status`);
  } catch (error) {
    console.error(`Error updating patient ${patientId}:`, error);
  }
}

async function addActiveHashtag(patientId) {
  try {
    // Add #activemember hashtag if not already present
    await pool.query(
      `
      UPDATE patients 
      SET membership_hashtags = 
        CASE 
          WHEN membership_hashtags IS NULL THEN ARRAY['#activemember']
          WHEN NOT '#activemember' = ANY(membership_hashtags) THEN array_append(membership_hashtags, '#activemember')
          ELSE membership_hashtags
        END,
        updated_at = NOW()
      WHERE patient_id = $1
    `,
      [patientId],
    );

    console.log(`✅ Added #activemember hashtag to patient ${patientId}`);
  } catch (error) {
    console.error(`Error adding hashtag to patient ${patientId}:`, error);
  }
}

async function syncStripeCustomers() {
  console.log("🔄 Starting Stripe customer sync...\n");

  try {
    // Get all Stripe customers
    console.log("📥 Fetching Stripe customers...");
    const customers = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params = {
        limit: 100,
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const batch = await stripe.customers.list(params);

      customers.push(...batch.data);
      hasMore = batch.has_more;
      if (hasMore && batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    console.log(`Found ${customers.length} Stripe customers\n`);

    let matchedCount = 0;
    let updatedCount = 0;
    let activeSubscriptions = 0;

    // Process each customer
    for (const customer of customers) {
      console.log(
        `\n🔍 Processing customer: ${customer.email || customer.phone || customer.id}`,
      );

      // Find matching patient
      const patient = await findPatientByEmailOrPhone(
        customer.email,
        customer.phone,
      );

      if (!patient) {
        console.log("   ❌ No matching patient found");
        continue;
      }

      matchedCount++;
      console.log(
        `   ✅ Matched to patient: ${patient.first_name} ${patient.last_name} (${patient.patient_id})`,
      );

      // Check for any successful charges
      const charges = await stripe.charges.list({
        customer: customer.id,
        limit: 10,
      });

      const hasSuccessfulPayment = charges.data.some(
        (charge) => charge.status === "succeeded" && charge.paid,
      );

      if (hasSuccessfulPayment) {
        console.log("   💳 Has successful payments");

        // Update to client status
        if (patient.status !== "client") {
          await updatePatientStatus(patient.patient_id, customer.id);
          updatedCount++;
        } else {
          console.log("   ℹ️  Already has client status");
        }
      }

      // Check for active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 10,
      });

      if (subscriptions.data.length > 0) {
        console.log(
          `   📅 Has ${subscriptions.data.length} active subscription(s)`,
        );
        await addActiveHashtag(patient.patient_id);
        activeSubscriptions++;
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("\n📊 Sync Summary:");
    console.log(`   Total Stripe customers: ${customers.length}`);
    console.log(`   Matched to patients: ${matchedCount}`);
    console.log(`   Updated to client status: ${updatedCount}`);
    console.log(`   Active subscriptions: ${activeSubscriptions}`);
  } catch (error) {
    console.error("❌ Error during sync:", error);
  } finally {
    await pool.end();
  }
}

// Run the sync
console.log("🚀 Stripe Customer Sync Tool");
console.log("============================\n");

syncStripeCustomers()
  .then(() => {
    console.log("\n✅ Sync completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Sync failed:", error);
    process.exit(1);
  });
