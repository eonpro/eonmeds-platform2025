import { getStripeClient } from "../config/stripe.config";
import type { Stripe } from "../config/stripe.config";

interface DashboardMetrics {
  payments: {
    total: number;
    succeeded: number;
    failed: number;
    refunded: number;
    totalAmount: number;
  };
  volume: {
    gross: number;
    net: number;
    previousMonth: number;
    percentageChange: number;
  };
  customers: {
    total: number;
    new: number;
    withPaymentMethods: number;
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    customerEmail: string;
    customerName: string;
    created: Date;
    description: string;
  }>;
  failedPayments: Array<{
    id: string;
    amount: number;
    customerEmail: string;
    failureReason: string;
    created: Date;
  }>;
  topCustomers: Array<{
    id: string;
    email: string;
    name: string;
    totalSpent: number;
    paymentCount: number;
  }>;
  paymentMethods: {
    card: number;
    other: number;
  };
}

export class FinancialDashboardService {
  private stripe: Stripe;

  constructor() {
    this.stripe = getStripeClient();
  }

  // Expose stripe client for routes (temporary solution for direct API calls)
  public getStripeClient(): Stripe {
    return this.stripe;
  }

  /**
   * Get comprehensive financial dashboard data
   */
  async getDashboardMetrics(dateRange?: { start: Date; end: Date }): Promise<DashboardMetrics> {
    const endDate = dateRange?.end || new Date();
    const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days default
    
    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousEnd = new Date(startDate.getTime());

    // Fetch data in parallel for better performance
    const [
      charges,
      previousCharges,
      customers,
      recentCustomers,
      paymentIntents,
    ] = await Promise.all([
      this.getCharges(startDate, endDate),
      this.getCharges(previousStart, previousEnd),
      this.getAllCustomers(),
      this.getRecentCustomers(startDate, endDate),
      this.getRecentPaymentIntents(10),
    ]);

    // Calculate metrics
    const paymentMetrics = this.calculatePaymentMetrics(charges);
    const volumeMetrics = this.calculateVolumeMetrics(charges, previousCharges);
    const customerMetrics = await this.calculateCustomerMetrics(customers, recentCustomers);
    const recentPayments = await this.formatRecentPayments(paymentIntents);
    const failedPayments = await this.getFailedPayments(startDate, endDate);
    const topCustomers = await this.getTopCustomers(charges);
    const paymentMethodBreakdown = this.getPaymentMethodBreakdown(charges);

    return {
      payments: paymentMetrics,
      volume: volumeMetrics,
      customers: customerMetrics,
      recentPayments,
      failedPayments,
      topCustomers,
      paymentMethods: paymentMethodBreakdown,
    };
  }

  /**
   * Get charges for a date range
   */
  private async getCharges(startDate: Date, endDate: Date): Promise<Stripe.Charge[]> {
    const charges: Stripe.Charge[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const batch = await this.stripe.charges.list({
        limit: 100,
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
        starting_after: startingAfter,
      });

      charges.push(...batch.data);
      hasMore = batch.has_more;
      startingAfter = batch.data[batch.data.length - 1]?.id;
    }

    return charges;
  }

  /**
   * Get all customers
   */
  private async getAllCustomers(): Promise<Stripe.Customer[]> {
    const customers: Stripe.Customer[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const batch = await this.stripe.customers.list({
        limit: 100,
        starting_after: startingAfter,
      });

      customers.push(...batch.data.filter(c => !(c as any).deleted));
      hasMore = batch.has_more;
      startingAfter = batch.data[batch.data.length - 1]?.id;
    }

    return customers;
  }

  /**
   * Get customers created in date range
   */
  private async getRecentCustomers(startDate: Date, endDate: Date): Promise<Stripe.Customer[]> {
    const customers: Stripe.Customer[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const batch = await this.stripe.customers.list({
        limit: 100,
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
        starting_after: startingAfter,
      });

      customers.push(...batch.data.filter(c => !(c as any).deleted));
      hasMore = batch.has_more;
      startingAfter = batch.data[batch.data.length - 1]?.id;
    }

    return customers;
  }

  /**
   * Get recent payment intents
   */
  private async getRecentPaymentIntents(limit: number): Promise<Stripe.PaymentIntent[]> {
    const result = await this.stripe.paymentIntents.list({
      limit,
      expand: ['data.customer'],
    });

    return result.data;
  }

  /**
   * Calculate payment metrics
   */
  private calculatePaymentMetrics(charges: Stripe.Charge[]): DashboardMetrics['payments'] {
    const succeeded = charges.filter(c => c.status === 'succeeded' && !c.refunded);
    const failed = charges.filter(c => c.status === 'failed');
    const refunded = charges.filter(c => c.refunded);

    return {
      total: charges.length,
      succeeded: succeeded.length,
      failed: failed.length,
      refunded: refunded.length,
      totalAmount: succeeded.reduce((sum, c) => sum + (c.amount / 100), 0),
    };
  }

  /**
   * Calculate volume metrics
   */
  private calculateVolumeMetrics(
    charges: Stripe.Charge[],
    previousCharges: Stripe.Charge[]
  ): DashboardMetrics['volume'] {
    const currentGross = charges
      .filter(c => c.status === 'succeeded')
      .reduce((sum, c) => sum + (c.amount / 100), 0);

    const currentRefunds = charges
      .filter(c => c.refunded)
      .reduce((sum, c) => sum + ((c.amount_refunded || 0) / 100), 0);

    const previousGross = previousCharges
      .filter(c => c.status === 'succeeded')
      .reduce((sum, c) => sum + (c.amount / 100), 0);

    const percentageChange = previousGross > 0
      ? ((currentGross - previousGross) / previousGross) * 100
      : 0;

    return {
      gross: currentGross,
      net: currentGross - currentRefunds,
      previousMonth: previousGross,
      percentageChange: Math.round(percentageChange * 100) / 100,
    };
  }

