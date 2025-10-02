import { Pool } from 'pg';
import Stripe from 'stripe';
import crypto from 'crypto';

interface WebhookEvent {
  id: string;
  stripe_event_id: string;
  type: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  last_attempt_at?: Date;
  next_retry_at?: Date;
  error_message?: string;
  idempotency_key: string;
  created_at: Date;
}

interface WebhookConfig {
  maxRetries: number;
  retryDelayMinutes: number[];
  concurrentProcessing: number;
  staleEventHours: number;
}

export class WebhookProcessorService {
  private pool: Pool;
  private stripe: Stripe;
  private config: WebhookConfig;
  private processingEvents: Set<string> = new Set();

  constructor(pool: Pool, stripe: Stripe, config?: Partial<WebhookConfig>) {
    this.pool = pool;
    this.stripe = stripe;
    this.config = {
      maxRetries: 5,
      retryDelayMinutes: [1, 5, 15, 60, 240], // Exponential backoff
      concurrentProcessing: 10,
      staleEventHours: 24,
      ...config
    };
  }

  // ========== WEBHOOK INTAKE ==========

  async handleWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      
      // Generate idempotency key
      const idempotencyKey = this.generateIdempotencyKey(event.id);

      // Check if event already processed
      const existing = await this.getEventByStripeId(event.id);
      if (existing && existing.status === 'completed') {
        console.log(`Event ${event.id} already processed`);
        return { success: true, eventId: existing.id };
      }

      // Store event for processing
      const storedEvent = await this.storeWebhookEvent({
        stripe_event_id: event.id,
        type: event.type,
        data: event,
        idempotency_key: idempotencyKey
      });

      // Process immediately if capacity available
      if (this.processingEvents.size < this.config.concurrentProcessing) {
        this.processEventAsync(storedEvent.id);
      }

