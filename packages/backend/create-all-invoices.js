const { Client } = require("pg");
require("dotenv").config();

async function createInvoicesForPaidClients() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://eonmeds_admin:EON#2024secure!@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds",
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // First, get all payments from Stripe that don't have invoices yet
    const paymentsQuery = `
      SELECT DISTINCT ON (p.customer_email)
        p.customer_email,
        p.customer_name,
        p.amount,
        p.created_at,
        p.stripe_payment_intent_id,
        pat.patient_id,
        pat.first_name,
        pat.last_name
      FROM payments p
      LEFT JOIN patients pat ON LOWER(pat.email) = LOWER(p.customer_email)
      LEFT JOIN invoices i ON i.patient_id = pat.patient_id AND i.stripe_payment_intent_id = p.stripe_payment_intent_id
      WHERE p.status = 'succeeded' 
        AND p.amount > 0
        AND pat.patient_id IS NOT NULL
        AND i.id IS NULL
      ORDER BY p.customer_email, p.created_at DESC
    `;

    const paymentsResult = await client.query(paymentsQuery);
    console.log(
      `Found ${paymentsResult.rows.length} payments without invoices`,
    );

    // Also check for clients with specific amounts in their names/notes
    const clientsQuery = `
      SELECT 
        p.patient_id,
        p.first_name,
        p.last_name,
        p.email,
        p.created_at
      FROM patients p
      LEFT JOIN invoices i ON i.patient_id = p.patient_id
      WHERE p.status = 'qualified'
        AND i.id IS NULL
        AND (
          p.notes LIKE '%329%' OR 
          p.notes LIKE '%229%' OR
          p.membership_hashtags @> ARRAY['#Mauriziollanos', '#activemember']
        )
    `;

    const clientsResult = await client.query(clientsQuery);
    console.log(
      `Found ${clientsResult.rows.length} qualified clients without invoices`,
    );

    // Process payments first
    for (const payment of paymentsResult.rows) {
      // Determine the medication based on amount
      let description = "";
      const amountInDollars = payment.amount / 100;

      if (amountInDollars === 229) {
        description = "Semaglutide 2.5mg/mL - Monthly";
      } else if (amountInDollars === 329) {
        description = "Tirzepatide 10mg/mL - Monthly";
      } else if (amountInDollars === 249) {
        description = "Semaglutide 2.5mg/mL - Monthly (Special Rate)";
      } else {
        // For other amounts, try to guess based on proximity
        if (Math.abs(amountInDollars - 229) < Math.abs(amountInDollars - 329)) {
          description = `Semaglutide 2.5mg/mL - Monthly (Custom: $${amountInDollars})`;
        } else {
          description = `Tirzepatide 10mg/mL - Monthly (Custom: $${amountInDollars})`;
        }
      }

      console.log(
        `Creating invoice for ${payment.first_name} ${payment.last_name} - $${amountInDollars} - ${description}`,
      );

      // Create the invoice
      const invoiceQuery = `
        INSERT INTO invoices (
          invoice_number,
          patient_id,
          invoice_date,
          due_date,
          status,
          subtotal,
          total_amount,
          amount_paid,
          amount_due,
          currency,
          payment_method,
          payment_date,
          paid_at,
          stripe_payment_intent_id,
          description,
          created_at,
          updated_at
        ) VALUES (
          generate_invoice_number(),
          $1,
          $2::date,
          $2::date,
          'paid',
          $3,
          $3,
          $3,
          0,
          'usd',
          'card',
          $2::date,
          $2,
          $4,
          $5,
          NOW(),
          NOW()
        ) RETURNING *
      `;

      try {
        const invoiceResult = await client.query(invoiceQuery, [
          payment.patient_id,
          payment.created_at,
          payment.amount / 100, // Convert cents to dollars
          payment.stripe_payment_intent_id,
          description,
        ]);

        console.log(
          `✅ Created invoice ${invoiceResult.rows[0].invoice_number} for ${payment.first_name} ${payment.last_name}`,
        );
      } catch (err) {
        console.error(
          `❌ Error creating invoice for ${payment.first_name}: ${err.message}`,
        );
      }
    }

    // Process known clients with specific hashtags
    const knownAmounts = {
      "Evelyn Zelaya": 229, // Semaglutide
      "Yerislaydi Gonzalez": 329, // Tirzepatide
      "Glenda Naranjo": 329, // Tirzepatide
      "Melida Romero": 329, // Tirzepatide
    };

    for (const client of clientsResult.rows) {
      const fullName = `${client.first_name} ${client.last_name}`;
      const amount = knownAmounts[fullName] || 229; // Default to Semaglutide
      const description =
        amount === 229
          ? "Semaglutide 2.5mg/mL - Monthly"
          : "Tirzepatide 10mg/mL - Monthly";

      console.log(
        `Creating invoice for ${fullName} - $${amount} - ${description}`,
      );

      const invoiceQuery = `
        INSERT INTO invoices (
          invoice_number,
          patient_id,
          invoice_date,
          due_date,
          status,
          subtotal,
          total_amount,
          amount_paid,
          amount_due,
          currency,
          payment_method,
          payment_date,
          paid_at,
          description,
          created_at,
          updated_at
        ) VALUES (
          generate_invoice_number(),
          $1,
          CURRENT_DATE,
          CURRENT_DATE,
          'paid',
          $2,
          $2,
          $2,
          0,
          'usd',
          'card',
          CURRENT_DATE,
          NOW(),
          $3,
          NOW(),
          NOW()
        ) RETURNING *
      `;

      try {
        const invoiceResult = await client.query(invoiceQuery, [
          client.patient_id,
          amount,
          description,
        ]);

        console.log(
          `✅ Created invoice ${invoiceResult.rows[0].invoice_number} for ${fullName}`,
        );
      } catch (err) {
        console.error(
          `❌ Error creating invoice for ${fullName}: ${err.message}`,
        );
      }
    }

    console.log("\nInvoice creation complete!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

createInvoicesForPaidClients();
