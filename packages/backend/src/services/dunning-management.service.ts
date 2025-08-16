import { Pool } from 'pg';
import Stripe from 'stripe';
import { EmailService } from './email.service';

interface DunningEvent {
  id: string;
  customer_id: string;
  subscription_id?: string;
  invoice_id: string;
  amount: number;
  currency: string;
  attempt_count: number;
  status: 'active' | 'paused' | 'recovered' | 'failed' | 'cancelled';
  next_retry_at?: Date;
  recovered_at?: Date;
  cancelled_at?: Date;
  total_recovery_attempts: number;
  emails_sent: Array<{
    type: string;
    sent_at: Date;
    template_id: string;
  }>;
}

interface DunningStrategy {
  name: string;
  max_attempts: number;
  retry_intervals_days: number[];
  email_templates: {
    initial: string;
    reminder: string;
    final_notice: string;
    success: string;
  };
  actions: {
    pause_subscription_after_days?: number;
    cancel_subscription_after_days?: number;
    downgrade_after_days?: number;
    restrict_access_after_days?: number;
  };
}

interface DunningMetrics {
  total_events: number;
  active_events: number;
  recovery_rate: number;
  average_recovery_time_days: number;
  revenue_recovered: number;
  revenue_lost: number;
  by_attempt: Array<{
    attempt_number: number;
    recovery_count: number;
    recovery_rate: number;
  }>;
}

export class DunningManagementService {
  private pool: Pool;
  private stripe: Stripe;
  private emailService: EmailService;
  
  // Default dunning strategies
  private strategies: Map<string, DunningStrategy> = new Map([
    ['standard', {
      name: 'Standard Dunning',
      max_attempts: 4,
      retry_intervals_days: [3, 5, 7, 7],
      email_templates: {
        initial: 'payment_failed_initial',
        reminder: 'payment_failed_reminder',
        final_notice: 'payment_failed_final',
        success: 'payment_recovered'
      },
      actions: {
        pause_subscription_after_days: 15,
        cancel_subscription_after_days: 30
      }
    }],
    ['aggressive', {
      name: 'Aggressive Dunning',
      max_attempts: 6,
      retry_intervals_days: [1, 2, 3, 5, 7, 10],
      email_templates: {
        initial: 'payment_failed_urgent',
        reminder: 'payment_failed_reminder_urgent',
        final_notice: 'payment_failed_final_urgent',
        success: 'payment_recovered'
      },
      actions: {
        restrict_access_after_days: 3,
        pause_subscription_after_days: 10,
        cancel_subscription_after_days: 25
      }
    }],
    ['gentle', {
      name: 'Gentle Dunning',
      max_attempts: 3,
      retry_intervals_days: [7, 14, 14],
      email_templates: {
        initial: 'payment_failed_gentle',
        reminder: 'payment_failed_reminder_gentle',
        final_notice: 'payment_failed_final_gentle',
        success: 'payment_recovered'
      },
      actions: {
        pause_subscription_after_days: 30,
        cancel_subscription_after_days: 60
      }
    }]
  ]);

  constructor(pool: Pool, stripe: Stripe, emailService: EmailService) {
    this.pool = pool;
    this.stripe = stripe;
    this.emailService = emailService;
  }

  // ========== DUNNING EVENT CREATION ==========

  async createDunningEvent(params: {
    customer_id: string;
    subscription_id?: string;
    invoice_id: string;
    amount: number;
    currency: string;
    strategy?: string;
  }): Promise<DunningEvent> {
    const strategy = this.strategies.get(params.strategy || 'standard')!;
    const nextRetryAt = new Date();
    nextRetryAt.setDate(nextRetryAt.getDate() + strategy.retry_intervals_days[0]);

    const result = await this.pool.query(
      `INSERT INTO dunning_events 
       (customer_id, subscription_id, invoice_id, amount, currency, 
        attempt_count, status, next_retry_at, metadata)
       VALUES ($1, $2, $3, $4, $5, 1, 'active', $6, $7)
       RETURNING *`,
      [
        params.customer_id,
        params.subscription_id || null,
        params.invoice_id,
        params.amount,
        params.currency,
        nextRetryAt,
        JSON.stringify({ strategy: params.strategy || 'standard' })
      ]
    );

    const dunningEvent = result.rows[0];

    // Send initial failure email
    await this.sendDunningEmail(dunningEvent, 'initial');

    return dunningEvent;
  }

  // ========== PAYMENT RETRY PROCESSING ==========

  async processDunningEvents(): Promise<{
    processed: number;
    recovered: number;
    failed: number;
  }> {
    const events = await this.getEventsToProcess();
    const results = {
      processed: 0,
      recovered: 0,
      failed: 0
    };

    for (const event of events) {
      try {
        const recovered = await this.processEvent(event);
        results.processed++;
        if (recovered) {
          results.recovered++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`Failed to process dunning event ${event.id}:`, error);
        results.failed++;
      }
    }

    return results;
  }