      return { success: true, eventId: storedEvent.id };
    } catch (error: any) {
      console.error('Webhook handling error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to process webhook' 
      };
    }
  }

  // ========== EVENT STORAGE ==========

  private async storeWebhookEvent(eventData: {
    stripe_event_id: string;
    type: string;
    data: any;
    idempotency_key: string;
  }): Promise<WebhookEvent> {
    const result = await this.pool.query(
      `INSERT INTO webhook_events 
       (stripe_event_id, type, data, status, attempts, idempotency_key)
       VALUES ($1, $2, $3, 'pending', 0, $4)
       ON CONFLICT (stripe_event_id) 
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        eventData.stripe_event_id,
        eventData.type,
        JSON.stringify(eventData.data),
        eventData.idempotency_key
      ]
    );
    return result.rows[0];
  }

  private async getEventByStripeId(stripeEventId: string): Promise<WebhookEvent | null> {
    const result = await this.pool.query(
      'SELECT * FROM webhook_events WHERE stripe_event_id = $1',
      [stripeEventId]
    );
    return result.rows[0] || null;
  }

  // ========== EVENT PROCESSING ==========

  private async processEventAsync(eventId: string): Promise<void> {
    // Run in background
    setImmediate(async () => {
      try {
        await this.processEvent(eventId);
      } catch (error) {
        console.error(`Failed to process event ${eventId}:`, error);
      }
    });
  }

  async processEvent(eventId: string): Promise<void> {
    if (this.processingEvents.has(eventId)) {
      console.log(`Event ${eventId} already being processed`);
      return;
    }

    this.processingEvents.add(eventId);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get and lock event for processing
      const result = await client.query(
        `UPDATE webhook_events 
         SET status = 'processing', 
             attempts = attempts + 1,
             last_attempt_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status IN ('pending', 'failed')
         RETURNING *`,
        [eventId]
      );

      if (result.rows.length === 0) {
        console.log(`Event ${eventId} not found or already processed`);
        await client.query('COMMIT');
        return;
      }

      const event = result.rows[0];
      const stripeEvent = JSON.parse(event.data);

      try {
        // Process based on event type
        await this.processEventByType(stripeEvent, event.idempotency_key);

        // Mark as completed
        await client.query(
          `UPDATE webhook_events 
           SET status = 'completed', 
               completed_at = CURRENT_TIMESTAMP,
               error_message = NULL
           WHERE id = $1`,
          [eventId]
        );

        await client.query('COMMIT');
        console.log(`Successfully processed event ${eventId} (${stripeEvent.type})`);
      } catch (processingError: any) {
        await client.query('ROLLBACK');
        
        // Determine if should retry
        const shouldRetry = this.shouldRetryError(processingError);
        const nextRetryAt = shouldRetry 
          ? this.calculateNextRetryTime(event.attempts)
          : null;

        await client.query(
          `UPDATE webhook_events 
           SET status = $1, 
               error_message = $2,
               next_retry_at = $3
           WHERE id = $4`,
          [
            shouldRetry && event.attempts < this.config.maxRetries ? 'failed' : 'failed_permanent',
            processingError.message || 'Unknown error',
            nextRetryAt,
            eventId
          ]
        );

        throw processingError;
      }
    } finally {
      client.release();
      this.processingEvents.delete(eventId);
    }
  }

  private async processEventByType(event: Stripe.Event, idempotencyKey: string): Promise<void> {
    console.log(`Processing ${event.type} event`);

    switch (event.type) {
      // Payment events
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, idempotencyKey);
        break;
      
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, idempotencyKey);
        break;

      // Subscription events
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription, idempotencyKey);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription, idempotencyKey);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription, idempotencyKey);
        break;

      // Invoice events
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, idempotencyKey);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, idempotencyKey);
        break;

      // Customer events
      case 'customer.created':
        await this.handleCustomerCreated(event.data.object as Stripe.Customer, idempotencyKey);
        break;

      case 'customer.updated':
        await this.handleCustomerUpdated(event.data.object as Stripe.Customer, idempotencyKey);
        break;

      // Charge events
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge, idempotencyKey);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  // ========== EVENT HANDLERS ==========

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent, 
    idempotencyKey: string
  ): Promise<void> {
    // Check idempotency
    const processed = await this.checkIdempotency(idempotencyKey);
    if (processed) return;

    // Record transaction
    await this.pool.query(
      `INSERT INTO transactions 
       (type, amount, currency, status, stripe_payment_intent_id, 
        customer_id, processed_at, metadata, idempotency_key)
       SELECT 'charge', $1, $2, 'succeeded', $3, 
              p.id, CURRENT_TIMESTAMP, $4, $5
       FROM patients p 
       WHERE p.stripe_customer_id = $6`,
      [
        paymentIntent.amount / 100, // Convert from cents
        paymentIntent.currency,
        paymentIntent.id,
        JSON.stringify(paymentIntent.metadata || {}),
        idempotencyKey,
        paymentIntent.customer
      ]
    );

    await this.recordIdempotency(idempotencyKey);
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
    idempotencyKey: string
  ): Promise<void> {
    const processed = await this.checkIdempotency(idempotencyKey);
    if (processed) return;

    await this.pool.query(
      `INSERT INTO transactions 
       (type, amount, currency, status, stripe_payment_intent_id, 
        customer_id, failure_code, failure_message, metadata, idempotency_key)
       SELECT 'charge', $1, $2, 'failed', $3, 
              p.id, $4, $5, $6, $7
       FROM patients p 
       WHERE p.stripe_customer_id = $8`,
      [
        paymentIntent.amount / 100,
        paymentIntent.currency,
        paymentIntent.id,
        paymentIntent.last_payment_error?.code || null,
        paymentIntent.last_payment_error?.message || null,
        JSON.stringify(paymentIntent.metadata || {}),
        idempotencyKey,
        paymentIntent.customer
      ]
    );

    await this.recordIdempotency(idempotencyKey);
  }

  private async handleSubscriptionCreated(
    subscription: Stripe.Subscription,
    idempotencyKey: string
  ): Promise<void> {
    const processed = await this.checkIdempotency(idempotencyKey);
    if (processed) return;

    // Update local subscription record
    await this.pool.query(
      `UPDATE subscriptions 
       SET status = $1, 
           current_period_start = $2,
           current_period_end = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_subscription_id = $4`,
      [
        subscription.status,
        new Date((subscription as any).current_period_start * 1000),
        new Date((subscription as any).current_period_end * 1000),
        subscription.id
      ]
    );

    await this.recordIdempotency(idempotencyKey);
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
    idempotencyKey: string
  ): Promise<void> {
    const processed = await this.checkIdempotency(idempotencyKey);
    if (processed) return;

    await this.pool.query(
      `UPDATE subscriptions 
       SET status = $1, 
           current_period_start = $2,
           current_period_end = $3,
           cancel_at_period_end = $4,
           canceled_at = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_subscription_id = $6`,
      [
        subscription.status,
        new Date((subscription as any).current_period_start * 1000),
        new Date((subscription as any).current_period_end * 1000),
        subscription.cancel_at_period_end,
        subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        subscription.id
      ]
    );

    await this.recordIdempotency(idempotencyKey);
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
    idempotencyKey: string
  ): Promise<void> {
    const processed = await this.checkIdempotency(idempotencyKey);
    if (processed) return;

    await this.pool.query(
      `UPDATE subscriptions 
       SET status = 'canceled',
           ended_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );

    await this.recordIdempotency(idempotencyKey);
  }

  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
    idempotencyKey: string
  ): Promise<void> {
    const processed = await this.checkIdempotency(idempotencyKey);
    if (processed) return;

    // Record subscription payment
    if ((invoice as any).subscription) {
      await this.pool.query(
        `INSERT INTO transactions 
         (type, amount, currency, status, customer_id, 
          subscription_id, stripe_charge_id, processed_at, 
          metadata, idempotency_key)
         SELECT 'subscription_payment', $1, $2, 'succeeded', p.id,
                s.id, $3, CURRENT_TIMESTAMP, $4, $5
         FROM patients p
         JOIN subscriptions s ON s.stripe_subscription_id = $6
         WHERE p.stripe_customer_id = $7`,
        [
          invoice.amount_paid / 100,
          invoice.currency,
          (invoice as any).charge as string,
          JSON.stringify({ invoice_id: invoice.id }),
          idempotencyKey,
          (invoice as any).subscription,
          invoice.customer
        ]
      );
    }

    await this.recordIdempotency(idempotencyKey);
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
    idempotencyKey: string
  ): Promise<void> {
    const processed = await this.checkIdempotency(idempotencyKey);
    if (processed) return;

    // Trigger dunning process
    await this.pool.query(
      `INSERT INTO dunning_events 
       (customer_id, subscription_id, invoice_id, amount, 
        currency, attempt_count, next_retry_at)
       SELECT p.id, s.id, $1, $2, $3, $4, 
              CURRENT_TIMESTAMP + INTERVAL '3 days'
       FROM patients p
       LEFT JOIN subscriptions s ON s.stripe_subscription_id = $5
       WHERE p.stripe_customer_id = $6`,
      [
        invoice.id,
        invoice.amount_due / 100,
        invoice.currency,
        invoice.attempt_count,
        (invoice as any).subscription,
        invoice.customer
      ]
    );

    await this.recordIdempotency(idempotencyKey);
  }

  private async handleCustomerCreated(
    customer: Stripe.Customer,
    idempotencyKey: string
  ): Promise<void> {
    const processed = await this.checkIdempotency(idempotencyKey);
    if (processed) return;

    // Log customer creation
    console.log(`Customer created in Stripe: ${customer.id}`);
    await this.recordIdempotency(idempotencyKey);
  }

  private async handleCustomerUpdated(
    customer: Stripe.Customer,
    idempotencyKey: string
  ): Promise<void> {
    const processed = await this.checkIdempotency(idempotencyKey);
    if (processed) return;

    // Update local customer data if needed
    if (customer.email) {
      await this.pool.query(
        `UPDATE patients 
         SET email = COALESCE($1, email),
             updated_at = CURRENT_TIMESTAMP
         WHERE stripe_customer_id = $2`,
        [customer.email, customer.id]
      );
    }

    await this.recordIdempotency(idempotencyKey);
  }

  private async handleChargeRefunded(
    charge: Stripe.Charge,
    idempotencyKey: string
  ): Promise<void> {
    const processed = await this.checkIdempotency(idempotencyKey);
    if (processed) return;

    // Record refund transaction
    await this.pool.query(
      `INSERT INTO transactions 
       (type, amount, currency, status, customer_id,
        stripe_charge_id, processed_at, metadata, idempotency_key)
       SELECT 'refund', $1, $2, 'succeeded', p.id,
              $3, CURRENT_TIMESTAMP, $4, $5
       FROM patients p
       WHERE p.stripe_customer_id = $6`,
      [
        (charge.amount_refunded || 0) / 100,
        charge.currency,
        charge.id,
        JSON.stringify({ original_charge: charge.id }),
        idempotencyKey,
        charge.customer
      ]
    );

    await this.recordIdempotency(idempotencyKey);
  }

  // ========== RETRY LOGIC ==========

  async processFailedEvents(): Promise<void> {
    const events = await this.getRetryableEvents();
    
    for (const event of events) {
      if (this.processingEvents.size >= this.config.concurrentProcessing) {
        break; // Wait for capacity
      }
      this.processEventAsync(event.id);
    }
  }

  private async getRetryableEvents(): Promise<WebhookEvent[]> {
    const result = await this.pool.query(
      `SELECT * FROM webhook_events 
       WHERE status = 'failed' 
       AND attempts < $1
       AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)
       ORDER BY created_at ASC
       LIMIT $2`,
      [this.config.maxRetries, this.config.concurrentProcessing]
    );
    return result.rows;
  }

  private calculateNextRetryTime(attempts: number): Date {
    const delayMinutes = this.config.retryDelayMinutes[
      Math.min(attempts, this.config.retryDelayMinutes.length - 1)
    ];
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
    return nextRetry;
  }

  private shouldRetryError(error: any): boolean {
    // Don't retry client errors (4xx)
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return false;
    }

    // Don't retry certain Stripe errors
    const nonRetryableTypes = [
      'StripeInvalidRequestError',
      'StripeAPIError',
      'StripeAuthenticationError'
    ];

    if (error.type && nonRetryableTypes.includes(error.type)) {
      return false;
    }

    // Retry everything else (network errors, 5xx, etc)
    return true;
  }

  // ========== IDEMPOTENCY ==========

  private generateIdempotencyKey(eventId: string): string {
    return crypto
      .createHash('sha256')
      .update(`${eventId}-${Date.now()}`)
      .digest('hex');
  }

  private async checkIdempotency(key: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM webhook_idempotency WHERE idempotency_key = $1',
      [key]
    );
    return result.rows.length > 0;
  }

  private async recordIdempotency(key: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO webhook_idempotency (idempotency_key, processed_at)
       VALUES ($1, CURRENT_TIMESTAMP)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [key]
    );
  }

  // ========== CLEANUP ==========

  async cleanupOldEvents(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM webhook_events 
       WHERE status IN ('completed', 'failed_permanent')
       AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
       RETURNING id`
    );
    return result.rowCount || 0;
  }

  async cleanupIdempotencyKeys(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM webhook_idempotency 
       WHERE processed_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
       RETURNING idempotency_key`
    );
    return result.rowCount || 0;
  }

  // ========== MONITORING ==========

  async getWebhookStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    processing: number;
    failureRate: number;
    avgProcessingTime: number;
  }> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status IN ('failed', 'failed_permanent')) as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) 
          FILTER (WHERE status = 'completed') as avg_processing_seconds
      FROM webhook_events
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    `);

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total),
      completed: parseInt(stats.completed),
      failed: parseInt(stats.failed),
      pending: parseInt(stats.pending),
      processing: parseInt(stats.processing),
      failureRate: stats.total > 0 ? (stats.failed / stats.total) * 100 : 0,
      avgProcessingTime: parseFloat(stats.avg_processing_seconds || 0)
    };
  }
}
