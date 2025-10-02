/**
 * Stripe Webhook Processor Service
 * HIPAA Compliant - No PHI in Stripe metadata
 * Handles all webhook events with idempotency and ledger updates
 */

import Stripe from "stripe";
import { pool } from "../config/database";
import { getStripeClient } from "../config/stripe.config";
import { logger } from "../lib/logger";

export class StripeWebhookProcessor {
  private stripe: Stripe;

  constructor() {
    this.stripe = getStripeClient();
  }

  /**
   * Process webhook event with idempotency
   */
  async processEvent(event: Stripe.Event): Promise<void> {
    // Check for duplicate processing
    const isDuplicate = await this.checkDuplicateEvent(event.id);
    if (isDuplicate) {
      logger.info(`Skipping duplicate event: ${event.id}`);
      return;
    }

    // Store raw event first
    await this.storeWebhookEvent(event);

    try {
      // Route to appropriate handler
      switch (event.type) {
        // Payment Events
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event);
          break;

        // Charge Events  
        case 'charge.succeeded':
          await this.handleChargeSucceeded(event);
          break;
        case 'charge.failed':
          await this.handleChargeFailed(event);
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event);
          break;
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event);
          break;
        case 'charge.dispute.closed':
          await this.handleDisputeClosed(event);
          break;

        // Customer Events
        case 'customer.created':
          await this.handleCustomerCreated(event);
          break;
        case 'customer.updated':
          await this.handleCustomerUpdated(event);
          break;

        // Subscription Events
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;

