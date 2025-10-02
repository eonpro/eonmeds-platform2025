/**
 * Stripe Payment Routes
 * Handles SetupIntents, PaymentIntents, Subscriptions
 * HIPAA Compliant - No PHI in Stripe
 */

import { Router, Request, Response } from 'express';
import { StripeBillingService } from '../services/stripe-billing.service';
import { pool } from '../config/database';
import { logger } from '../lib/logger';
import { authenticateJWT } from '../middleware/auth';

const router = Router();
const stripeBilling = new StripeBillingService();

/**
 * Get or create Stripe customer for a patient
 * Creates tenant association automatically
 */
router.post('/payments/customer', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { patientId, email, name, tenantId } = req.body;
    
    if (!patientId || !email || !tenantId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if customer already exists
    const existingResult = await pool.query(
      `SELECT stripe_customer_id FROM stripe_customers 
       WHERE tenant_id = $1 AND patient_uuid = $2`,
      [tenantId, patientId]
    );

    let stripeCustomer;
    if (existingResult.rows.length > 0) {
      // Return existing customer
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      stripeCustomer = await stripe.customers.retrieve(existingResult.rows[0].stripe_customer_id);
    } else {
      // Create new Stripe customer with metadata
      stripeCustomer = await stripeBilling.getOrCreateCustomer({
        email,
        name,
        metadata: {
          tenant_id: tenantId,
          patient_uuid: patientId,
          environment: process.env.NODE_ENV || 'production'
        },
        patientId
      });

      // Store in our database
      await pool.query(
        `INSERT INTO stripe_customers 
         (tenant_id, patient_uuid, stripe_customer_id, billing_email, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (stripe_customer_id) DO NOTHING`,
        [tenantId, patientId, stripeCustomer.id, email, 'active']
      );
    }

    res.json({
      customerId: stripeCustomer.id,
      email: stripeCustomer.email
    });
  } catch (error: any) {
    logger.error(`Error creating customer: ${error.message}`);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

/**
 * Create SetupIntent for saving a payment method
 */
router.post('/payments/setup-intent', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;
    
    if (!customerId) {
      res.status(400).json({ error: 'Customer ID required' });
      return;
    }

    const setupIntent = await stripeBilling.createSetupIntent(customerId);
    
    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    });
  } catch (error: any) {
    logger.error(`Error creating setup intent: ${error.message}`);
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
});

/**
 * List saved payment methods for a customer
 */
router.get('/payments/methods/:customerId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    
    const paymentMethods = await stripeBilling.listPaymentMethods(customerId);
    
    // Get our stored payment methods with default flag
    const dbResult = await pool.query(
      `SELECT stripe_payment_method_id, is_default 
       FROM payment_methods pm
       JOIN stripe_customers sc ON pm.customer_id = sc.id
       WHERE sc.stripe_customer_id = $1`,
      [customerId]
    );
    
    const dbMethods = dbResult.rows.reduce((acc, row) => {
      acc[row.stripe_payment_method_id] = row.is_default;
      return acc;
    }, {} as Record<string, boolean>);
    
    const methods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year
      } : null,
      isDefault: dbMethods[pm.id] || false
    }));
    
    res.json({ paymentMethods: methods });
  } catch (error: any) {
    logger.error(`Error listing payment methods: ${error.message}`);
    res.status(500).json({ error: 'Failed to list payment methods' });
  }
});

/**
 * Set default payment method
 */
router.post('/payments/methods/default', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { customerId, paymentMethodId } = req.body;
    
    if (!customerId || !paymentMethodId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Update Stripe customer default
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // Update our database
    const customerResult = await pool.query(
      'SELECT id FROM stripe_customers WHERE stripe_customer_id = $1',
      [customerId]
    );
    
    if (customerResult.rows.length > 0) {
      // Clear existing default
      await pool.query(
        'UPDATE payment_methods SET is_default = false WHERE customer_id = $1',
        [customerResult.rows[0].id]
      );
      
      // Set new default
      await pool.query(
        'UPDATE payment_methods SET is_default = true WHERE stripe_payment_method_id = $1',
        [paymentMethodId]
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Error setting default payment method: ${error.message}`);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
});

/**
 * Delete payment method
 */
router.delete('/payments/methods/:paymentMethodId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { paymentMethodId } = req.params;
    
    await stripeBilling.detachPaymentMethod(paymentMethodId);
    
    // Remove from our database
    await pool.query(
      'DELETE FROM payment_methods WHERE stripe_payment_method_id = $1',
      [paymentMethodId]
    );
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Error deleting payment method: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

/**
 * Create one-off charge with PaymentIntent
 */
router.post('/payments/charge', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { 
      customerId, 
      amountCents, 
      currency = 'usd', 
      paymentMethodId,
      description,
      orderId,
      tenantId
    } = req.body;
    
    if (!customerId || !amountCents || !tenantId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const paymentIntent = await stripeBilling.createPaymentIntent({
      amountInCents: amountCents,
      currency,
      customerId,
      paymentMethodId,
      description: description || 'Telehealth Services', // Generic description
      metadata: {
        tenant_id: tenantId,
        order_id: orderId || '',
        environment: process.env.NODE_ENV || 'production'
      },
      offSession: true,
      confirm: !!paymentMethodId // Auto-confirm if payment method provided
    });

    // Store payment record
    const customerResult = await pool.query(
      'SELECT id FROM stripe_customers WHERE stripe_customer_id = $1',
      [customerId]
    );
    
    if (customerResult.rows.length > 0) {
      const platformFeeCents = Math.floor(amountCents * 0.10); // 10% platform fee
      
      await pool.query(
        `INSERT INTO stripe_payments 
         (tenant_id, customer_id, stripe_payment_intent_id, amount_cents, 
          currency, status, type, description, platform_fee_cents, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          tenantId,
          customerResult.rows[0].id,
          paymentIntent.id,
          amountCents,
          currency,
          paymentIntent.status,
          'one_time',
          description || 'Telehealth Services',
          platformFeeCents,
          JSON.stringify({ order_id: orderId })
        ]
      );
    }

    res.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      requiresAction: paymentIntent.status === 'requires_action'
    });
  } catch (error: any) {
    logger.error(`Error creating charge: ${error.message}`);
    res.status(500).json({ error: 'Failed to create charge' });
  }
});

