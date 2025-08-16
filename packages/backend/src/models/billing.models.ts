// Billing System Models
// Created: January 2025

export interface BillingPlan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
  trial_period_days: number;
  features: string[];
  metadata: Record<string, any>;
  stripe_product_id?: string;
  stripe_price_id?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  status: 'trialing' | 'active' | 'canceled' | 'past_due' | 'paused' | 'unpaid';
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  ended_at?: Date;
  trial_start?: Date;
  trial_end?: Date;
  pause_collection?: {
    behavior: 'void' | 'mark_uncollectible' | 'keep_as_draft';
    resumes_at?: Date;
  };
  stripe_subscription_id?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  type: 'charge' | 'refund' | 'subscription_payment' | 'adjustment' | 'credit';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  customer_id: string;
  invoice_id?: string;
  subscription_id?: string;
  payment_method_id?: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  failure_code?: string;
  failure_message?: string;
  processed_at?: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentMethod {
  id: string;
  customer_id: string;
  type: 'card' | 'bank_account' | 'paypal';
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  stripe_payment_method_id: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionItem {
  id: string;
  subscription_id: string;
  plan_id: string;
  quantity: number;
  stripe_subscription_item_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UsageRecord {
  id: string;
  subscription_item_id: string;
  quantity: number;
  timestamp: Date;
  action: 'increment' | 'set';
  metadata: Record<string, any>;
  created_at: Date;
}

export interface Coupon {
  id: string;
  code: string;
  amount_off?: number;
  percent_off?: number;
  currency: string;
  duration: 'forever' | 'once' | 'repeating';
  duration_in_months?: number;
  max_redemptions?: number;
  times_redeemed: number;
  valid: boolean;
  redeem_by?: Date;
  stripe_coupon_id?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AppliedCoupon {
  id: string;
  coupon_id: string;
  customer_id: string;
  subscription_id?: string;
  applied_at: Date;
  ends_at?: Date;
}

export interface FinancialSummary {
  id: string;
  date: Date;
  metric_type: 'daily_revenue' | 'mrr' | 'arr' | 'churn_rate' | 'ltv';
  value: number;
  currency: string;
  metadata: Record<string, any>;
  created_at: Date;
}

// DTOs for API requests/responses

export interface CreatePlanDTO {
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count?: number;
  trial_period_days?: number;
  features?: string[];
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionDTO {
  customer_id: string;
  plan_id: string;
  payment_method_id?: string;
  trial_period_days?: number;
  metadata?: Record<string, any>;
}

export interface UpdateSubscriptionDTO {
  plan_id?: string;
  quantity?: number;
  cancel_at_period_end?: boolean;
  pause_collection?: {
    behavior: 'void' | 'mark_uncollectible' | 'keep_as_draft';
    resumes_at?: Date;
  };
  metadata?: Record<string, any>;
}

export interface ProcessPaymentDTO {
  amount: number;
  currency?: string;
  customer_id: string;
  payment_method_id: string;
  description?: string;
  metadata?: Record<string, any>;
  invoice_id?: string;
}

export interface RefundPaymentDTO {
  transaction_id: string;
  amount?: number; // Partial refund if specified
  reason?: string;
  metadata?: Record<string, any>;
}

// Reporting interfaces

export interface RevenueReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    total_revenue: number;
    recurring_revenue: number;
    one_time_revenue: number;
    refunds: number;
    net_revenue: number;
  };
  by_plan: Array<{
    plan_name: string;
    revenue: number;
    subscriptions: number;
  }>;
  by_status: {
    succeeded: number;
    pending: number;
    failed: number;
  };
  currency: string;
}

export interface CustomerMetrics {
  customer_id: string;
  lifetime_value: number;
  total_spent: number;
  active_subscriptions: number;
  payment_methods: number;
  last_payment_date?: Date;
  failed_payments: number;
  churn_risk_score?: number;
}
