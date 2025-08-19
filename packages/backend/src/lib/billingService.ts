import { Pool } from 'pg';
import crypto from 'crypto';
import { getStripeClient } from '../config/stripe.config';
import Stripe from 'stripe';

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Get Stripe client instance
const getStripe = () => {
  try {
    return getStripeClient();
  } catch (error) {
    throw new Error('Stripe is not configured. Please check your environment variables.');
  }
};

// Check if tax is enabled
const isTaxEnabled = () => {
  return process.env.TAX_ENABLED === 'true';
};

/**
 * Get or create a Stripe customer for a patient
 */
export async function getOrCreateCustomer({
  patientId,
  email,
  name,
  address,
}: {
  patientId: string;
  email: string;
  name: string;
  address?: {
    country?: string;
    state?: string;
    postal_code?: string;
    city?: string;
    line1?: string;
    line2?: string;
  };
}): Promise<string> {
  const client = await pool.connect();

  try {
    // Query existing stripe customer ID
    const result = await client.query('SELECT stripe_customer_id FROM patients WHERE id = $1', [
      patientId,
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Patient with ID ${patientId} not found`);
    }

    const existingCustomerId = result.rows[0].stripe_customer_id;

    // Return existing customer ID if present
    if (existingCustomerId) {
      return existingCustomerId;
    }

    // Create new Stripe customer
    const stripe = getStripe();
    const customerData: any = {
      email,
      name,
      metadata: {
        patientId,
        platform: 'EONPRO',
      },
    };

    // Add address if provided (important for tax calculations)
    if (address && isTaxEnabled()) {
      customerData.address = address;
    }

    const customer = await stripe.customers.create(customerData);

    // Store customer ID in database
    await client.query('UPDATE patients SET stripe_customer_id = $1 WHERE id = $2', [
      customer.id,
      patientId,
    ]);

    return customer.id;
  } finally {
    client.release();
  }
}

/**
 * Create a draft invoice
 */
export async function createInvoiceDraft({
  customerId,
  items,
  description,
  metadata = {},
}: {
  customerId: string;
  items: Array<{
    description: string;
    amount: number;
    currency?: string;
  }>;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Invoice> {
  const stripe = getStripe();
  const idempotencyKey = crypto.randomUUID();

  try {
    // Create invoice items
    for (const item of items) {
      await stripe.invoiceItems.create(
        {
          customer: customerId,
          description: item.description,
          amount: item.amount,
          currency: item.currency || 'usd',
          metadata: { platform: 'EONPRO' },
        },
        {
          idempotencyKey: `${idempotencyKey}-item-${items.indexOf(item)}`,
        }
      );
    }

    // Create draft invoice
    const invoiceData: Stripe.InvoiceCreateParams = {
      customer: customerId,
      auto_advance: false, // Keep as draft
      description,
      metadata: { platform: 'EONPRO', ...metadata },
    };

    if (isTaxEnabled()) {
      invoiceData.automatic_tax = { enabled: true };
    }

    const invoice = await stripe.invoices.create(invoiceData, {
      idempotencyKey: `${idempotencyKey}-invoice`,
    });

    return invoice;
  } catch (error: any) {
    throw new Error(`Failed to create draft invoice: ${error.message}`);
  }
}

/**
 * Send an invoice to customer
 */
export async function sendInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  const stripe = getStripe();
  const idempotencyKey = crypto.randomUUID();

  try {
    // First finalize if not already finalized
    const invoice = await stripe.invoices.retrieve(invoiceId);
    
    let finalizedInvoice = invoice;
    if (invoice.status === 'draft') {
      finalizedInvoice = await stripe.invoices.finalizeInvoice(invoiceId, {
        idempotencyKey: `${idempotencyKey}-finalize`,
      });
    }

    // Send the invoice
    const sentInvoice = await stripe.invoices.sendInvoice(finalizedInvoice.id, {
      idempotencyKey: `${idempotencyKey}-send`,
    });

    return sentInvoice;
  } catch (error: any) {
    throw new Error(`Failed to send invoice: ${error.message}`);
  }
}

/**
 * Pay an invoice
 */
export async function payInvoice(
  invoiceId: string,
  options?: {
    paymentMethodId?: string;
    paidOutOfBand?: boolean;
  }
): Promise<Stripe.Invoice> {
  const stripe = getStripe();
  const idempotencyKey = crypto.randomUUID();

  try {
    const payOptions: Stripe.InvoicePayParams = {};
    
    if (options?.paidOutOfBand) {
      payOptions.paid_out_of_band = true;
    }
    
    if (options?.paymentMethodId) {
      payOptions.payment_method = options.paymentMethodId;
    }

    const paidInvoice = await stripe.invoices.pay(invoiceId, payOptions, {
      idempotencyKey,
    });

    return paidInvoice;
  } catch (error: any) {
    throw new Error(`Failed to pay invoice: ${error.message}`);
  }
}

/**
 * Create invoice and process payment
 */
export async function createInvoiceAndPay({
  customerId,
  items,
  email_invoice = false,
  idempotencyKey,
}: {
  customerId: string;
  items: Array<{
    description: string;
    amount: number;
    currency?: string;
  }>;
  email_invoice?: boolean;
  idempotencyKey?: string;
}): Promise<{
  invoice: any;
  payment: any;
  invoiceId: string;
  status: string;
  paymentIntentId?: string;
  error?: string;
  requiresPaymentMethod?: boolean;
}> {
  const stripe = getStripe();
  const finalIdempotencyKey = idempotencyKey || crypto.randomUUID();

  try {
    // Create invoice items
    for (const item of items) {
      await stripe.invoiceItems.create(
        {
          customer: customerId,
          description: item.description,
          amount: item.amount,
          currency: item.currency || 'usd',
          metadata: {
            platform: 'EONPRO',
          },
        },
        {
          idempotencyKey: `${finalIdempotencyKey}-item-${items.indexOf(item)}`,
        }
      );
    }

    // Create and finalize invoice
    const invoiceData: any = {
      customer: customerId,
      auto_advance: true,
      metadata: {
        platform: 'EONPRO',
      },
    };

    // Enable automatic tax if configured
    if (isTaxEnabled()) {
      invoiceData.automatic_tax = { enabled: true };
    }

    const invoice = await stripe.invoices.create(invoiceData, {
      idempotencyKey: `${finalIdempotencyKey}-invoice`,
    });

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
      idempotencyKey: `${finalIdempotencyKey}-finalize`,
    });

    // Handle payment based on email_invoice flag
    if (email_invoice) {
      // Send invoice via email
      await stripe.invoices.sendInvoice(finalizedInvoice.id);

      return {
        invoiceId: finalizedInvoice.id,
        status: 'sent',
        paymentIntentId: finalizedInvoice.payment_intent as string,
      };
    } else {
      // Pay immediately
      try {
        const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id, {
          idempotencyKey: `${finalIdempotencyKey}-pay`,
        });

        return {
          invoiceId: paidInvoice.id,
          status: 'paid',
          paymentIntentId: paidInvoice.payment_intent as string,
        };
      } catch (payError: any) {
        // Handle no default payment method
        if (
          payError.code === 'invoice_payment_intent_requires_action' ||
          payError.message?.includes('no default payment method')
        ) {
          return {
            invoiceId: finalizedInvoice.id,
            status: 'requires_payment_method',
            error: 'Customer has no default payment method. Please collect payment information.',
            requiresPaymentMethod: true,
            paymentIntentId: finalizedInvoice.payment_intent as string,
          };
        }
        throw payError;
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to create invoice: ${error.message}`);
  }
}

/**
 * Create a subscription for a customer
 */
export async function createSubscription({
  customerId,
  priceId = process.env.STRIPE_PRICE_ID_DEFAULT,
  idempotencyKey,
}: {
  customerId: string;
  priceId?: string;
  idempotencyKey?: string;
}): Promise<Stripe.Subscription> {
  if (!priceId) {
    throw new Error('No price ID provided and STRIPE_PRICE_ID_DEFAULT is not set');
  }

  const stripe = getStripe();

  try {
    const subscriptionData: any = {
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        platform: 'EONPRO',
      },
    };

    // Enable automatic tax if configured
    if (isTaxEnabled()) {
      subscriptionData.automatic_tax = { enabled: true };
    }

    const subscription = await stripe.subscriptions.create(
      subscriptionData,
      idempotencyKey ? { idempotencyKey } : undefined
    );

    return subscription;
  } catch (error: any) {
    throw new Error(`Failed to create subscription: ${error.message}`);
  }
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(
  subscriptionId: string,
  behavior: 'keep_as_draft' | 'mark_uncollectible' | 'void' = 'keep_as_draft'
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior,
      },
    });

    return subscription;
  } catch (error: any) {
    throw new Error(`Failed to pause subscription: ${error.message}`);
  }
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: null,
    });

    return subscription;
  } catch (error: any) {
    throw new Error(`Failed to resume subscription: ${error.message}`);
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  options: { at_period_end?: boolean } = { at_period_end: true }
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  try {
    if (options.at_period_end) {
      // Cancel at period end
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return subscription;
    } else {
      // Cancel immediately
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    }
  } catch (error: any) {
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}

/**
 * Reactivate a subscription that was set to cancel at period end
 */
export async function reactivateSubscription(subscriptionId: string): Promise<{
  subscription?: Stripe.Subscription;
  message?: string;
  success: boolean;
}> {
  const stripe = getStripe();

  try {
    // Retrieve the subscription to check its status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // If subscription is set to cancel at period end, we can reactivate it
    if (subscription.cancel_at_period_end && subscription.status === 'active') {
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      return {
        subscription: updatedSubscription,
        success: true,
      };
    }

    // If subscription is already canceled, we cannot reactivate it
    if (subscription.status === 'canceled') {
      return {
        success: false,
        message: 'Subscription is already canceled. Please create a new subscription.',
      };
    }

    // Subscription is active and not set to cancel
    return {
      subscription,
      success: true,
      message: 'Subscription is already active',
    };
  } catch (error: any) {
    throw new Error(`Failed to reactivate subscription: ${error.message}`);
  }
}

/**
 * Create a SetupIntent for collecting payment methods
 */
export async function createSetupIntent({
  patientId,
  email,
  name,
  address,
}: {
  patientId: string;
  email: string;
  name: string;
  address?: {
    country?: string;
    state?: string;
    postal_code?: string;
    city?: string;
    line1?: string;
    line2?: string;
  };
}): Promise<{ client_secret: string }> {
  try {
    // First, ensure customer exists
    const customerId = await getOrCreateCustomer({ patientId, email, name, address });

    // Create SetupIntent
    const stripe = getStripe();
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      metadata: {
        patientId,
        platform: 'EONPRO',
      },
    });

    return {
      client_secret: setupIntent.client_secret!,
    };
  } catch (error: any) {
    throw new Error(`Failed to create setup intent: ${error.message}`);
  }
}