  private async getEventsToProcess(): Promise<DunningEvent[]> {
    const result = await this.pool.query(
      `SELECT * FROM dunning_events 
       WHERE status = 'active' 
       AND next_retry_at <= CURRENT_TIMESTAMP
       ORDER BY next_retry_at ASC
       LIMIT 100`
    );
    return result.rows;
  }

  private async processEvent(event: DunningEvent): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update attempt count
      await client.query(
        `UPDATE dunning_events 
         SET total_recovery_attempts = total_recovery_attempts + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [event.id]
      );

      // Get customer and payment method
      const customerResult = await client.query(
        `SELECT p.*, pm.stripe_payment_method_id
         FROM patients p
         LEFT JOIN payment_methods pm ON p.id = pm.customer_id AND pm.is_default = true
         WHERE p.id = $1`,
        [event.customer_id]
      );

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Attempt to collect payment
      const paymentSuccess = await this.retryPayment(
        event.invoice_id,
        customer.stripe_customer_id,
        customer.stripe_payment_method_id
      );

      if (paymentSuccess) {
        // Mark as recovered
        await client.query(
          `UPDATE dunning_events 
           SET status = 'recovered',
               recovered_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [event.id]
        );

        // Update subscription status if needed
        if (event.subscription_id) {
          await client.query(
            `UPDATE subscriptions 
             SET status = 'active'
             WHERE id = $1 AND status IN ('past_due', 'paused')`,
            [event.subscription_id]
          );
        }

        // Send success email
        await this.sendDunningEmail(event, 'success');

