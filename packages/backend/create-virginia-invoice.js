#!/usr/bin/env node

/**
 * Create invoice record for Virginia Samaniego's payment
 */

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function createInvoice() {
  try {
    console.log("📄 Creating invoice for Virginia Samaniego...\n");

    // First check if patient exists
    const patient = await pool.query(
      "SELECT patient_id, first_name, last_name, email FROM patients WHERE patient_id = $1",
      ["P0248"],
    );

    if (patient.rows.length === 0) {
      console.log("❌ Patient P0248 not found");
      return;
    }

    console.log("✅ Found patient:", patient.rows[0]);

    // Create the invoice
    const invoice = await pool.query(
      `
      INSERT INTO invoices (
        id,
        invoice_number,
        patient_id, 
        subtotal,
        total_amount,
        amount_paid,
        description, 
        status,
        invoice_date,
        due_date,
        paid_at,
        payment_method,
        stripe_payment_intent_id,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        generate_invoice_number(),
        $1,
        329.00,
        329.00,
        329.00,
        'Weight Loss Program - Initial Payment',
        'paid',
        '2025-07-21',
        '2025-07-21',
        '2025-07-21 21:58:41',
        'stripe',
        'pi_3RnRjJGzKhM7cZeG0hnErd7C',
        '2025-07-21 21:58:41',
        NOW()
      )
      RETURNING *
    `,
      ["P0248"],
    );

    console.log("\n✅ Invoice created successfully:");
    console.log(`  Invoice ID: ${invoice.rows[0].id}`);
    console.log(`  Amount: $${invoice.rows[0].amount}`);
    console.log(`  Status: ${invoice.rows[0].status}`);
    console.log(`  Payment Date: ${invoice.rows[0].paid_at}`);

    // Also update the patient to qualified status if not already
    await pool.query(`
      UPDATE patients 
      SET 
        status = 'qualified',
        membership_hashtags = array_append(
          COALESCE(membership_hashtags, ARRAY[]::text[]), 
          '#activemember'
        ),
        updated_at = NOW()
      WHERE patient_id = 'P0248' AND status != 'qualified'
    `);

    console.log("\n✅ Patient status updated to qualified");
  } catch (error) {
    console.error("Error creating invoice:", error);
  } finally {
    await pool.end();
  }
}

createInvoice();
