import { Request, Response } from "express";
import { pool } from "../config/database";
import { getStripeClient } from "../config/stripe.config";
import { auditService, AuditAction, AuditSeverity } from "../services/audit.service";
import Stripe from "stripe";

/**
 * Helper to resolve or create a Stripe customer
 */
async function resolveCustomer(params: {
  patientId?: string;
  customerId?: string;
  email?: string;
  name?: string;
}): Promise<string> {
  const stripe = getStripeClient();

  // If customerId provided, verify it exists
  if (params.customerId) {
    try {
      await stripe.customers.retrieve(params.customerId);
      return params.customerId;
    } catch (error) {
      // Customer doesn't exist, create new one
    }
  }

  // Try to find customer by patientId
  if (params.patientId) {
    const result = await pool.query(
      "SELECT stripe_customer_id FROM patients WHERE patient_id = $1",
      [params.patientId]
    );
    if (result.rows[0]?.stripe_customer_id) {
      return result.rows[0].stripe_customer_id;
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: params.email || `patient${params.patientId}@eonmeds.com`,
    name: params.name || `Patient ${params.patientId}`,
    metadata: {
      platform: 'EONPRO',
      patient_id: params.patientId || ''
    }
  });

  // Update patient record if we have patientId
  if (params.patientId) {
    await pool.query(
      "UPDATE patients SET stripe_customer_id = $1 WHERE patient_id = $2",
      [customer.id, params.patientId]
    );
  }

  return customer.id;
}

/**
 * Map Stripe errors to HTTP responses
 */
function mapStripeError(error: any): { status: number; json: any } {
  if (error.type === 'StripeInvalidRequestError') {
    return { 
      status: 400, 
      json: { error: error.message, code: error.code, requestId: error.requestId }
    };
  }
  
  if (error.code === 'resource_missing') {
    return { 
      status: 404, 
      json: { error: 'Resource not found', code: error.code, requestId: error.requestId }
    };
  }
  
  if (error.code === 'card_declined' || error.type === 'StripeCardError') {
    return { 
      status: 402, 
      json: { 
        error: error.message, 
        code: error.code, 
        need_payment_method: true,
        requestId: error.requestId 
      }
    };
  }

  // Default to 502 for other Stripe errors
  return { 
    status: 502, 
    json: { 
      error: 'Stripe error. Please try again.', 
      code: error.code,
      requestId: error.requestId 
    }
  };
}

/**
 * POST /payment-methods/setup-intent
 * Create a SetupIntent for saving a payment method
 */
export const createSetupIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, email, name } = req.body;
    const stripe = getStripeClient();

    const customerId = await resolveCustomer({ patientId, email, name });

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      metadata: {
        platform: 'EONPRO',
        patient_id: patientId || ''
      }
    });

    await auditService.log({
      action: AuditAction.PAYMENT_METHOD_ADDED,
      severity: AuditSeverity.INFO,
      userId: (req as any).auth?.sub,
      patientId,
      resourceType: 'setup_intent',
      resourceId: setupIntent.id,
      metadata: { customer_id: customerId }
    });

    res.json({ 
      client_secret: setupIntent.client_secret,
      customer_id: customerId 
    });
  } catch (error: any) {
    const { status, json } = mapStripeError(error);
    res.status(status).json(json);
  }
};

/**
 * POST /payment-methods/attach
 * Attach a payment method to a customer
 */