        // Invoice Events
        case 'invoice.created':
          await this.handleInvoiceCreated(event);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event);
          break;

        // Payment Method Events
        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event);
          break;
        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(event);
          break;

        // Checkout Session (for external payments)
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event);
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      // Mark event as processed
      await this.markEventProcessed(event.id);
    } catch (error) {
      await this.markEventFailed(event.id, error);
      throw error;
    }
  }

  /**
   * Check if event already processed (idempotency)
   */
  private async checkDuplicateEvent(eventId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT processed FROM stripe_webhook_events WHERE stripe_event_id = $1',
      [eventId]
    );
    return result.rows.length > 0 && result.rows[0].processed;
  }

  /**
   * Store raw webhook event
   */
  private async storeWebhookEvent(event: Stripe.Event): Promise<void> {
    await pool.query(
      `INSERT INTO stripe_webhook_events 
       (stripe_event_id, type, payload, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (stripe_event_id) DO NOTHING`,
      [event.id, event.type, JSON.stringify(event)]
    );
  }

  /**
   * Mark event as processed
   */
  private async markEventProcessed(eventId: string): Promise<void> {
    await pool.query(
      `UPDATE stripe_webhook_events 
       SET processed = true, processed_at = NOW()
       WHERE stripe_event_id = $1`,
      [eventId]
    );
  }

  /**
   * Mark event as failed
   */
  private async markEventFailed(eventId: string, error: any): Promise<void> {
    const errorMessage = error?.message || String(error);
    await pool.query(
      `UPDATE stripe_webhook_events 
       SET processed = false, 
           processed_at = NOW(),
           error_message = $2
       WHERE stripe_event_id = $1`,
      [eventId, errorMessage]
    );
  }

  /**
   * Extract tenant ID from metadata (all Stripe objects should have this)
   */
  private extractTenantId(metadata?: { [key: string]: string }): string | null {
    return metadata?.tenant_id || null;
  }

  /**
   * Create ledger entry for financial tracking
   */
  private async createLedgerEntry(params: {
    tenantId: string;
    source: string;
    sourceId: string;
    amountCents: number;
    currency: string;
    direction: 'debit' | 'credit';
    description?: string;
  }): Promise<void> {
    const { tenantId, source, sourceId, amountCents, currency, direction, description } = params;

    // Get current balance
    const balanceResult = await pool.query(
      `SELECT balance_cents FROM ledger_entries 
       WHERE tenant_id = $1 
       ORDER BY occurred_at DESC, id DESC 
       LIMIT 1`,
      [tenantId]
    );
    
    const previousBalance = balanceResult.rows[0]?.balance_cents || 0;
    const newBalance = direction === 'credit' 
      ? previousBalance + amountCents 
      : previousBalance - amountCents;

    await pool.query(
      `INSERT INTO ledger_entries 
       (tenant_id, source, source_id, amount_cents, currency, direction, balance_cents, description, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [tenantId, source, sourceId, amountCents, currency, direction, newBalance, description]
    );
  }

  // ============================================================
  // PAYMENT INTENT HANDLERS
  // ============================================================

  private async handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const tenantId = this.extractTenantId(paymentIntent.metadata);
    
    if (!tenantId) {
      logger.error(`No tenant_id in payment intent: ${paymentIntent.id}`);
      return;
    }

    // Get or create customer record
    const customerResult = await pool.query(
      `SELECT id FROM stripe_customers WHERE stripe_customer_id = $1`,
      [paymentIntent.customer]
    );
    const customerId = customerResult.rows[0]?.id;

    // Store payment record
    await pool.query(
      `INSERT INTO stripe_payments 
       (tenant_id, customer_id, stripe_payment_intent_id, stripe_charge_id, 
        amount_cents, currency, status, type, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (stripe_payment_intent_id) 
       DO UPDATE SET 
         status = EXCLUDED.status,
         stripe_charge_id = EXCLUDED.stripe_charge_id,
         updated_at = NOW()`,
      [
        tenantId,
        customerId,
        paymentIntent.id,
        paymentIntent.latest_charge,
        paymentIntent.amount,
        paymentIntent.currency,
        'succeeded',
        'one_time',
        paymentIntent.description || 'Payment',
        JSON.stringify(paymentIntent.metadata)
      ]
    );

    // Calculate platform fee (10%)
    const platformFeeCents = Math.floor(paymentIntent.amount * 0.10);
    
    // Create ledger entries
    await this.createLedgerEntry({
      tenantId,
      source: 'payment',
      sourceId: paymentIntent.id,
      amountCents: paymentIntent.amount - platformFeeCents,
      currency: paymentIntent.currency,
      direction: 'credit',
      description: `Payment received (less platform fee)`
    });

    logger.info(`Payment succeeded: ${paymentIntent.id} for tenant ${tenantId}`);
  }

  private async handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    await pool.query(
      `UPDATE stripe_payments 
       SET status = 'failed', updated_at = NOW()
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );

    logger.info(`Payment failed: ${paymentIntent.id}`);
  }

  // ============================================================
  // CHARGE HANDLERS
  // ============================================================

  private async handleChargeSucceeded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;
    
    // Update payment record with charge ID
    await pool.query(
      `UPDATE stripe_payments 
       SET stripe_charge_id = $1, updated_at = NOW()
       WHERE stripe_payment_intent_id = $2`,
      [charge.id, charge.payment_intent]
    );
  }

  private async handleChargeFailed(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;
    
    await pool.query(
      `UPDATE stripe_payments 
       SET status = 'failed', updated_at = NOW()
       WHERE stripe_payment_intent_id = $1`,
      [charge.payment_intent]
    );
  }

  private async handleChargeRefunded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;
    const tenantId = this.extractTenantId(charge.metadata);
    
    if (!tenantId) return;

    // Get payment record
    const paymentResult = await pool.query(
      `SELECT id, amount_cents FROM stripe_payments 
       WHERE stripe_charge_id = $1`,
      [charge.id]
    );
    
    if (paymentResult.rows.length === 0) return;
    
    const payment = paymentResult.rows[0];
    const refundAmount = charge.amount_refunded;

    // Store refund record
    await pool.query(
      `INSERT INTO stripe_refunds 
       (payment_id, stripe_refund_id, amount_cents, currency, status, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        payment.id,
        charge.refunds?.data[0]?.id || 'unknown',
        refundAmount,
        charge.currency,
        'succeeded',
        charge.refunds?.data[0]?.reason || 'requested_by_customer'
      ]
    );

    // Create ledger entry for refund
    await this.createLedgerEntry({
      tenantId,
      source: 'refund',
      sourceId: charge.id,
      amountCents: refundAmount,
      currency: charge.currency,
      direction: 'debit',
      description: 'Refund issued'
    });

    logger.info(`Refund processed: ${charge.id} for ${refundAmount}`);
  }

  // ============================================================
  // DISPUTE HANDLERS
  // ============================================================

  private async handleDisputeCreated(event: Stripe.Event): Promise<void> {
    const dispute = event.data.object as Stripe.Dispute;
    const tenantId = this.extractTenantId(dispute.metadata);
    
    if (!tenantId) return;

    // Get payment record
    const paymentResult = await pool.query(
      `SELECT id FROM stripe_payments WHERE stripe_charge_id = $1`,
      [dispute.charge]
    );
    
    if (paymentResult.rows.length === 0) return;

    // Store dispute record
    await pool.query(
      `INSERT INTO stripe_disputes 
       (payment_id, stripe_dispute_id, amount_cents, currency, reason, status, evidence_due_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (stripe_dispute_id) DO UPDATE 
       SET status = EXCLUDED.status, updated_at = NOW()`,
      [
        paymentResult.rows[0].id,
        dispute.id,
        dispute.amount,
        dispute.currency,
        dispute.reason,
        dispute.status,
        dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : null
      ]
    );

    // Create ledger entry for dispute hold
    await this.createLedgerEntry({
      tenantId,
      source: 'dispute',
      sourceId: dispute.id,
      amountCents: dispute.amount,
      currency: dispute.currency,
      direction: 'debit',
      description: `Dispute created - funds on hold`
    });

    logger.warn(`Dispute created: ${dispute.id} for charge ${dispute.charge}`);
  }

  private async handleDisputeClosed(event: Stripe.Event): Promise<void> {
    const dispute = event.data.object as Stripe.Dispute;
    
    await pool.query(
      `UPDATE stripe_disputes 
       SET status = $2, updated_at = NOW()
       WHERE stripe_dispute_id = $1`,
      [dispute.id, dispute.status]
    );

    // If dispute was won, credit the funds back
    if (dispute.status === 'won') {
      const tenantId = this.extractTenantId(dispute.metadata);
      if (tenantId) {
        await this.createLedgerEntry({
          tenantId,
          source: 'dispute',
          sourceId: dispute.id,
          amountCents: dispute.amount,
          currency: dispute.currency,
          direction: 'credit',
          description: `Dispute won - funds released`
        });
      }
    }

    logger.info(`Dispute closed: ${dispute.id} with status ${dispute.status}`);
  }

  // ============================================================
  // CUSTOMER HANDLERS
  // ============================================================

  private async handleCustomerCreated(event: Stripe.Event): Promise<void> {
    const customer = event.data.object as Stripe.Customer;
    const tenantId = this.extractTenantId(customer.metadata);
    const patientUuid = customer.metadata?.patient_uuid;
    
    if (!tenantId || !patientUuid) {
      logger.error(`Missing required metadata for customer: ${customer.id}`);
      return;
    }

    await pool.query(
      `INSERT INTO stripe_customers 
       (tenant_id, patient_uuid, stripe_customer_id, billing_email, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (stripe_customer_id) DO NOTHING`,
      [
        tenantId,
        patientUuid,
        customer.id,
        customer.email,
        'active'
      ]
    );

    logger.info(`Customer created: ${customer.id}`);
  }

  private async handleCustomerUpdated(event: Stripe.Event): Promise<void> {
    const customer = event.data.object as Stripe.Customer;
    
    await pool.query(
      `UPDATE stripe_customers 
       SET billing_email = $2, updated_at = NOW()
       WHERE stripe_customer_id = $1`,
      [customer.id, customer.email]
    );
  }

  // ============================================================
  // SUBSCRIPTION HANDLERS
  // ============================================================

  private async handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const tenantId = this.extractTenantId(subscription.metadata);
    
    if (!tenantId) return;

    // Get customer record
    const customerResult = await pool.query(
      `SELECT id FROM stripe_customers WHERE stripe_customer_id = $1`,
      [subscription.customer]
    );
    
    if (customerResult.rows.length === 0) return;

    await pool.query(
      `INSERT INTO stripe_subscriptions 
       (tenant_id, customer_id, stripe_subscription_id, stripe_price_id, 
        status, current_period_start, current_period_end, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (stripe_subscription_id) 
       DO UPDATE SET 
         status = EXCLUDED.status,
         current_period_end = EXCLUDED.current_period_end,
         updated_at = NOW()`,
      [
        tenantId,
        customerResult.rows[0].id,
        subscription.id,
        subscription.items.data[0]?.price.id,
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        JSON.stringify(subscription.metadata)
      ]
    );

    logger.info(`Subscription created: ${subscription.id}`);
  }

  private async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    
    await pool.query(
      `UPDATE stripe_subscriptions 
       SET status = $2, 
           current_period_start = $3,
           current_period_end = $4,
           cancel_at_period_end = $5,
           updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [
        subscription.id,
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end
      ]
    );

    logger.info(`Subscription updated: ${subscription.id} to status ${subscription.status}`);
  }

  private async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    
    await pool.query(
      `UPDATE stripe_subscriptions 
       SET status = 'canceled', 
           canceled_at = NOW(),
           updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );

    logger.info(`Subscription canceled: ${subscription.id}`);
  }

  // ============================================================
  // INVOICE HANDLERS
  // ============================================================

  private async handleInvoiceCreated(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const tenantId = this.extractTenantId(invoice.metadata);
    
    if (!tenantId) return;

    // Get customer record
    const customerResult = await pool.query(
      `SELECT id FROM stripe_customers WHERE stripe_customer_id = $1`,
      [invoice.customer]
    );
    
    if (customerResult.rows.length === 0) return;

    await pool.query(
      `INSERT INTO stripe_invoices 
       (tenant_id, customer_id, stripe_invoice_id, stripe_subscription_id,
        amount_due_cents, currency, status, due_date, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (stripe_invoice_id) DO NOTHING`,
      [
        tenantId,
        customerResult.rows[0].id,
        invoice.id,
        invoice.subscription,
        invoice.amount_due,
        invoice.currency,
        invoice.status || 'draft',
        invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        JSON.stringify(invoice.metadata)
      ]
    );
  }

  private async handleInvoicePaid(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const tenantId = this.extractTenantId(invoice.metadata);
    
    await pool.query(
      `UPDATE stripe_invoices 
       SET status = 'paid', 
           amount_paid_cents = $2,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE stripe_invoice_id = $1`,
      [invoice.id, invoice.amount_paid]
    );

    if (tenantId && invoice.amount_paid > 0) {
      // Calculate platform fee
      const platformFeeCents = Math.floor(invoice.amount_paid * 0.10);
      
      // Create ledger entry
      await this.createLedgerEntry({
        tenantId,
        source: 'payment',
        sourceId: invoice.id,
        amountCents: invoice.amount_paid - platformFeeCents,
        currency: invoice.currency,
        direction: 'credit',
        description: `Invoice paid (subscription)`
      });
    }

    logger.info(`Invoice paid: ${invoice.id}`);
  }

  private async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    
    await pool.query(
      `UPDATE stripe_invoices 
       SET status = 'open', updated_at = NOW()
       WHERE stripe_invoice_id = $1`,
      [invoice.id]
    );

    // TODO: Trigger dunning workflow
    logger.warn(`Invoice payment failed: ${invoice.id}`);
  }

  private async handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
    // Similar to invoice.paid
    await this.handleInvoicePaid(event);
  }

  // ============================================================
  // PAYMENT METHOD HANDLERS
  // ============================================================

  private async handlePaymentMethodAttached(event: Stripe.Event): Promise<void> {
    const paymentMethod = event.data.object as Stripe.PaymentMethod;
    
    // Get customer record
    const customerResult = await pool.query(
      `SELECT id FROM stripe_customers WHERE stripe_customer_id = $1`,
      [paymentMethod.customer]
    );
    
    if (customerResult.rows.length === 0) return;

    const card = paymentMethod.card;
    await pool.query(
      `INSERT INTO payment_methods 
       (customer_id, stripe_payment_method_id, type, brand, last4, exp_month, exp_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (stripe_payment_method_id) DO NOTHING`,
      [
        customerResult.rows[0].id,
        paymentMethod.id,
        paymentMethod.type,
        card?.brand,
        card?.last4,
        card?.exp_month,
        card?.exp_year
      ]
    );

    logger.info(`Payment method attached: ${paymentMethod.id}`);
  }

  private async handlePaymentMethodDetached(event: Stripe.Event): Promise<void> {
    const paymentMethod = event.data.object as Stripe.PaymentMethod;
    
    await pool.query(
      `DELETE FROM payment_methods WHERE stripe_payment_method_id = $1`,
      [paymentMethod.id]
    );

    logger.info(`Payment method detached: ${paymentMethod.id}`);
  }

  // ============================================================
  // CHECKOUT SESSION HANDLER (External Payments)
  // ============================================================

  private async handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Extract email for matching
    const email = session.customer_details?.email || session.customer_email;
    
    if (!email) {
      logger.warn(`No email in checkout session: ${session.id}`);
      return;
    }

    // Try to match to existing customer by email
    const customerResult = await pool.query(
      `SELECT sc.*, t.id as tenant_id 
       FROM stripe_customers sc
       JOIN tenants t ON sc.tenant_id = t.id
       WHERE LOWER(sc.billing_email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (customerResult.rows.length > 0) {
      // Matched! Create payment record
      const customer = customerResult.rows[0];
      
      await pool.query(
        `INSERT INTO external_payments 
         (tenant_id, stripe_payment_intent_id, stripe_customer_id, email_seen,
          amount_cents, currency, status, matched_customer_id, matched_confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          customer.tenant_id,
          session.payment_intent,
          session.customer,
          email,
          session.amount_total,
          session.currency,
          'matched',
          customer.id,
          1.0
        ]
      );

      logger.info(`External payment matched: ${session.payment_intent} to customer ${customer.id}`);
    } else {
      // No match - queue for review
      await pool.query(
        `INSERT INTO external_payments 
         (stripe_payment_intent_id, stripe_customer_id, email_seen,
          amount_cents, currency, status, matched_confidence, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          session.payment_intent,
          session.customer,
          email,
          session.amount_total,
          session.currency,
          'pending_review',
          0.0,
          JSON.stringify(session)
        ]
      );

      await pool.query(
        `INSERT INTO unmatched_payments_queue 
         (email_seen, amount_cents, currency, stripe_object_type, stripe_object_id, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          email,
          session.amount_total,
          session.currency,
          'checkout.session',
          session.id,
          'no_matching_customer'
        ]
      );

      logger.warn(`External payment queued for review: ${session.payment_intent}`);
    }
  }
}

// Export singleton instance
export const webhookProcessor = new StripeWebhookProcessor();
