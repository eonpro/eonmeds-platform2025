const { Client } = require('pg');
require('dotenv').config();

async function testInvoicePayment() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://eonmeds_admin:398Xakf$57@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds?sslmode=disable';

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();

    // Test invoice ID from your screenshot
    const invoiceId = 'INV-2025-01012'; // This looks like invoice_number, not id

    // First, try to find the invoice by invoice_number
    console.log('\n=== FINDING INVOICE ===');
    const invoiceResult = await client.query(
      `SELECT id, invoice_number, amount_due, status 
       FROM invoices 
       WHERE invoice_number = $1`,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      console.log('❌ No invoice found with invoice_number:', invoiceId);

      // Try to find by id instead
      console.log('\nTrying to find by ID (assuming it might be a UUID)...');
      const invoiceByIdResult = await client.query(
        `SELECT id, invoice_number, amount_due, status 
         FROM invoices 
         WHERE id::text = $1`,
        [invoiceId]
      );

      if (invoiceByIdResult.rows.length === 0) {
        console.log('❌ No invoice found with ID:', invoiceId);

        // Show some recent invoices
        console.log('\n=== RECENT INVOICES ===');
        const recentInvoices = await client.query(
          `SELECT id, invoice_number, amount_due, status, created_at 
           FROM invoices 
           ORDER BY created_at DESC 
           LIMIT 5`
        );

        console.log('Recent invoices:');
        recentInvoices.rows.forEach((inv) => {
          console.log(
            `  - ${inv.invoice_number}: ID=${inv.id}, Amount=$${inv.amount_due}, Status=${inv.status}`
          );
        });
      }
    } else {
      const invoice = invoiceResult.rows[0];
      console.log('✅ Found invoice:', invoice);

      // Now test if we can insert a payment record
      console.log('\n=== TESTING PAYMENT INSERT ===');
      try {
        const testPaymentResult = await client.query(
          `INSERT INTO invoice_payments (
            invoice_id, 
            payment_date, 
            amount, 
            payment_method, 
            stripe_payment_intent_id,
            status,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
          [
            invoice.id, // Using the actual UUID from the invoice
            new Date(),
            invoice.amount_due,
            'stripe',
            'pi_test_' + Date.now(),
            'completed',
            JSON.stringify({ test: true }),
          ]
        );

        console.log('✅ Payment record created successfully:', testPaymentResult.rows[0]);

        // Clean up test record
        await client.query('DELETE FROM invoice_payments WHERE id = $1', [
          testPaymentResult.rows[0].id,
        ]);
        console.log('✅ Test record cleaned up');
      } catch (insertErr) {
        console.log('❌ Error inserting payment:', insertErr.message);
        console.log('Full error:', insertErr);
      }
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
testInvoicePayment();