/**
 * Attach a payment method to a customer and set as default
 */
export async function attachPaymentMethod({
  customerId,
  paymentMethodId,
}: {
  customerId: string;
  paymentMethodId: string;
}): Promise<{
  customer: Stripe.Customer;
  paymentMethod: Stripe.PaymentMethod;
}> {
  const stripe = getStripe();

  try {
    // Attach payment method to customer
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method for invoices
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return {
      customer: customer as Stripe.Customer,
      paymentMethod,
    };
  } catch (error: any) {
    throw new Error(`Failed to attach payment method: ${error.message}`);
  }
}

/**
 * Update subscription price
 */
export async function updateSubscriptionPrice(
  subscriptionId: string,
  priceId: string,
  proration_behavior: 'create_prorations' | 'none' | 'always_invoice' = 'create_prorations'
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  try {
    // First retrieve the subscription to get the current item
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!subscription.items.data.length) {
      throw new Error('Subscription has no items');
    }

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior,
    });

    return updatedSubscription;
  } catch (error: any) {
    throw new Error(`Failed to update subscription price: ${error.message}`);
  }
}

/**
 * Apply a coupon or promotion code to a subscription
 */
export async function applyCouponToSubscription(
  subscriptionId: string,
  options: { coupon?: string; promotion_code?: string }
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  try {
    if (!options.coupon && !options.promotion_code) {
      throw new Error('Either coupon or promotion_code must be provided');
    }

    const updateData: any = {};

    if (options.coupon) {
      updateData.coupon = options.coupon;
    } else if (options.promotion_code) {
      // Look up the promotion code to get its ID
      const promotionCodes = await stripe.promotionCodes.list({
        code: options.promotion_code,
        active: true,
        limit: 1,
      });

      if (!promotionCodes.data.length) {
        throw new Error('Invalid or inactive promotion code');
      }

      updateData.promotion_code = promotionCodes.data[0].id;
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, updateData);

    return subscription;
  } catch (error: any) {
    throw new Error(`Failed to apply coupon to subscription: ${error.message}`);
  }
}

