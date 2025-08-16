import { Pool } from 'pg';
import Stripe from 'stripe';

interface UsageMeter {
  id: string;
  name: string;
  display_name: string;
  event_name: string;
  value_type: 'sum' | 'max' | 'last' | 'unique_count';
  aggregation_method: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  status: 'active' | 'inactive';
  stripe_meter_id?: string;
  created_at: Date;
}

interface UsageRecord {
  id: string;
  meter_id: string;
  customer_id: string;
  subscription_id?: string;
  timestamp: Date;
  quantity: number;
  identifier?: string; // For unique_count
  metadata: Record<string, any>;
  stripe_usage_record_id?: string;
}

interface UsageReport {
  customer_id: string;
  meter_id: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: number;
  breakdown?: Array<{
    date: Date;
    quantity: number;
    details?: any;
  }>;
}

interface MeterPricing {
  meter_id: string;
  pricing_model: 'per_unit' | 'tiered' | 'volume' | 'graduated';
  currency: string;
  tiers?: Array<{
    up_to: number | null;
    unit_price: number;
    flat_fee?: number;
  }>;
  per_unit_price?: number;
  transform_quantity?: {
    divide_by: number;
    round: 'up' | 'down';
  };
}

export class UsageBillingService {
  private pool: Pool;
  private stripe: Stripe;
  private meterCache: Map<string, UsageMeter> = new Map();

  constructor(pool: Pool, stripe: Stripe) {
    this.pool = pool;
    this.stripe = stripe;
  }

  // ========== METER MANAGEMENT ==========

  async createMeter(params: {
    name: string;
    display_name: string;
    event_name: string;
    value_type: 'sum' | 'max' | 'last' | 'unique_count';
    aggregation_method: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  }): Promise<UsageMeter> {
    // Create in Stripe
    const stripeMeter = await this.stripe.billing.meters.create({
      display_name: params.display_name,
      event_name: params.event_name,
      value_type: params.value_type,
      default_aggregation: {
        formula: params.aggregation_method
      }
    });

    // Save to database
    const result = await this.pool.query(
      `INSERT INTO usage_meters 
       (name, display_name, event_name, value_type, 
        aggregation_method, status, stripe_meter_id)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)
       RETURNING *`,
      [
        params.name,
        params.display_name,
        params.event_name,
        params.value_type,
        params.aggregation_method,
        stripeMeter.id
      ]
    );

    const meter = result.rows[0];
    this.meterCache.set(meter.id, meter);
    return meter;
  }

  async getMeter(meterId: string): Promise<UsageMeter | null> {
    // Check cache first
    if (this.meterCache.has(meterId)) {
      return this.meterCache.get(meterId)!;
    }

    const result = await this.pool.query(
      'SELECT * FROM usage_meters WHERE id = $1',
      [meterId]
    );

    if (result.rows.length > 0) {
      const meter = result.rows[0];
      this.meterCache.set(meter.id, meter);
      return meter;
    }

    return null;
  }