export const attachPaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, customerId, payment_method_id, make_default } = req.body;
    const stripe = getStripeClient();

    const resolvedCustomerId = await resolveCustomer({ patientId, customerId });

    // Attach payment method to customer
    const paymentMethod = await stripe.paymentMethods.attach(payment_method_id, {
      customer: resolvedCustomerId
    });

    // Set as default if requested
    if (make_default) {
      await stripe.customers.update(resolvedCustomerId, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      });
    }

    // Cache payment method details in our DB (safe data only)
    await pool.query(
      `INSERT INTO payment_methods_cached 
       (payment_method_id, patient_id, stripe_customer_id, brand, last4, 
        exp_month, exp_year, fingerprint, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (payment_method_id) 
       DO UPDATE SET 
         is_default = $9,
         updated_at = NOW()`,
      [
        paymentMethod.id,
        patientId,
        resolvedCustomerId,
        paymentMethod.card?.brand,
        paymentMethod.card?.last4,
        paymentMethod.card?.exp_month,
        paymentMethod.card?.exp_year,
        paymentMethod.card?.fingerprint,
        make_default || false
      ]
    );

    // Update other cards to not be default if this one is
    if (make_default) {
      await pool.query(
        `UPDATE payment_methods_cached 
         SET is_default = FALSE 
         WHERE stripe_customer_id = $1 AND payment_method_id != $2`,
        [resolvedCustomerId, payment_method_id]
      );
    }

    await auditService.log({
      action: AuditAction.PAYMENT_METHOD_ADDED,
      severity: AuditSeverity.INFO,
      userId: (req as any).auth?.sub,
      patientId,
      resourceType: 'payment_method',
      resourceId: paymentMethod.id,
      metadata: { 
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
        make_default 
      }
    });

    res.json({
      default_set: make_default || false,
      pm_summary: {
        id: paymentMethod.id,
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
        exp_month: paymentMethod.card?.exp_month,
        exp_year: paymentMethod.card?.exp_year
      }
    });
  } catch (error: any) {
    const { status, json } = mapStripeError(error);
    res.status(status).json(json);
  }
};

/**
 * POST /invoices/create
 * Create a Stripe invoice with various behaviors
 */
