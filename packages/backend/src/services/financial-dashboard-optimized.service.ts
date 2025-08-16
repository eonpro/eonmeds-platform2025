import { getStripeClient } from "../config/stripe.config";
import { pool } from "../config/database";
import type { Stripe } from "../config/stripe.config";

interface CachedDashboardData {
  metrics: any;
  timestamp: Date;
  ttl: number; // seconds
}

export class OptimizedFinancialDashboardService {
  private stripe: Stripe;
  private cache = new Map<string, CachedDashboardData>();
  private CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.stripe = getStripeClient();
  }

  /**
   * Get dashboard metrics with caching and optimization
   */
  async getDashboardMetrics(dateRange?: { start: Date; end: Date }, forceRefresh = false): Promise<any> {
    const cacheKey = `dashboard_${dateRange?.start?.toISOString()}_${dateRange?.end?.toISOString()}`;
    
    // Check cache first
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && new Date().getTime() - cached.timestamp.getTime() < cached.ttl * 1000) {
        console.info('Returning cached dashboard data');
        return cached.metrics;
      }
    }

    const endDate = dateRange?.end || new Date();
    const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get basic metrics from our database first (much faster)
    const [dbMetrics, stripeMetrics] = await Promise.all([
      this.getLocalDatabaseMetrics(startDate, endDate),
      this.getOptimizedStripeMetrics(startDate, endDate)
    ]);

    const combinedMetrics = {
      ...dbMetrics,
      ...stripeMetrics,
      lastUpdated: new Date()
    };

    // Cache the results
    this.cache.set(cacheKey, {
      metrics: combinedMetrics,
      timestamp: new Date(),
      ttl: this.CACHE_TTL
    });

    return combinedMetrics;
  }

  /**
   * Get metrics from our local database (fast)
   */
  private async getLocalDatabaseMetrics(startDate: Date, endDate: Date) {
    try {
      // Get invoice metrics from our database
      const invoiceMetrics = await pool.query(`
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_invoices,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_invoices,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount END), 0) as total_revenue,
          COUNT(DISTINCT patient_id) as unique_patients
        FROM invoices
        WHERE created_at BETWEEN $1 AND $2
      `, [startDate, endDate]);

      // Get recent payments from our invoice_payments table
      const recentPayments = await pool.query(`
        SELECT 
          ip.id,
          ip.amount,
          ip.status,
          ip.created_at,
          i.invoice_number,
          p.first_name || ' ' || p.last_name as patient_name,
          p.email as patient_email
        FROM invoice_payments ip
        JOIN invoices i ON i.id = ip.invoice_id
        JOIN patients p ON p.patient_id = i.patient_id
        WHERE ip.created_at BETWEEN $1 AND $2
        ORDER BY ip.created_at DESC
        LIMIT 10
      `, [startDate, endDate]);

      // Get saved payment methods count
      const paymentMethodsCount = await pool.query(`
        SELECT COUNT(DISTINCT patient_id) as patients_with_cards
        FROM payment_methods_cached
        WHERE created_at <= $1
      `, [endDate]);

      return {
        localMetrics: {
          invoices: invoiceMetrics.rows[0],
          recentPayments: recentPayments.rows,
          patientsWithCards: paymentMethodsCount.rows[0].patients_with_cards
        }
      };
    } catch (error) {
      console.error('Error fetching local database metrics:', error);
      return { localMetrics: null };
    }
  }

  /**
   * Get optimized Stripe metrics (minimal API calls)
   */
  private async getOptimizedStripeMetrics(startDate: Date, endDate: Date) {
    try {
      // Use Stripe's reporting API for aggregated data (single API call)
      const [charges, recentPaymentIntents] = await Promise.all([
        // Get charges summary (limited to 100 most recent)
        this.stripe.charges.list({
          limit: 100,
          created: {
            gte: Math.floor(startDate.getTime() / 1000),
            lte: Math.floor(endDate.getTime() / 1000),
          }
        }),
        // Get recent payment intents (limited to 10)
        this.stripe.paymentIntents.list({
          limit: 10,
          expand: ['data.customer']
        })
      ]);

      // Calculate basic metrics from limited data
      const succeeded = charges.data.filter(c => c.status === 'succeeded' && !c.refunded);
      const failed = charges.data.filter(c => c.status === 'failed');
      const refunded = charges.data.filter(c => c.refunded);

      const totalAmount = succeeded.reduce((sum, c) => sum + (c.amount / 100), 0);

      // Get unique customer count from charges (approximate)
      const uniqueCustomers = new Set(charges.data.map(c => c.customer).filter(Boolean)).size;

      // Format recent payments
      const formattedRecentPayments = recentPaymentIntents.data.map(pi => {
        const customer = pi.customer as Stripe.Customer | null;
        return {
          id: pi.id,
          amount: pi.amount / 100,
          status: pi.status,
          customerEmail: customer?.email || 'Unknown',
          customerName: customer?.name || 'Unknown',
          created: new Date(pi.created * 1000),
          description: pi.description || ''
        };
      });

      return {
        stripeMetrics: {
          payments: {
            total: charges.data.length,
            succeeded: succeeded.length,
            failed: failed.length,
            refunded: refunded.length,
            totalAmount
          },
          approximateCustomers: uniqueCustomers,
          recentStripePayments: formattedRecentPayments,
          hasMoreData: charges.has_more // Indicates if there's more data available
        }
      };
    } catch (error) {
      console.error('Error fetching Stripe metrics:', error);
      return { stripeMetrics: null };
    }
  }

  /**
   * Get detailed metrics (slower, use sparingly)
   */
  async getDetailedMetrics(customerId?: string) {
    if (customerId) {
      // Get detailed info for a specific customer
      const [customer, charges, paymentMethods] = await Promise.all([
        this.stripe.customers.retrieve(customerId),
        this.stripe.charges.list({ customer: customerId, limit: 100 }),
        this.stripe.paymentMethods.list({ customer: customerId, type: 'card' })
      ]);

      return {
        customer,
        totalSpent: charges.data.reduce((sum, c) => sum + (c.amount / 100), 0),
        paymentCount: charges.data.length,
        savedCards: paymentMethods.data.length
      };
    }

    return null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export const optimizedFinancialDashboardService = new OptimizedFinancialDashboardService();
