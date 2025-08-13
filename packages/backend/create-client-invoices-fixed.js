const { Client } = require("pg");
require("dotenv").config();

async function createClientInvoices() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://eonmeds_admin:EON#2024secure!@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds",
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // Define clients and their payment amounts based on the screenshot
    const clientInvoices = [
      {
        name: "Evelyn Zelaya",
        bmi: 35.2,
        amount: 229,
        medication: "Semaglutide",
      },
      {
        name: "Yerislaydi Gonzalez",
        bmi: 49.6,
        amount: 329,
        medication: "Tirzepatide",
      },
      {
        name: "Glenda Naranjo",
        bmi: 33.2,
        amount: 329,
        medication: "Tirzepatide",
      },
      {
        name: "Melida Romero",
        bmi: 36.6,
        amount: 329,
        medication: "Tirzepatide",
      },
    ];

    // Get patient IDs for these clients
    for (const clientInvoice of clientInvoices) {
      const [firstName, lastName] = clientInvoice.name.split(" ");

      // Find the patient
      const patientQuery = `
        SELECT patient_id, first_name, last_name, email
        FROM patients
        WHERE first_name = $1 AND last_name = $2
      `;

      const patientResult = await client.query(patientQuery, [
        firstName,
        lastName,
      ]);

      if (patientResult.rows.length === 0) {
        console.log(`❌ Patient not found: ${clientInvoice.name}`);
        continue;
      }

      const patient = patientResult.rows[0];

      // Check if invoice already exists
      const existingInvoiceQuery = `
        SELECT id FROM invoices
        WHERE patient_id = $1 AND total_amount = $2
      `;

      const existingInvoice = await client.query(existingInvoiceQuery, [
        patient.patient_id,
        clientInvoice.amount,
      ]);

      if (existingInvoice.rows.length > 0) {
        console.log(`⏩ Invoice already exists for ${clientInvoice.name}`);
        continue;
      }

      // Create the invoice (amount_due will be calculated automatically)
      const description = `${clientInvoice.medication} ${clientInvoice.medication === "Semaglutide" ? "2.5mg/mL" : "10mg/mL"} - Monthly`;

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
          'usd',
          'card',
          CURRENT_DATE,
          NOW(),
          $3,
          NOW(),
          NOW()
        ) RETURNING invoice_number, total_amount
      `;

      try {
        const invoiceResult = await client.query(invoiceQuery, [
          patient.patient_id,
          clientInvoice.amount,
          description,
        ]);

        console.log(
          `✅ Created invoice ${invoiceResult.rows[0].invoice_number} for ${clientInvoice.name} - $${clientInvoice.amount}`,
        );
      } catch (err) {
        console.error(
          `❌ Error creating invoice for ${clientInvoice.name}: ${err.message}`,
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

createClientInvoices();