/**
 * Create refund
 */
router.post('/payments/refund', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, amountCents, reason } = req.body;
    
    if (!paymentIntentId) {
      res.status(400).json({ error: 'Payment Intent ID required' });
      return;
    }

    const refund = await stripeBilling.refund({
      paymentIntentId,
      amountInCents: amountCents, // If not provided, full refund
      reason: reason || 'requested_by_customer'
    });

    res.json({
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status
    });
  } catch (error: any) {
    logger.error(`Error creating refund: ${error.message}`);
    res.status(500).json({ error: 'Failed to create refund' });
  }
});

/**
 * Create subscription
 */
router.post('/payments/subscription', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { customerId, priceId, tenantId } = req.body;
    
    if (!customerId || !priceId || !tenantId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const subscription = await stripeBilling.createSubscription({
      customerId,
      priceId,
      metadata: {
        tenant_id: tenantId,
        environment: process.env.NODE_ENV || 'production'
      },
      paymentBehavior: 'default_incomplete',
      paymentSettings: {
        save_default_payment_method: 'on_subscription'
      }
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      status: subscription.status
    });
  } catch (error: any) {
    logger.error(`Error creating subscription: ${error.message}`);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * Cancel subscription
 */
router.post('/payments/subscription/cancel', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { subscriptionId, immediate = false } = req.body;
    
    if (!subscriptionId) {
      res.status(400).json({ error: 'Subscription ID required' });
      return;
    }

    const subscription = await stripeBilling.cancelSubscription(
      subscriptionId, 
      !immediate // cancelAtPeriodEnd
    );

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null
    });
  } catch (error: any) {
    logger.error(`Error canceling subscription: ${error.message}`);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * Create billing portal session
 */
router.post('/payments/billing-portal', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { customerId, returnUrl } = req.body;
    
    if (!customerId) {
      res.status(400).json({ error: 'Customer ID required' });
      return;
    }

    const session = await stripeBilling.createBillingPortalSession(
      customerId,
      returnUrl || `${process.env.FRONTEND_URL}/billing`
    );

    res.json({ url: session.url });
  } catch (error: any) {
    logger.error(`Error creating billing portal session: ${error.message}`);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

/**
 * Get payment history for a customer
 */
router.get('/payments/history/:customerId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await pool.query(
      `SELECT 
        p.stripe_payment_intent_id as id,
        p.amount_cents,
        p.currency,
        p.status,
        p.type,
        p.description,
        p.created_at,
        r.stripe_refund_id,
        r.amount_cents as refund_amount
       FROM stripe_payments p
       LEFT JOIN stripe_refunds r ON r.payment_id = p.id
       JOIN stripe_customers sc ON p.customer_id = sc.id
       WHERE sc.stripe_customer_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [customerId, limit, offset]
    );

    const payments = result.rows.map(row => ({
      id: row.id,
      amount: row.amount_cents,
      currency: row.currency,
      status: row.status,
      type: row.type,
      description: row.description,
      date: row.created_at,
      refund: row.stripe_refund_id ? {
        id: row.stripe_refund_id,
        amount: row.refund_amount
      } : null
    }));

    res.json({ payments });
  } catch (error: any) {
    logger.error(`Error fetching payment history: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

/**
 * Get tenant ledger (for admin)
 */
router.get('/payments/ledger/:tenantId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        source,
        source_id,
        amount_cents,
        currency,
        direction,
        balance_cents,
        description,
        occurred_at
      FROM ledger_entries
      WHERE tenant_id = $1
    `;
    
    const params: any[] = [tenantId];
    
    if (startDate) {
      query += ' AND occurred_at >= $2';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND occurred_at <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    query += ' ORDER BY occurred_at DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    
    res.json({
      entries: result.rows,
      currentBalance: result.rows[0]?.balance_cents || 0
    });
  } catch (error: any) {
    logger.error(`Error fetching ledger: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

export default router;