        await client.query('COMMIT');
        return true;
      } else {
        // Payment failed - determine next action
        const strategy = this.strategies.get(event.metadata?.strategy || 'standard')!;
        const daysSinceStart = Math.floor(
          (Date.now() - new Date(event.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if we should take any actions
        if (strategy.actions.restrict_access_after_days && 
            daysSinceStart >= strategy.actions.restrict_access_after_days) {
          await this.restrictAccess(event.customer_id);
        }

        if (strategy.actions.pause_subscription_after_days && 
            daysSinceStart >= strategy.actions.pause_subscription_after_days &&
            event.subscription_id) {
          await this.pauseSubscription(event.subscription_id);
        }

        if (strategy.actions.cancel_subscription_after_days && 
            daysSinceStart >= strategy.actions.cancel_subscription_after_days) {
          await this.cancelDunningEvent(event.id, 'max_attempts_reached');
          await client.query('COMMIT');
          return false;
        }

        // Schedule next retry
        const nextAttempt = event.total_recovery_attempts + 1;
        if (nextAttempt < strategy.max_attempts) {
          const retryInterval = strategy.retry_intervals_days[
            Math.min(nextAttempt, strategy.retry_intervals_days.length - 1)
          ];
          const nextRetryAt = new Date();
          nextRetryAt.setDate(nextRetryAt.getDate() + retryInterval);

          await client.query(
            `UPDATE dunning_events 
             SET next_retry_at = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [nextRetryAt, event.id]
          );

          // Send reminder email
          await this.sendDunningEmail(event, 'reminder');
        } else {
          // Max attempts reached
          await this.cancelDunningEvent(event.id, 'max_attempts_reached');
        }

        await client.query('COMMIT');
        return false;
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async retryPayment(
    invoiceId: string,
    stripeCustomerId: string,
    paymentMethodId?: string
  ): Promise<boolean> {
    try {
      // Get invoice from Stripe
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      
      if (invoice.status === 'paid') {
        return true; // Already paid
      }

      // Update payment method if provided
      if (paymentMethodId && invoice.subscription) {
        await this.stripe.subscriptions.update(invoice.subscription as string, {
          default_payment_method: paymentMethodId
        });
      }

      // Attempt to pay invoice
      const paidInvoice = await this.stripe.invoices.pay(invoiceId, {
        payment_method: paymentMethodId
      });

      return paidInvoice.status === 'paid';
    } catch (error: any) {
      console.error(`Payment retry failed for invoice ${invoiceId}:`, error.message);
      return false;
    }
  }

  // ========== DUNNING ACTIONS ==========

  private async restrictAccess(customerId: string): Promise<void> {
    // Implement access restriction logic
    await this.pool.query(
      `UPDATE patients 
       SET account_status = 'restricted',
           account_status_reason = 'payment_failure',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [customerId]
    );

    // Log the action
    await this.pool.query(
      `INSERT INTO billing_audit_log 
       (entity_type, entity_id, action, actor_type, metadata)
       VALUES ('customer', $1, 'access_restricted', 'system', $2)`,
      [customerId, JSON.stringify({ reason: 'dunning_policy' })]
    );
  }

  private async pauseSubscription(subscriptionId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get subscription
      const subResult = await client.query(
        'SELECT * FROM subscriptions WHERE id = $1',
        [subscriptionId]
      );

      if (subResult.rows.length === 0) {
        throw new Error('Subscription not found');
      }

      const subscription = subResult.rows[0];

      // Pause in Stripe
      if (subscription.stripe_subscription_id) {
        await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
          pause_collection: {
            behavior: 'mark_uncollectible'
          }
        });
      }

      // Update local record
      await client.query(
        `UPDATE subscriptions 
         SET status = 'paused',
             pause_collection = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify({ behavior: 'mark_uncollectible', reason: 'dunning' }), subscriptionId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelDunningEvent(
    eventId: string,
    reason: 'customer_paid' | 'manually_cancelled' | 'max_attempts_reached'
  ): Promise<void> {
    const result = await this.pool.query(
      `UPDATE dunning_events 
       SET status = $1,
           cancelled_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP,
           metadata = jsonb_set(metadata, '{cancellation_reason}', $2)
       WHERE id = $3
       RETURNING *`,
      [
        reason === 'customer_paid' ? 'recovered' : 'cancelled',
        JSON.stringify(reason),
        eventId
      ]
    );

    const event = result.rows[0];

    // Cancel subscription if max attempts reached
    if (reason === 'max_attempts_reached' && event.subscription_id) {
      await this.cancelSubscription(event.subscription_id);
      await this.sendDunningEmail(event, 'final_notice');
    }
  }

  private async cancelSubscription(subscriptionId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get subscription
      const subResult = await client.query(
        'SELECT * FROM subscriptions WHERE id = $1',
        [subscriptionId]
      );

      if (subResult.rows.length === 0) {
        throw new Error('Subscription not found');
      }

      const subscription = subResult.rows[0];

      // Cancel in Stripe
      if (subscription.stripe_subscription_id) {
        await this.stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      }

      // Update local record
      await client.query(
        `UPDATE subscriptions 
         SET status = 'canceled',
             ended_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP,
             metadata = jsonb_set(metadata, '{cancellation_reason}', '"dunning_failure"')
         WHERE id = $1`,
        [subscriptionId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ========== EMAIL COMMUNICATION ==========

  private async sendDunningEmail(
    event: DunningEvent,
    emailType: 'initial' | 'reminder' | 'final_notice' | 'success'
  ): Promise<void> {
    try {
      // Get customer details
      const customerResult = await this.pool.query(
        'SELECT * FROM patients WHERE id = $1',
        [event.customer_id]
      );

      if (customerResult.rows.length === 0) {
        return;
      }

      const customer = customerResult.rows[0];
      const strategy = this.strategies.get(event.metadata?.strategy || 'standard')!;
      const templateId = strategy.email_templates[emailType];

      // Send email
      await this.emailService.sendTransactionalEmail({
        to: customer.email,
        template_id: templateId,
        template_data: {
          customer_name: customer.first_name,
          amount: event.amount,
          currency: event.currency,
          invoice_id: event.invoice_id,
          attempt_number: event.total_recovery_attempts,
          next_retry_date: event.next_retry_at,
          update_payment_link: `${process.env.FRONTEND_URL}/billing/update-payment-method`
        }
      });

      // Record email sent
      await this.pool.query(
        `UPDATE dunning_events 
         SET emails_sent = emails_sent || $1::jsonb
         WHERE id = $2`,
        [
          JSON.stringify({
            type: emailType,
            sent_at: new Date(),
            template_id: templateId
          }),
          event.id
        ]
      );
    } catch (error) {
      console.error(`Failed to send dunning email for event ${event.id}:`, error);
    }
  }

  // ========== REPORTING & ANALYTICS ==========

  async getDunningMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<DunningMetrics> {
    // Overall metrics
    const overallResult = await this.pool.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'active') as active_events,
        COUNT(*) FILTER (WHERE status = 'recovered') as recovered_events,
        SUM(CASE WHEN status = 'recovered' THEN amount ELSE 0 END) as revenue_recovered,
        SUM(CASE WHEN status IN ('failed', 'cancelled') THEN amount ELSE 0 END) as revenue_lost,
        AVG(CASE 
          WHEN status = 'recovered' 
          THEN EXTRACT(EPOCH FROM (recovered_at - created_at)) / 86400
          ELSE NULL 
        END) as avg_recovery_days
      FROM dunning_events
      WHERE created_at >= $1 AND created_at <= $2
    `, [startDate, endDate]);

    const overall = overallResult.rows[0];

    // Recovery by attempt number
    const byAttemptResult = await this.pool.query(`
      SELECT 
        total_recovery_attempts as attempt_number,
        COUNT(*) FILTER (WHERE status = 'recovered') as recovery_count,
        COUNT(*) as total_count
      FROM dunning_events
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY total_recovery_attempts
      ORDER BY total_recovery_attempts
    `, [startDate, endDate]);

    const byAttempt = byAttemptResult.rows.map(row => ({
      attempt_number: row.attempt_number,
      recovery_count: parseInt(row.recovery_count),
      recovery_rate: row.total_count > 0 ? 
        (parseInt(row.recovery_count) / parseInt(row.total_count)) * 100 : 0
    }));

    return {
      total_events: parseInt(overall.total_events),
      active_events: parseInt(overall.active_events),
      recovery_rate: overall.total_events > 0 ? 
        (parseInt(overall.recovered_events) / parseInt(overall.total_events)) * 100 : 0,
      average_recovery_time_days: parseFloat(overall.avg_recovery_days) || 0,
      revenue_recovered: parseFloat(overall.revenue_recovered) || 0,
      revenue_lost: parseFloat(overall.revenue_lost) || 0,
      by_attempt: byAttempt
    };
  }

  async getCustomerDunningHistory(customerId: string): Promise<DunningEvent[]> {
    const result = await this.pool.query(
      `SELECT * FROM dunning_events 
       WHERE customer_id = $1 
       ORDER BY created_at DESC`,
      [customerId]
    );
    return result.rows;
  }

  async getDunningForecast(days: number = 30): Promise<{
    expected_recoveries: number;
    expected_revenue: number;
    at_risk_subscriptions: number;
    at_risk_revenue: number;
  }> {
    const result = await this.pool.query(`
      WITH active_dunning AS (
        SELECT 
          de.*,
          s.plan_id,
          bp.amount as subscription_amount
        FROM dunning_events de
        LEFT JOIN subscriptions s ON de.subscription_id = s.id
        LEFT JOIN billing_plans bp ON s.plan_id = bp.id
        WHERE de.status = 'active'
      ),
      historical_recovery AS (
        SELECT 
          AVG(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) as recovery_rate,
          AVG(CASE 
            WHEN status = 'recovered' 
            THEN EXTRACT(EPOCH FROM (recovered_at - created_at)) / 86400
            ELSE NULL 
          END) as avg_days_to_recover
        FROM dunning_events
        WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
      )
      SELECT 
        COUNT(ad.*) as active_events,
        SUM(ad.amount) as at_risk_revenue,
        COUNT(DISTINCT ad.subscription_id) as at_risk_subscriptions,
        hr.recovery_rate,
        hr.avg_days_to_recover
      FROM active_dunning ad
      CROSS JOIN historical_recovery hr
      GROUP BY hr.recovery_rate, hr.avg_days_to_recover
    `);

    if (result.rows.length === 0) {
      return {
        expected_recoveries: 0,
        expected_revenue: 0,
        at_risk_subscriptions: 0,
        at_risk_revenue: 0
      };
    }

    const data = result.rows[0];
    const recoveryRate = parseFloat(data.recovery_rate) || 0.5;

    return {
      expected_recoveries: Math.round(parseInt(data.active_events) * recoveryRate),
      expected_revenue: parseFloat(data.at_risk_revenue) * recoveryRate,
      at_risk_subscriptions: parseInt(data.at_risk_subscriptions),
      at_risk_revenue: parseFloat(data.at_risk_revenue)
    };
  }

  // ========== STRATEGY MANAGEMENT ==========

  async updateDunningStrategy(
    name: string,
    strategy: DunningStrategy
  ): Promise<void> {
    this.strategies.set(name, strategy);
    
    // Persist to database if needed
    await this.pool.query(
      `INSERT INTO dunning_strategies (name, configuration)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE
       SET configuration = $2, updated_at = CURRENT_TIMESTAMP`,
      [name, JSON.stringify(strategy)]
    );
  }

  async assignStrategyToCustomer(
    customerId: string,
    strategyName: string
  ): Promise<void> {
    if (!this.strategies.has(strategyName)) {
      throw new Error(`Unknown dunning strategy: ${strategyName}`);
    }

    await this.pool.query(
      `UPDATE patients 
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb), 
         '{dunning_strategy}', 
         $1
       )
       WHERE id = $2`,
      [JSON.stringify(strategyName), customerId]
    );
  }

  getAvailableStrategies(): Array<{ name: string; strategy: DunningStrategy }> {
    return Array.from(this.strategies.entries()).map(([name, strategy]) => ({
      name,
      strategy
    }));
  }
}