export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      patientId, 
      customerId, 
      email, 
      name, 
      items, 
      behavior = 'draft' 
    } = req.body;
    
    const stripe = getStripeClient();
    const resolvedCustomerId = await resolveCustomer({ patientId, customerId, email, name });

    // Create idempotency key
    const idempotencyKey = `invoice_${resolvedCustomerId}_${Date.now()}`;

    // Create invoice items
    for (const item of items) {
      await stripe.invoiceItems.create({
        customer: resolvedCustomerId,
        description: item.description,
        amount: Math.round((item.amount || 0) * 100), // Convert to cents
        currency: item.currency || 'usd',
        metadata: { platform: 'EONPRO' }
      }, { idempotencyKey: `${idempotencyKey}_item_${items.indexOf(item)}` });
    }

    // Create the invoice
    const invoice = await stripe.invoices.create({
      customer: resolvedCustomerId,
      auto_advance: false, // We'll control when to finalize
      metadata: { 
        platform: 'EONPRO',
        patient_id: patientId || ''
      }
    }, { idempotencyKey });

    let finalInvoice = invoice;
    let hostedUrl = null;

    // Handle different behaviors
    if (behavior !== 'draft') {
      // Finalize the invoice
      finalInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
      hostedUrl = finalInvoice.hosted_invoice_url;

      if (behavior === 'finalize_and_email') {
        // Send the invoice
        await stripe.invoices.sendInvoice(invoice.id);
      } else if (behavior === 'finalize_and_charge') {
        // Try to charge immediately
        try {
          await stripe.invoices.pay(invoice.id);
        } catch (payError: any) {
          if (payError.code === 'invoice_payment_intent_requires_action' || 
              payError.code === 'card_declined') {
            res.status(402).json({ 
              need_payment_method: true,
              invoice_id: invoice.id,
              hosted_url: hostedUrl,
              error: payError.message,
              requestId: payError.requestId
            });
            return;
          }
          throw payError;
        }
      }
    }

    // Store in our database
    await pool.query(
      `INSERT INTO invoices 
       (stripe_invoice_id, patient_id, invoice_number, total_amount, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        finalInvoice.id,
        patientId,
        finalInvoice.number,
        finalInvoice.amount_due / 100, // Convert from cents
        finalInvoice.status,
        finalInvoice.due_date ? new Date(finalInvoice.due_date * 1000) : null
      ]
    );

    await auditService.log({
      action: AuditAction.INVOICE_CREATED,
      severity: AuditSeverity.INFO,
      userId: (req as any).auth?.sub,
      patientId,
      resourceType: 'invoice',
      resourceId: finalInvoice.id,
      metadata: { 
        behavior,
        amount: finalInvoice.amount_due / 100,
        status: finalInvoice.status
      }
    });

    res.json({
      invoice_id: finalInvoice.id,
      number: finalInvoice.number,
      status: finalInvoice.status,
      amount_due: finalInvoice.amount_due / 100,
      hosted_url: hostedUrl,
      behavior_executed: behavior
    });
  } catch (error: any) {
    const { status, json } = mapStripeError(error);
    res.status(status).json(json);
  }
};

/**
 * POST /invoices/pay
 * Pay an existing invoice
 */
export const payInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoice_id, use_saved_pm, payment_method_id } = req.body;
    const stripe = getStripeClient();

    // Get the invoice first
    const invoice = await stripe.invoices.retrieve(invoice_id);

    if (invoice.status === 'paid') {
      res.json({
        paid: true,
        already_paid: true,
        hosted_invoice_url: invoice.hosted_invoice_url,
        charge_id: (invoice as any).charge
      });
      return;
    }

    // Handle payment method attachment if provided
    if (payment_method_id) {
      // Attach if not already attached
      try {
        await stripe.paymentMethods.attach(payment_method_id, {
          customer: invoice.customer as string
        });
      } catch (attachError: any) {
        // Ignore if already attached
        if (attachError.code !== 'resource_already_exists') {
          throw attachError;
        }
      }

      // Set as default for this invoice payment
      await stripe.customers.update(invoice.customer as string, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      });
    } else if (use_saved_pm) {
      // Check if customer has a default payment method
      const customer = await stripe.customers.retrieve(invoice.customer as string);
      if (typeof customer !== 'string' && !(customer as any).invoice_settings?.default_payment_method) {
        res.status(402).json({ 
          need_payment_method: true,
          error: 'No default payment method on file'
        });
        return;
      }
    }

    // Pay the invoice
    const paidInvoice = await stripe.invoices.pay(invoice_id);

    // Update our database
    await pool.query(
      `UPDATE invoices 
       SET status = 'paid', paid_at = NOW() 
       WHERE stripe_invoice_id = $1`,
      [invoice_id]
    );

    await auditService.log({
      action: AuditAction.INVOICE_PAID,
      severity: AuditSeverity.INFO,
      userId: (req as any).auth?.sub,
      resourceType: 'invoice',
      resourceId: invoice_id,
      metadata: { 
        amount: paidInvoice.amount_paid / 100,
        payment_method_used: payment_method_id || 'default'
      }
    });

    res.json({
      paid: true,
      hosted_invoice_url: paidInvoice.hosted_invoice_url,
      charge_id: (paidInvoice as any).charge,
      amount_paid: paidInvoice.amount_paid / 100
    });
  } catch (error: any) {
    const { status, json } = mapStripeError(error);
    res.status(status).json(json);
  }
};

/**
 * DELETE /invoices/:id
 * Delete or void an invoice
 */
export const deleteInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const stripe = getStripeClient();

    // Get the invoice
    const invoice = await stripe.invoices.retrieve(id);

    if (invoice.status === 'paid') {
      res.status(400).json({ 
        error: 'Cannot delete a paid invoice',
        requestId: 'n/a'
      });
      return;
    }

    let deleted = false;
    let voided = false;

    if (invoice.status === 'draft') {
      // Can delete draft invoices
      await stripe.invoices.del(id);
      deleted = true;
    } else if (invoice.status === 'open') {
      // Void open invoices
      await stripe.invoices.voidInvoice(id);
      voided = true;
    } else {
      // Mark as uncollectible
      await stripe.invoices.markUncollectible(id);
    }

    // Update our database
    await pool.query(
      `UPDATE invoices 
       SET status = $2, updated_at = NOW() 
       WHERE stripe_invoice_id = $1`,
      [id, voided ? 'void' : 'deleted']
    );

    await auditService.log({
      action: AuditAction.INVOICE_DELETED,
      severity: AuditSeverity.INFO,
      userId: (req as any).auth?.sub,
      resourceType: 'invoice',
      resourceId: id,
      metadata: { 
        action_taken: deleted ? 'deleted' : voided ? 'voided' : 'marked_uncollectible'
      }
    });

    res.json({
      deleted: deleted || voided,
      invoice_id: id,
      action: deleted ? 'deleted' : voided ? 'voided' : 'marked_uncollectible'
    });
  } catch (error: any) {
    const { status, json } = mapStripeError(error);
    res.status(status).json(json);
  }
};

/**
 * GET /diagnostics/stripe
 * Check Stripe configuration and connectivity
 */
export const getStripeDiagnostics = async (req: Request, res: Response): Promise<void> => {
  try {
    const stripe = getStripeClient();
    
    // Test Stripe connectivity
    let stripeConnected = false;
    let stripeVersion = 'unknown';
    let stripeMode = 'unknown';
    
    try {
      // Make a simple API call to test connectivity
      const account = await stripe.accounts.retrieve();
      stripeConnected = true;
      stripeVersion = (stripe as any).VERSION;
      
      // Determine if using test or live keys
      const apiKey = process.env.STRIPE_SECRET_KEY || '';
      stripeMode = apiKey.startsWith('sk_test_') ? 'test' : 'live';
    } catch (error: any) {
      // Connection failed
      stripeConnected = false;
    }
    
    // Check webhook configuration
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const webhookConfigured = !!webhookSecret && webhookSecret.startsWith('whsec_');
    
    // Check database tables
    let dbTablesExist = false;
    try {
      await pool.query('SELECT 1 FROM payment_methods_cached LIMIT 1');
      await pool.query('SELECT 1 FROM invoices LIMIT 1');
      dbTablesExist = true;
    } catch (error) {
      // Tables don't exist
    }
    
    res.json({
      status: 'ok',
      stripe: {
        connected: stripeConnected,
        mode: stripeMode,
        version: stripeVersion,
        webhookConfigured
      },
      database: {
        tablesExist: dbTablesExist
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
};

/**
 * GET /payment-methods/list
 * List saved payment methods
 */
export const listPaymentMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, customerId } = req.query;
    const stripe = getStripeClient();

    let resolvedCustomerId = customerId as string;

    // If patientId provided, look up customer
    if (patientId && !customerId) {
      const result = await pool.query(
        "SELECT stripe_customer_id FROM patients WHERE patient_id = $1",
        [patientId]
      );
      if (!result.rows[0]?.stripe_customer_id) {
        res.json({ payment_methods: [] });
        return;
      }
      resolvedCustomerId = result.rows[0].stripe_customer_id;
    }

    if (!resolvedCustomerId) {
      res.status(400).json({ error: 'Either patientId or customerId required' });
      return;
    }

    // Get from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: resolvedCustomerId,
      type: 'card'
    });

    // Get customer to check default
    const customer = await stripe.customers.retrieve(resolvedCustomerId);
    const defaultPmId = typeof customer !== 'string' ? 
      (customer as any).invoice_settings?.default_payment_method : null;

    // Update our cache
    for (const pm of paymentMethods.data) {
      await pool.query(
        `INSERT INTO payment_methods_cached 
         (payment_method_id, patient_id, stripe_customer_id, brand, last4, 
          exp_month, exp_year, fingerprint, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (payment_method_id) 
         DO UPDATE SET 
           brand = $4, last4 = $5, exp_month = $6, exp_year = $7,
           is_default = $9, updated_at = NOW()`,
        [
          pm.id,
          patientId,
          resolvedCustomerId,
          pm.card?.brand,
          pm.card?.last4,
          pm.card?.exp_month,
          pm.card?.exp_year,
          pm.card?.fingerprint,
          pm.id === defaultPmId
        ]
      );
    }

    res.json({
      payment_methods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
        is_default: pm.id === defaultPmId
      }))
    });
  } catch (error: any) {
    const { status, json } = mapStripeError(error);
    res.status(status).json(json);
  }
};
