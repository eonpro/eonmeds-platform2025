#!/usr/bin/env node

/**
 * Stripe Sync Report
 * Shows the current status of patient-Stripe integration
 */

require("dotenv").config();
const { Pool } = require("pg");
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function generateReport() {
  try {
    console.log("📊 STRIPE SYNC REPORT");
    console.log("=".repeat(60));
    console.log(`Generated: ${new Date().toLocaleString()}\n`);

    // Get patient statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_patients,
        COUNT(CASE WHEN status = 'client' THEN 1 END) as clients,
        COUNT(CASE WHEN status = 'subscriptions' THEN 1 END) as subscriptions,
        COUNT(CASE WHEN status = 'qualifications' THEN 1 END) as qualifications,
        COUNT(CASE WHEN stripe_customer_id IS NOT NULL THEN 1 END) as with_stripe_id,
        COUNT(CASE WHEN '#activemember' = ANY(membership_hashtags) THEN 1 END) as active_members
      FROM patients
    `);

    const s = stats.rows[0];
    console.log("PATIENT DATABASE STATS:");
    console.log(`  Total Patients:        ${s.total_patients}`);
    console.log(`  Status = Client:       ${s.clients}`);
    console.log(`  Status = Subscriptions: ${s.subscriptions}`);
    console.log(`  Status = Qualifications: ${s.qualifications}`);
    console.log(`  With Stripe ID:        ${s.with_stripe_id}`);
    console.log(`  #activemember tag:     ${s.active_members}`);
    console.log();

    // Get recent clients
    const recentClients = await pool.query(`
      SELECT patient_id, first_name, last_name, email, status, 
             stripe_customer_id, membership_hashtags, updated_at
      FROM patients
      WHERE status = 'client' 
      ORDER BY updated_at DESC
      LIMIT 10
    `);

    console.log("RECENT CLIENTS:");
    console.log("-".repeat(60));
    recentClients.rows.forEach((p) => {
      const tags = p.membership_hashtags ? p.membership_hashtags.join(" ") : "";
      console.log(`${p.patient_id} | ${p.first_name} ${p.last_name}`);
      console.log(`   Email: ${p.email}`);
      console.log(`   Stripe: ${p.stripe_customer_id || "Not linked"}`);
      console.log(`   Tags: ${tags || "None"}`);
      console.log(`   Updated: ${new Date(p.updated_at).toLocaleDateString()}`);
      console.log();
    });

    // Get Stripe statistics
    console.log("STRIPE STATS (fetching...):");
    const customers = await stripe.customers.list({ limit: 100 });
    const activeSubscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });

    console.log(`  Total Customers:       ${customers.data.length}+`);
    console.log(`  Active Subscriptions:  ${activeSubscriptions.data.length}`);
    console.log();

    // Find unmatched Stripe customers
    const patientEmails = await pool.query(
      "SELECT LOWER(email) as email FROM patients WHERE email IS NOT NULL",
    );
    const emailSet = new Set(patientEmails.rows.map((r) => r.email));

    const unmatchedCustomers = customers.data.filter(
      (c) => c.email && !emailSet.has(c.email.toLowerCase()),
    );

    console.log(`UNMATCHED STRIPE CUSTOMERS: ${unmatchedCustomers.length}`);
    if (unmatchedCustomers.length > 0) {
      console.log("(These are in Stripe but not in patient database)");
      console.log("-".repeat(60));
      unmatchedCustomers.slice(0, 10).forEach((c) => {
        console.log(`  ${c.email} (${c.id})`);
      });
      if (unmatchedCustomers.length > 10) {
        console.log(`  ... and ${unmatchedCustomers.length - 10} more`);
      }
    }
  } catch (error) {
    console.error("Error generating report:", error);
  } finally {
    await pool.end();
  }
}

generateReport();