  async listMeters(activeOnly: boolean = true): Promise<UsageMeter[]> {
    const query = activeOnly
      ? 'SELECT * FROM usage_meters WHERE status = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM usage_meters ORDER BY created_at DESC';
    
    const params = activeOnly ? ['active'] : [];
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ========== USAGE RECORDING ==========

  async recordUsage(params: {
    meter_id: string;
    customer_id: string;
    quantity: number;
    timestamp?: Date;
    identifier?: string;
    subscription_id?: string;
    metadata?: Record<string, any>;
    action?: 'increment' | 'set';
  }): Promise<UsageRecord> {
    const meter = await this.getMeter(params.meter_id);
    if (!meter) {
      throw new Error(`Meter ${params.meter_id} not found`);
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get customer's Stripe ID
      const customerResult = await client.query(
        'SELECT stripe_customer_id FROM patients WHERE id = $1',
        [params.customer_id]
      );

      if (!customerResult.rows[0]?.stripe_customer_id) {
        throw new Error('Customer does not have a Stripe ID');
      }

      const timestamp = params.timestamp || new Date();

      // Record in Stripe
      let stripeUsageRecordId: string | undefined;
      if (meter.stripe_meter_id) {
        const stripeEvent = await this.stripe.billing.meterEvents.create({
          event_name: meter.event_name,
          payload: {
            stripe_customer_id: customerResult.rows[0].stripe_customer_id,
            value: params.quantity.toString(),
            timestamp: Math.floor(timestamp.getTime() / 1000),
            ...(params.identifier && { identifier: params.identifier })
          }
        });
        stripeUsageRecordId = stripeEvent.id;
      }

      // Store locally
      const result = await client.query(
        `INSERT INTO usage_records 
         (meter_id, customer_id, subscription_id, timestamp, 
          quantity, identifier, metadata, stripe_usage_record_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          params.meter_id,
          params.customer_id,
          params.subscription_id || null,
          timestamp,
          params.quantity,
          params.identifier || null,
          JSON.stringify(params.metadata || {}),
          stripeUsageRecordId
        ]
      );

      // If this is for a subscription item, update the usage
      if (params.subscription_id) {
        await this.updateSubscriptionUsage(
          params.subscription_id,
          params.meter_id,
          params.quantity,
          params.action || 'increment'
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateSubscriptionUsage(
    subscriptionId: string,
    meterId: string,
    quantity: number,
    action: 'increment' | 'set'
  ): Promise<void> {
    // Get subscription and related Stripe subscription item
    const result = await this.pool.query(
      `SELECT si.stripe_subscription_item_id
       FROM subscription_items si
       JOIN billing_plans bp ON si.plan_id = bp.id
       WHERE si.subscription_id = $1
       AND bp.metadata->>'meter_id' = $2`,
      [subscriptionId, meterId]
    );

    if (result.rows.length === 0) {
      return; // No metered item for this subscription
    }

    const subscriptionItemId = result.rows[0].stripe_subscription_item_id;
    if (!subscriptionItemId) {
      return;
    }

    // Create usage record in Stripe
    await this.stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity: Math.round(quantity),
        timestamp: 'now',
        action: action
      }
    );
  }

  // ========== USAGE REPORTING ==========

  async getUsageReport(
    customerId: string,
    meterId: string,
    startDate: Date,
    endDate: Date,
    includeBreakdown: boolean = false
  ): Promise<UsageReport> {
    const meter = await this.getMeter(meterId);
    if (!meter) {
      throw new Error(`Meter ${meterId} not found`);
    }

    // Calculate aggregated usage based on meter type
    let query: string;
    let params: any[];

    switch (meter.aggregation_method) {
      case 'sum':
        query = `
          SELECT SUM(quantity) as usage
          FROM usage_records
          WHERE customer_id = $1 
          AND meter_id = $2
          AND timestamp >= $3 
          AND timestamp < $4
        `;
        params = [customerId, meterId, startDate, endDate];
        break;

      case 'max':
        query = `
          SELECT MAX(quantity) as usage
          FROM usage_records
          WHERE customer_id = $1 
          AND meter_id = $2
          AND timestamp >= $3 
          AND timestamp < $4
        `;
        params = [customerId, meterId, startDate, endDate];
        break;

      case 'last_during_period':
        query = `
          SELECT quantity as usage
          FROM usage_records
          WHERE customer_id = $1 
          AND meter_id = $2
          AND timestamp >= $3 
          AND timestamp < $4
          ORDER BY timestamp DESC
          LIMIT 1
        `;
        params = [customerId, meterId, startDate, endDate];
        break;

      case 'last_ever':
        query = `
          SELECT quantity as usage
          FROM usage_records
          WHERE customer_id = $1 
          AND meter_id = $2
          AND timestamp < $4
          ORDER BY timestamp DESC
          LIMIT 1
        `;
        params = [customerId, meterId, startDate, endDate];
        break;

      default:
        throw new Error(`Unsupported aggregation method: ${meter.aggregation_method}`);
    }

    const result = await this.pool.query(query, params);
    const usage = parseFloat(result.rows[0]?.usage || '0');

    const report: UsageReport = {
      customer_id: customerId,
      meter_id: meterId,
      period: {
        start: startDate,
        end: endDate
      },
      usage
    };

    // Include breakdown if requested
    if (includeBreakdown) {
      const breakdownResult = await this.pool.query(
        `SELECT 
           DATE(timestamp) as date,
           SUM(quantity) as quantity,
           COUNT(*) as event_count,
           jsonb_agg(jsonb_build_object(
             'timestamp', timestamp,
             'quantity', quantity,
             'identifier', identifier,
             'metadata', metadata
           )) as details
         FROM usage_records
         WHERE customer_id = $1 
         AND meter_id = $2
         AND timestamp >= $3 
         AND timestamp < $4
         GROUP BY DATE(timestamp)
         ORDER BY date`,
        [customerId, meterId, startDate, endDate]
      );

      report.breakdown = breakdownResult.rows.map(row => ({
        date: row.date,
        quantity: parseFloat(row.quantity),
        details: row.details
      }));
    }

    return report;
  }

  async getCurrentPeriodUsage(
    customerId: string,
    subscriptionId: string
  ): Promise<Array<{
    meter: UsageMeter;
    usage: number;
    estimated_cost?: number;
  }>> {
    // Get subscription period
    const subResult = await this.pool.query(
      `SELECT current_period_start, current_period_end, plan_id
       FROM subscriptions
       WHERE id = $1`,
      [subscriptionId]
    );

    if (subResult.rows.length === 0) {
      throw new Error('Subscription not found');
    }

    const subscription = subResult.rows[0];

    // Get meters associated with this subscription's plan
    const metersResult = await this.pool.query(
      `SELECT DISTINCT um.*
       FROM usage_meters um
       JOIN billing_plans bp ON bp.metadata->>'meter_id' = um.id::text
       WHERE bp.id = $1
       AND um.status = 'active'`,
      [subscription.plan_id]
    );

    const results = [];
    for (const meter of metersResult.rows) {
      const report = await this.getUsageReport(
        customerId,
        meter.id,
        subscription.current_period_start,
        subscription.current_period_end
      );

      // Calculate estimated cost if pricing is available
      const pricing = await this.getMeterPricing(meter.id);
      let estimatedCost: number | undefined;
      
      if (pricing) {
        estimatedCost = this.calculateUsageCost(report.usage, pricing);
      }

      results.push({
        meter,
        usage: report.usage,
        estimated_cost: estimatedCost
      });
    }

    return results;
  }

  // ========== PRICING ==========

  async setMeterPricing(
    meterId: string,
    pricing: MeterPricing
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO meter_pricing 
       (meter_id, pricing_model, currency, tiers, 
        per_unit_price, transform_quantity)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (meter_id) 
       DO UPDATE SET 
         pricing_model = $2,
         currency = $3,
         tiers = $4,
         per_unit_price = $5,
         transform_quantity = $6,
         updated_at = CURRENT_TIMESTAMP`,
      [
        meterId,
        pricing.pricing_model,
        pricing.currency,
        JSON.stringify(pricing.tiers || []),
        pricing.per_unit_price || null,
        JSON.stringify(pricing.transform_quantity || null)
      ]
    );
  }

  async getMeterPricing(meterId: string): Promise<MeterPricing | null> {
    const result = await this.pool.query(
      'SELECT * FROM meter_pricing WHERE meter_id = $1',
      [meterId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      meter_id: row.meter_id,
      pricing_model: row.pricing_model,
      currency: row.currency,
      tiers: row.tiers,
      per_unit_price: row.per_unit_price,
      transform_quantity: row.transform_quantity
    };
  }

  private calculateUsageCost(
    usage: number,
    pricing: MeterPricing
  ): number {
    // Apply quantity transformation if needed
    let quantity = usage;
    if (pricing.transform_quantity) {
      quantity = quantity / pricing.transform_quantity.divide_by;
      if (pricing.transform_quantity.round === 'up') {
        quantity = Math.ceil(quantity);
      } else {
        quantity = Math.floor(quantity);
      }
    }

    switch (pricing.pricing_model) {
      case 'per_unit':
        return quantity * (pricing.per_unit_price || 0);

      case 'tiered':
        // Graduated pricing - each tier applies to its range
        let totalCost = 0;
        let remainingQuantity = quantity;
        
        for (const tier of pricing.tiers || []) {
          const tierQuantity = tier.up_to 
            ? Math.min(remainingQuantity, tier.up_to - (quantity - remainingQuantity))
            : remainingQuantity;
          
          totalCost += tierQuantity * tier.unit_price;
          if (tier.flat_fee && remainingQuantity > 0) {
            totalCost += tier.flat_fee;
          }
          
          remainingQuantity -= tierQuantity;
          if (remainingQuantity <= 0) break;
        }
        
        return totalCost;

      case 'volume':
        // Volume pricing - entire quantity uses one tier's price
        const applicableTier = pricing.tiers?.find(tier => 
          !tier.up_to || quantity <= tier.up_to
        );
        
        if (applicableTier) {
          return (quantity * applicableTier.unit_price) + (applicableTier.flat_fee || 0);
        }
        return 0;

      default:
        return 0;
    }
  }

  // ========== BILLING INTEGRATION ==========

  async generateUsageInvoiceItems(
    customerId: string,
    subscriptionId: string,
    invoiceId: string
  ): Promise<void> {
    const usageData = await this.getCurrentPeriodUsage(customerId, subscriptionId);

    for (const { meter, usage, estimated_cost } of usageData) {
      if (usage > 0 && estimated_cost) {
        // Add usage line item to invoice
        await this.pool.query(
          `INSERT INTO invoice_items 
           (invoice_id, description, quantity, unit_price, amount, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            invoiceId,
            `${meter.display_name} Usage`,
            usage,
            estimated_cost / usage,
            estimated_cost,
            JSON.stringify({
              meter_id: meter.id,
              meter_name: meter.name,
              aggregation_method: meter.aggregation_method
            })
          ]
        );
      }
    }
  }

  // ========== ANALYTICS ==========

  async getUsageAnalytics(
    meterId: string,
    period: 'hour' | 'day' | 'week' | 'month',
    lookback: number = 30
  ): Promise<Array<{
    period_start: Date;
    total_usage: number;
    unique_customers: number;
    event_count: number;
  }>> {
    const truncateExpression = {
      hour: "DATE_TRUNC('hour', timestamp)",
      day: "DATE_TRUNC('day', timestamp)",
      week: "DATE_TRUNC('week', timestamp)",
      month: "DATE_TRUNC('month', timestamp)"
    };

    const result = await this.pool.query(
      `SELECT 
         ${truncateExpression[period]} as period_start,
         SUM(quantity) as total_usage,
         COUNT(DISTINCT customer_id) as unique_customers,
         COUNT(*) as event_count
       FROM usage_records
       WHERE meter_id = $1
       AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '${lookback} days'
       GROUP BY period_start
       ORDER BY period_start DESC`,
      [meterId]
    );

    return result.rows;
  }

  async getTopUsageCustomers(
    meterId: string,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{
    customer_id: string;
    customer_name: string;
    total_usage: number;
    event_count: number;
    last_usage_date: Date;
  }>> {
    const dateFilter = startDate && endDate
      ? 'AND ur.timestamp >= $2 AND ur.timestamp < $3'
      : '';
    
    const params = [meterId];
    if (startDate && endDate) {
      params.push(startDate.toISOString(), endDate.toISOString());
    }
    params.push(limit.toString());

    const result = await this.pool.query(
      `SELECT 
         ur.customer_id,
         CONCAT(p.first_name, ' ', p.last_name) as customer_name,
         SUM(ur.quantity) as total_usage,
         COUNT(*) as event_count,
         MAX(ur.timestamp) as last_usage_date
       FROM usage_records ur
       JOIN patients p ON ur.customer_id = p.id
       WHERE ur.meter_id = $1
       ${dateFilter}
       GROUP BY ur.customer_id, p.first_name, p.last_name
       ORDER BY total_usage DESC
       LIMIT $${params.length}`,
      params
    );

    return result.rows;
  }

  // ========== ALERTS & LIMITS ==========

  async setUsageLimit(
    customerId: string,
    meterId: string,
    limit: number,
    period: 'day' | 'week' | 'month',
    action: 'alert' | 'block'
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO usage_limits 
       (customer_id, meter_id, limit_value, period, action, active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (customer_id, meter_id) 
       DO UPDATE SET 
         limit_value = $3,
         period = $4,
         action = $5,
         active = true,
         updated_at = CURRENT_TIMESTAMP`,
      [customerId, meterId, limit, period, action]
    );
  }

  async checkUsageLimits(
    customerId: string,
    meterId: string
  ): Promise<{
    exceeded: boolean;
    limit?: number;
    current_usage: number;
    percentage: number;
  }> {
    // Get active limit
    const limitResult = await this.pool.query(
      `SELECT * FROM usage_limits 
       WHERE customer_id = $1 
       AND meter_id = $2 
       AND active = true`,
      [customerId, meterId]
    );

    if (limitResult.rows.length === 0) {
      return {
        exceeded: false,
        current_usage: 0,
        percentage: 0
      };
    }

    const limit = limitResult.rows[0];
    
    // Calculate period dates
    const now = new Date();
    let periodStart: Date;
    
    switch (limit.period) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Get current usage
    const usageReport = await this.getUsageReport(
      customerId,
      meterId,
      periodStart,
      now
    );

    const percentage = (usageReport.usage / limit.limit_value) * 100;

    return {
      exceeded: usageReport.usage > limit.limit_value,
      limit: limit.limit_value,
      current_usage: usageReport.usage,
      percentage
    };
  }

  // ========== COMMON METERS ==========

  async seedCommonMeters(): Promise<void> {
    const commonMeters = [
      {
        name: 'api_calls',
        display_name: 'API Calls',
        event_name: 'api_call',
        value_type: 'sum' as const,
        aggregation_method: 'sum' as const
      },
      {
        name: 'storage_gb',
        display_name: 'Storage (GB)',
        event_name: 'storage_usage',
        value_type: 'max' as const,
        aggregation_method: 'max' as const
      },
      {
        name: 'active_users',
        display_name: 'Active Users',
        event_name: 'user_activity',
        value_type: 'unique_count' as const,
        aggregation_method: 'sum' as const
      },
      {
        name: 'data_transfer_gb',
        display_name: 'Data Transfer (GB)',
        event_name: 'data_transfer',
        value_type: 'sum' as const,
        aggregation_method: 'sum' as const
      },
      {
        name: 'compute_hours',
        display_name: 'Compute Hours',
        event_name: 'compute_usage',
        value_type: 'sum' as const,
        aggregation_method: 'sum' as const
      }
    ];

    for (const meter of commonMeters) {
      try {
        await this.createMeter(meter);
        console.log(`Created meter: ${meter.display_name}`);
      } catch (error) {
        console.error(`Failed to create meter ${meter.name}:`, error);
      }
    }
  }
}
