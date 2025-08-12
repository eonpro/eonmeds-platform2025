import { Pool } from 'pg';
import { getStripeClient } from '../config/stripe.config';
import Stripe from 'stripe';
import { getOrCreateCustomer } from './billingService';
import { findPatientByEmail } from './patientLookup';
import { notifyBilling } from './notify';

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

interface MirrorResult {
  action: 'skip' | 'imported' | 'created';
  invoiceId?: string;
  reason?: string;
}

/**
 * Mirror external payments to EONPRO invoices for unified billing view
 */
export async function mirrorExternalPaymentToInvoice(params: {
  charge: Stripe.Charge;
}): Promise<MirrorResult> {
  const { charge } = params;
  const stripe = getStripeClient();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ensure external_payment_mirrors table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS external_payment_mirrors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        charge_id VARCHAR(255) UNIQUE NOT NULL,
        mode VARCHAR(50) NOT NULL,
        matched_patient_id VARCHAR(50),
        created_invoice_id VARCHAR(255),
        amount INTEGER,
        currency VARCHAR(3),
        email VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 1) Check if already processed
    const existing = await client.query(
      'SELECT charge_id FROM external_payment_mirrors WHERE charge_id = $1',
      [charge.id]
    );

    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return { action: 'skip', reason: 'already-processed' };
    }

    // 2) Check if charge has an invoice
    if (charge.invoice) {
      const invoiceId = typeof charge.invoice === 'string' ? charge.invoice : charge.invoice.id;

      try {
        const invoice = await stripe.invoices.retrieve(invoiceId);

        // Check if it's an EONPRO platform invoice
        if (invoice.metadata?.platform === 'EONPRO') {
          await client.query(
            `INSERT INTO external_payment_mirrors 
             (charge_id, mode, created_at) 
             VALUES ($1, 'imported_invoice', NOW())`,
            [charge.id]
          );
          await client.query('COMMIT');
          return { action: 'skip', reason: 'platform-invoice' };
        }

        // Import non-EONPRO invoice
        const email =
          charge.billing_details?.email ||
          (typeof charge.customer === 'string'
            ? ((await stripe.customers.retrieve(charge.customer)) as Stripe.Customer).email
            : charge.customer?.email) ||
          null;

        // Try to match patient by email
        let matchedPatientId = null;
        if (email) {
          const patient = await findPatientByEmail(email, client);
          if (patient) {
            matchedPatientId = patient.patient_id;
          }
        }

        await client.query(
          `INSERT INTO external_payment_mirrors 
           (charge_id, mode, matched_patient_id, amount, currency, email, created_at) 
           VALUES ($1, 'imported_invoice', $2, $3, $4, $5, NOW())`,
          [charge.id, matchedPatientId, charge.amount, charge.currency, email]
        );

        await client.query('COMMIT');
        return { action: 'imported', invoiceId };
      } catch (error) {
        console.error('Error retrieving invoice:', error);
        await client.query('ROLLBACK');
        throw error;
      }
    }

    // 3) No invoice on charge - create one
    // Get email for matching
    let email = charge.billing_details?.email;
    if (!email && charge.customer) {
      try {
        const customerId =
          typeof charge.customer === 'string' ? charge.customer : charge.customer.id;
        const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
        email = customer.email;
      } catch (error) {
        console.error('Error retrieving customer:', error);
      }
    }

    if (!email) {
      await client.query(
        `INSERT INTO external_payment_mirrors 
         (charge_id, mode, amount, currency, created_at) 
         VALUES ($1, 'unmatched', $2, $3, NOW())`,
        [charge.id, charge.amount, charge.currency]
      );
      await client.query('COMMIT');
      return { action: 'skip', reason: 'no-email' };
    }

    // Try to match patient by email
    const patient = await findPatientByEmail(email, client);

    if (!patient) {
      await client.query(
        `INSERT INTO external_payment_mirrors 
         (charge_id, mode, amount, currency, email, created_at) 
         VALUES ($1, 'unmatched', $2, $3, $4, NOW())`,
        [charge.id, charge.amount, charge.currency, email]
      );
      await client.query('COMMIT');
      return { action: 'skip', reason: 'no-match' };
    }
    const patientName = `${patient.first_name} ${patient.last_name}`.trim();

    // Ensure patient has a Stripe customer ID
    let stripeCustomerId = patient.stripe_customer_id;
    if (!stripeCustomerId) {
      stripeCustomerId = await getOrCreateCustomer({
        patientId: patient.patient_id,
        email: email,
        name: patientName,
      });
    }

    // Create invoice with idempotency based on charge ID
    const idempotencyKeyBase = `mirror:${charge.id}`;

    try {
      // Create invoice item
      const description = charge.description
        ? `Mirrored payment from charge ${charge.id} - ${charge.description}`
        : `Mirrored payment from charge ${charge.id}`;

      await stripe.invoiceItems.create(
        {
          customer: stripeCustomerId,
          amount: charge.amount,
          currency: charge.currency,
          description: description,
          metadata: {
            platform: 'EONPRO',
            mirrored_from_charge: charge.id,
          },
        },
        {
          idempotencyKey: `${idempotencyKeyBase}-item`,
        }
      );

      // Create draft invoice
      const invoice = await stripe.invoices.create(
        {
          customer: stripeCustomerId,
          auto_advance: false, // Keep as draft initially
          metadata: {
            platform: 'EONPRO',
            mirrored_from_charge: charge.id,
          },
        },
        {
          idempotencyKey: `${idempotencyKeyBase}-invoice`,
        }
      );

      // Finalize the invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
        idempotencyKey: `${idempotencyKeyBase}-finalize`,
      });

      // Mark as paid out-of-band
      const paidInvoice = await stripe.invoices.pay(
        finalizedInvoice.id,
        {
          paid_out_of_band: true,
        },
        {
          idempotencyKey: `${idempotencyKeyBase}-pay`,
        }
      );

      // Record in database
      await client.query(
        `INSERT INTO external_payment_mirrors 
         (charge_id, mode, matched_patient_id, created_invoice_id, amount, currency, email, stripe_customer_id, note, created_at) 
         VALUES ($1, 'created_invoice', $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          charge.id,
          patient.patient_id,
          paidInvoice.id,
          charge.amount,
          charge.currency,
          email,
          stripeCustomerId,
          charge.description,
        ]
      );

      await client.query('COMMIT');

      // Send notification to billing team
      await notifyBilling({
        type: 'external_payment_mirrored',
        patientId: patient.patient_id,
        email: email,
        amount: charge.amount,
        currency: charge.currency,
        mirroredChargeId: charge.id,
        createdInvoiceId: paidInvoice.id,
        stripeInvoiceUrl: paidInvoice.hosted_invoice_url || undefined,
      });

      return { action: 'created', invoiceId: paidInvoice.id };
    } catch (stripeError: any) {
      console.error(
        `Error creating mirrored invoice for charge ${charge.id}:`,
        stripeError.message
      );

      // Record failure but don't crash
      await client.query(
        `INSERT INTO external_payment_mirrors 
         (charge_id, mode, matched_patient_id, amount, currency, email, stripe_customer_id, note, created_at) 
         VALUES ($1, 'failed', $2, $3, $4, $5, $6, $7, NOW())`,
        [
          charge.id,
          patient.patient_id,
          charge.amount,
          charge.currency,
          email,
          stripeCustomerId,
          `Error: ${stripeError.message}`,
        ]
      );

      await client.query('COMMIT');
      return { action: 'skip', reason: `stripe-error: ${stripeError.message}` };
    }
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(
      `Error in mirrorExternalPaymentToInvoice for charge ${charge.id}, amount ${charge.amount}:`,
      error.message
    );

    // Don't crash the webhook - return skip
    return { action: 'skip', reason: `error: ${error.message}` };
  } finally {
    client.release();
  }
}