  /**
   * Calculate customer metrics
   */
  private async calculateCustomerMetrics(
    allCustomers: Stripe.Customer[],
    recentCustomers: Stripe.Customer[]
  ): Promise<DashboardMetrics['customers']> {
    // Count customers with payment methods
    let withPaymentMethods = 0;
    
    for (const customer of allCustomers) {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customer.id,
        limit: 1,
      });
      
      if (paymentMethods.data.length > 0) {
        withPaymentMethods++;
      }
    }

    return {
      total: allCustomers.length,
      new: recentCustomers.length,
      withPaymentMethods,
    };
  }

  /**
   * Format recent payments
   */
  private async formatRecentPayments(
    paymentIntents: Stripe.PaymentIntent[]
  ): Promise<DashboardMetrics['recentPayments']> {
    return paymentIntents.map(pi => {
      const customer = pi.customer as Stripe.Customer | null;
      return {
        id: pi.id,
        amount: pi.amount / 100,
        status: pi.status,
        customerEmail: customer?.email || 'Unknown',
        customerName: customer?.name || 'Unknown',
        created: new Date(pi.created * 1000),
        description: pi.description || '',
      };
    });
  }

  /**
   * Get failed payments
   */
  private async getFailedPayments(
    startDate: Date,
    endDate: Date
  ): Promise<DashboardMetrics['failedPayments']> {
    const failedIntents = await this.stripe.paymentIntents.list({
      limit: 100,
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
    });

    const failed = failedIntents.data.filter(pi => 
      pi.status === 'canceled' || 
      pi.status === 'requires_payment_method' ||
      (pi.last_payment_error !== null)
    );

    const formatted = await Promise.all(failed.map(async (pi) => {
      let customerEmail = 'Unknown';
      if (pi.customer) {
        try {
          const customer = await this.stripe.customers.retrieve(pi.customer as string);
          if (!(customer as any).deleted) {
            customerEmail = (customer as Stripe.Customer).email || 'Unknown';
          }
        } catch (error) {
          // Customer might be deleted
        }
      }

      return {
        id: pi.id,
        amount: pi.amount / 100,
        customerEmail,
        failureReason: pi.last_payment_error?.message || 'Unknown error',
        created: new Date(pi.created * 1000),
      };
    }));

    return formatted;
  }

  /**
   * Get top customers by spend
   */
  private async getTopCustomers(charges: Stripe.Charge[]): Promise<DashboardMetrics['topCustomers']> {
    const customerSpend = new Map<string, { 
      email: string; 
      name: string; 
      total: number; 
      count: number 
    }>();

    // Aggregate spending by customer
    for (const charge of charges.filter(c => c.status === 'succeeded' && c.customer)) {
      const customerId = charge.customer as string;
      
      if (!customerSpend.has(customerId)) {
        try {
          const customer = await this.stripe.customers.retrieve(customerId);
          if (!(customer as any).deleted) {
            const cust = customer as Stripe.Customer;
            customerSpend.set(customerId, {
              email: cust.email || 'Unknown',
              name: cust.name || 'Unknown',
              total: 0,
              count: 0,
            });
          }
        } catch (error) {
          // Customer might be deleted
          continue;
        }
      }

      const current = customerSpend.get(customerId);
      if (current) {
        current.total += charge.amount / 100;
        current.count += 1;
      }
    }

    // Sort by total spend and take top 5
    const sorted = Array.from(customerSpend.entries())
      .map(([id, data]) => ({
        id,
        email: data.email,
        name: data.name,
        totalSpent: data.total,
        paymentCount: data.count,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return sorted;
  }

  /**
   * Get payment method breakdown
   */
  private getPaymentMethodBreakdown(charges: Stripe.Charge[]): DashboardMetrics['paymentMethods'] {
    let card = 0;
    let other = 0;

    for (const charge of charges.filter(c => c.status === 'succeeded')) {
      if (charge.payment_method_details?.type === 'card') {
        card++;
      } else {
        other++;
      }
    }

    return { card, other };
  }

  /**
   * Get subscription metrics
   */
  async getSubscriptionMetrics(): Promise<{
    active: number;
    canceled: number;
    mrr: number;
    churnRate: number;
  }> {
    const subscriptions = await this.stripe.subscriptions.list({
      limit: 100,
      expand: ['data.customer'],
    });

    const active = subscriptions.data.filter(s => s.status === 'active').length;
    const canceled = subscriptions.data.filter(s => s.status === 'canceled').length;
    
    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = subscriptions.data
      .filter(s => s.status === 'active')
      .reduce((sum, sub) => {
        const amount = sub.items.data.reduce((itemSum, item) => {
          return itemSum + (item.price.unit_amount || 0) * (item.quantity || 1);
        }, 0);
        return sum + (amount / 100);
      }, 0);

    const churnRate = active > 0 ? (canceled / (active + canceled)) * 100 : 0;

    return {
      active,
      canceled,
      mrr,
      churnRate: Math.round(churnRate * 100) / 100,
    };
  }
}

export const financialDashboardService = new FinancialDashboardService();