/**
 * Start or end a trial on a subscription
 */
export async function startTrialOnSubscription(
  subscriptionId: string,
  trial_end: 'now' | number
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      trial_end,
    });

    return subscription;
  } catch (error: any) {
    throw new Error(`Failed to update subscription trial: ${error.message}`);
  }
}

/**
 * Create a refund for a payment intent
 */
export async function createRefund({
  payment_intent_id,
  amount,
  idempotencyKey,
}: {
  payment_intent_id: string;
  amount?: number;
  idempotencyKey?: string;
}): Promise<Stripe.Refund> {
  const stripe = getStripe();
  const client = await pool.connect();

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: payment_intent_id,
        ...(amount && { amount }),
        metadata: {
          platform: 'EONPRO',
        },
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    // Log to billing_events
    await client.query(
      `INSERT INTO billing_events (id, type, payload, created_at) 
       VALUES (gen_random_uuid(), $1, $2, NOW())`,
      [
        'refund.created',
        JSON.stringify({ refund_id: refund.id, payment_intent_id, amount: refund.amount }),
      ]
    );

    return refund;
  } catch (error: any) {
    throw new Error(`Failed to create refund: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Create a refund by invoice ID
 */
export async function createRefundByInvoice({
  invoice_id,
  amount,
}: {
  invoice_id: string;
  amount?: number;
}): Promise<Stripe.Refund> {
  const stripe = getStripe();
  const client = await pool.connect();

  try {
    // Retrieve invoice to get payment intent
    const invoice = await stripe.invoices.retrieve(invoice_id);

    if (!invoice.payment_intent) {
      throw new Error('Invoice has no associated payment intent');
    }

    const paymentIntentId =
      typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent.id;

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount && { amount }),
      metadata: {
        platform: 'EONPRO',
      },
    });

    // Log to billing_events
    await client.query(
      `INSERT INTO billing_events (id, type, payload, created_at) 
       VALUES (gen_random_uuid(), $1, $2, NOW())`,
      [
        'refund.created_by_invoice',
        JSON.stringify({
          refund_id: refund.id,
          invoice_id,
          payment_intent_id: paymentIntentId,
          amount: refund.amount,
        }),
      ]
    );

    return refund;
  } catch (error: any) {
    throw new Error(`Failed to create refund by invoice: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Create a credit note against an invoice
 */
export async function createCreditNote({
  invoice_id,
  amount,
  reason,
}: {
  invoice_id: string;
  amount: number;
  reason?: string;
}): Promise<Stripe.CreditNote> {
  const stripe = getStripe();
  const client = await pool.connect();

  try {
    const creditNote = await stripe.creditNotes.create({
      invoice: invoice_id,
      amount,
      ...(reason && { memo: reason }),
      metadata: {
        platform: 'EONPRO',
      },
    });

    // Log to billing_events
    await client.query(
      `INSERT INTO billing_events (id, type, payload, created_at) 
       VALUES (gen_random_uuid(), $1, $2, NOW())`,
      [
        'credit_note.created',
        JSON.stringify({
          credit_note_id: creditNote.id,
          invoice_id,
          amount,
          reason,
        }),
      ]
    );

    return creditNote;
  } catch (error: any) {
    throw new Error(`Failed to create credit note: ${error.message}`);
  } finally {
    client.release();
  }
}
