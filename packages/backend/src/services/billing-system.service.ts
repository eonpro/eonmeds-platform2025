import { Pool } from 'pg';
import Stripe from 'stripe';
import {
  BillingPlan,
  Subscription,
  Transaction,
  PaymentMethod,
  CreatePlanDTO,
  CreateSubscriptionDTO,
  UpdateSubscriptionDTO,
  ProcessPaymentDTO,
  RefundPaymentDTO,
  RevenueReport,
  CustomerMetrics
} from '../models/billing.models';

export class BillingSystemService {
  private pool: Pool;
  private stripe: Stripe;

  constructor(pool: Pool, stripe: Stripe) {
    this.pool = pool;
    this.stripe = stripe;
  }

  // ========== BILLING PLANS ==========

  async createBillingPlan(planData: CreatePlanDTO): Promise<BillingPlan> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create Stripe product and price
      const product = await this.stripe.products.create({
        name: planData.name,
        description: planData.description,
        metadata: planData.metadata || {}
      });

      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(planData.amount * 100), // Convert to cents
        currency: planData.currency || 'usd',
        recurring: {
          interval: planData.interval,
          interval_count: planData.interval_count || 1
        }
      });

      // Save to database
      const result = await client.query(
        `INSERT INTO billing_plans 
         (name, description, amount, currency, interval, interval_count, 
          trial_period_days, features, metadata, stripe_product_id, stripe_price_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          planData.name,
          planData.description,
          planData.amount,
          planData.currency || 'USD',
          planData.interval,
          planData.interval_count || 1,
          planData.trial_period_days || 0,
          JSON.stringify(planData.features || []),
          JSON.stringify(planData.metadata || {}),
          product.id,
          price.id
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getBillingPlans(activeOnly = true): Promise<BillingPlan[]> {
    const query = activeOnly
      ? 'SELECT * FROM billing_plans WHERE active = true ORDER BY amount ASC'
      : 'SELECT * FROM billing_plans ORDER BY amount ASC';
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getBillingPlan(planId: string): Promise<BillingPlan | null> {
    const result = await this.pool.query(
      'SELECT * FROM billing_plans WHERE id = $1',
      [planId]
    );
    return result.rows[0] || null;
  }

  // ========== SUBSCRIPTIONS ==========

  async createSubscription(data: CreateSubscriptionDTO): Promise<Subscription> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get customer's Stripe ID
      const customerResult = await client.query(
        'SELECT stripe_customer_id FROM patients WHERE id = $1',
        [data.customer_id]
      );

      if (!customerResult.rows[0]?.stripe_customer_id) {
        throw new Error('Customer does not have a Stripe ID');
      }

      const stripeCustomerId = customerResult.rows[0].stripe_customer_id;

      // Get plan details
      const plan = await this.getBillingPlan(data.plan_id);
      if (!plan || !plan.stripe_price_id) {
        throw new Error('Invalid billing plan');
      }

      // Create Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: plan.stripe_price_id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: data.trial_period_days || plan.trial_period_days,
        metadata: data.metadata || {}
      });

      // Save to database
      const result = await client.query(
        `INSERT INTO subscriptions 
         (customer_id, plan_id, status, current_period_start, current_period_end,
          trial_start, trial_end, stripe_subscription_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          data.customer_id,
          data.plan_id,
          stripeSubscription.status,
          new Date((stripeSubscription as any).current_period_start * 1000),
          new Date((stripeSubscription as any).current_period_end * 1000),
          stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
          stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
          stripeSubscription.id,
          JSON.stringify(data.metadata || {})
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSubscription(subscriptionId: string, data: UpdateSubscriptionDTO): Promise<Subscription> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get subscription
      const subResult = await client.query(
        'SELECT * FROM subscriptions WHERE id = $1',
        [subscriptionId]
      );

      if (!subResult.rows[0]) {
        throw new Error('Subscription not found');
      }

      const subscription = subResult.rows[0];

      // Update Stripe subscription
      const updateData: Stripe.SubscriptionUpdateParams = {};
      
      if (data.cancel_at_period_end !== undefined) {
        updateData.cancel_at_period_end = data.cancel_at_period_end;
      }

      if (data.pause_collection) {
        updateData.pause_collection = {
          behavior: data.pause_collection.behavior,
          resumes_at: data.pause_collection.resumes_at ? Math.floor(data.pause_collection.resumes_at.getTime() / 1000) : undefined
        } as any;
      }

      if (data.metadata) {
        updateData.metadata = data.metadata;
      }

      if (Object.keys(updateData).length > 0) {
        await this.stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          updateData
        );
      }

      // Update database
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.cancel_at_period_end !== undefined) {
        updates.push(`cancel_at_period_end = $${paramCount++}`);
        values.push(data.cancel_at_period_end);
      }

      if (data.pause_collection) {
        updates.push(`pause_collection = $${paramCount++}`);
        values.push(JSON.stringify(data.pause_collection));
      }

      if (data.metadata) {
        updates.push(`metadata = $${paramCount++}`);
        values.push(JSON.stringify(data.metadata));
      }

      if (updates.length > 0) {
        values.push(subscriptionId);
        const updateQuery = `
          UPDATE subscriptions 
          SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramCount}
          RETURNING *
        `;
        const result = await client.query(updateQuery, values);
        await client.query('COMMIT');
        return result.rows[0];
      }

      await client.query('COMMIT');
      return subscription;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelSubscription(subscriptionId: string, immediately = false): Promise<Subscription> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get subscription
      const subResult = await client.query(
        'SELECT * FROM subscriptions WHERE id = $1',
        [subscriptionId]
      );

      if (!subResult.rows[0]) {
        throw new Error('Subscription not found');
      }

      const subscription = subResult.rows[0];

      // Cancel in Stripe
      if (immediately) {
        await this.stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      } else {
        await this.stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          { cancel_at_period_end: true }
        );
      }

      // Update database
      const result = await client.query(
        `UPDATE subscriptions 
         SET status = $1, cancel_at_period_end = $2, 
             canceled_at = $3, ended_at = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [
          immediately ? 'canceled' : subscription.status,
          !immediately,
          new Date(),
          immediately ? new Date() : null,
          subscriptionId
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async pauseSubscription(subscriptionId: string, resumeAt?: Date): Promise<Subscription> {
    const pauseData: UpdateSubscriptionDTO = {
      pause_collection: {
        behavior: 'mark_uncollectible',
        resumes_at: resumeAt
      }
    };
    return this.updateSubscription(subscriptionId, pauseData);
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    return this.updateSubscription(subscriptionId, { pause_collection: undefined });
  }

  // ========== TRANSACTIONS ==========

  async processPayment(data: ProcessPaymentDTO): Promise<Transaction> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get customer's Stripe ID
      const customerResult = await client.query(
        'SELECT stripe_customer_id FROM patients WHERE id = $1',
        [data.customer_id]
      );

      if (!customerResult.rows[0]?.stripe_customer_id) {
        throw new Error('Customer does not have a Stripe ID');
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100),
        currency: data.currency || 'usd',
        customer: customerResult.rows[0].stripe_customer_id,
        payment_method: data.payment_method_id,
        confirm: true,
        metadata: data.metadata || {}
      });

      // Record transaction
      const result = await client.query(
        `INSERT INTO transactions 
         (type, amount, currency, status, customer_id, invoice_id, 
          payment_method_id, stripe_payment_intent_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          'charge',
          data.amount,
          data.currency || 'USD',
          paymentIntent.status === 'succeeded' ? 'succeeded' : 'processing',
          data.customer_id,
          data.invoice_id || null,
          data.payment_method_id,
          paymentIntent.id,
          JSON.stringify(data.metadata || {})
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async recordTransaction(transactionData: Partial<Transaction>): Promise<Transaction> {
    const result = await this.pool.query(
      `INSERT INTO transactions 
       (type, amount, currency, status, customer_id, invoice_id, 
        subscription_id, payment_method_id, stripe_payment_intent_id, 
        stripe_charge_id, processed_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        transactionData.type,
        transactionData.amount,
        transactionData.currency || 'USD',
        transactionData.status,
        transactionData.customer_id,
        transactionData.invoice_id || null,
        transactionData.subscription_id || null,
        transactionData.payment_method_id || null,
        transactionData.stripe_payment_intent_id || null,
        transactionData.stripe_charge_id || null,
        transactionData.processed_at || null,
        JSON.stringify(transactionData.metadata || {})
      ]
    );
    return result.rows[0];
  }

  // ========== PAYMENT METHODS ==========

  async savePaymentMethod(
    customerId: string,
    paymentMethodId: string,
    setAsDefault = false
  ): Promise<PaymentMethod> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get customer's Stripe ID
      const customerResult = await client.query(
        'SELECT stripe_customer_id FROM patients WHERE id = $1',
        [customerId]
      );

      if (!customerResult.rows[0]?.stripe_customer_id) {
        throw new Error('Customer does not have a Stripe ID');
      }

      // Attach payment method to customer in Stripe
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerResult.rows[0].stripe_customer_id
      });

      // Get payment method details
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

      // If setting as default, update other methods
      if (setAsDefault) {
        await client.query(
          'UPDATE payment_methods SET is_default = false WHERE customer_id = $1',
          [customerId]
        );

        // Set as default in Stripe
        await this.stripe.customers.update(customerResult.rows[0].stripe_customer_id, {
          invoice_settings: { default_payment_method: paymentMethodId }
        });
      }

      // Save to database
      const result = await client.query(
        `INSERT INTO payment_methods 
         (customer_id, type, brand, last4, exp_month, exp_year, 
          is_default, stripe_payment_method_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          customerId,
          paymentMethod.type,
          paymentMethod.card?.brand || null,
          paymentMethod.card?.last4 || null,
          paymentMethod.card?.exp_month || null,
          paymentMethod.card?.exp_year || null,
          setAsDefault,
          paymentMethodId
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    const result = await this.pool.query(
      'SELECT * FROM payment_methods WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC',
      [customerId]
    );
    return result.rows;
  }

  // ========== FINANCIAL REPORTING ==========

  async getRevenueReport(startDate: Date, endDate: Date): Promise<RevenueReport> {
    const client = await this.pool.connect();
    try {
      // Get revenue metrics
      const revenueResult = await client.query(
        `SELECT 
           SUM(CASE WHEN type = 'charge' AND status = 'succeeded' THEN amount ELSE 0 END) as total_revenue,
           SUM(CASE WHEN type = 'subscription_payment' AND status = 'succeeded' THEN amount ELSE 0 END) as recurring_revenue,
           SUM(CASE WHEN type = 'charge' AND status = 'succeeded' THEN amount ELSE 0 END) - 
           SUM(CASE WHEN type = 'subscription_payment' AND status = 'succeeded' THEN amount ELSE 0 END) as one_time_revenue,
           SUM(CASE WHEN type = 'refund' AND status = 'succeeded' THEN amount ELSE 0 END) as refunds,
           SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as net_revenue,
           currency
         FROM transactions
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY currency`,
        [startDate, endDate]
      );

      // Get revenue by plan
      const planRevenueResult = await client.query(
        `SELECT 
           bp.name as plan_name,
           SUM(t.amount) as revenue,
           COUNT(DISTINCT s.id) as subscriptions
         FROM transactions t
         JOIN subscriptions s ON t.subscription_id = s.id
         JOIN billing_plans bp ON s.plan_id = bp.id
         WHERE t.created_at >= $1 AND t.created_at <= $2
           AND t.status = 'succeeded'
           AND t.type = 'subscription_payment'
         GROUP BY bp.id, bp.name
         ORDER BY revenue DESC`,
        [startDate, endDate]
      );

      // Get revenue by status
      const statusResult = await client.query(
        `SELECT 
           status,
           SUM(amount) as total
         FROM transactions
         WHERE created_at >= $1 AND created_at <= $2
           AND type IN ('charge', 'subscription_payment')
         GROUP BY status`,
        [startDate, endDate]
      );

      const metrics = revenueResult.rows[0] || {
        total_revenue: 0,
        recurring_revenue: 0,
        one_time_revenue: 0,
        refunds: 0,
        net_revenue: 0
      };

      const byStatus: any = {};
      statusResult.rows.forEach(row => {
        byStatus[row.status] = parseFloat(row.total);
      });

      return {
        period: { start: startDate, end: endDate },
        metrics: {
          total_revenue: parseFloat(metrics.total_revenue),
          recurring_revenue: parseFloat(metrics.recurring_revenue),
          one_time_revenue: parseFloat(metrics.one_time_revenue),
          refunds: parseFloat(metrics.refunds),
          net_revenue: parseFloat(metrics.net_revenue)
        },
        by_plan: planRevenueResult.rows.map(row => ({
          plan_name: row.plan_name,
          revenue: parseFloat(row.revenue),
          subscriptions: parseInt(row.subscriptions)
        })),
        by_status: {
          succeeded: byStatus.succeeded || 0,
          pending: byStatus.pending || 0,
          failed: byStatus.failed || 0
        },
        currency: metrics.currency || 'USD'
      };
    } finally {
      client.release();
    }
  }

  async getCustomerMetrics(customerId: string): Promise<CustomerMetrics> {
    const result = await this.pool.query(
      `SELECT 
         $1 as customer_id,
         COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) as total_spent,
         COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) as lifetime_value,
         COUNT(DISTINCT subscription_id) FILTER (WHERE subscription_id IS NOT NULL) as active_subscriptions,
         COUNT(DISTINCT payment_method_id) FILTER (WHERE payment_method_id IS NOT NULL) as payment_methods,
         MAX(CASE WHEN status = 'succeeded' THEN created_at END) as last_payment_date,
         COUNT(*) FILTER (WHERE status = 'failed') as failed_payments
       FROM transactions
       WHERE customer_id = $1`,
      [customerId]
    );

    return result.rows[0];
  }

  async calculateMRR(): Promise<number> {
    const result = await this.pool.query(
      `SELECT SUM(bp.amount * bp.interval_count) as mrr
       FROM subscriptions s
       JOIN billing_plans bp ON s.plan_id = bp.id
       WHERE s.status = 'active'
         AND s.cancel_at_period_end = false`
    );
    return parseFloat(result.rows[0]?.mrr || 0);
  }

  async updateFinancialSummary(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate and store MRR
      const mrr = await this.calculateMRR();
      await client.query(
        `INSERT INTO financial_summary (date, metric_type, value, currency)
         VALUES ($1, 'mrr', $2, 'USD')
         ON CONFLICT (date, metric_type, currency) 
         DO UPDATE SET value = $2, created_at = CURRENT_TIMESTAMP`,
        [today, mrr]
      );

      // Calculate and store ARR
      await client.query(
        `INSERT INTO financial_summary (date, metric_type, value, currency)
         VALUES ($1, 'arr', $2, 'USD')
         ON CONFLICT (date, metric_type, currency) 
         DO UPDATE SET value = $2, created_at = CURRENT_TIMESTAMP`,
        [today, mrr * 12]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
