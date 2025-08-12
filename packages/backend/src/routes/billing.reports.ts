import { Router, Request, Response } from 'express';
import { expressjwt } from 'express-jwt';
import { expressJwtSecret } from 'jwks-rsa';
import { getStripeClient } from '../config/stripe.config';
import Stripe from 'stripe';
import { validateQuery, revenueReportSchema, stripeErrorHandler } from '../lib/billing.validation';

const router = Router();

// Auth0 middleware configuration
const checkJwt = expressjwt({
  secret: expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});

// Middleware to check for admin or billing roles
const checkBillingAccess = (req: Request, res: Response, next: any) => {
  const user = (req as any).auth;
  const roles = user?.roles || user?.['https://api.eonmeds.com/roles'] || [];

  if (!roles.includes('admin') && !roles.includes('billing')) {
    return res.status(403).json({
      ok: false,
      error: 'Access denied. Requires admin or billing role.',
    });
  }

  next();
};

// Apply auth middleware to all routes
router.use(checkJwt, checkBillingAccess);

/**
 * GET /reports/revenue/daily
 * Daily revenue report from balance transactions
 */
router.get(
  '/reports/revenue/daily',
  validateQuery(revenueReportSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { from, to } = req.query;

      // Parse dates
      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);

      // Convert to timestamps
      const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
      const toTimestamp = Math.floor(toDate.setHours(23, 59, 59, 999) / 1000);

      const stripe = getStripeClient();

      // Fetch balance transactions
      const transactions: Stripe.BalanceTransaction[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const batch = await stripe.balanceTransactions.list({
          created: {
            gte: fromTimestamp,
            lte: toTimestamp,
          },
          limit: 100,
          ...(startingAfter && { starting_after: startingAfter }),
        });

        transactions.push(...batch.data);
        hasMore = batch.has_more;

        if (batch.data.length > 0) {
          startingAfter = batch.data[batch.data.length - 1].id;
        }
      }

      // Aggregate by day
      const dailyRevenue: { [date: string]: { gross: number; fees: number; net: number } } = {};

      transactions.forEach((txn) => {
        // Only include charges and payments (not refunds, adjustments, etc)
        if (txn.type === 'charge' || txn.type === 'payment') {
          const date = new Date(txn.created * 1000).toISOString().split('T')[0];

          if (!dailyRevenue[date]) {
            dailyRevenue[date] = { gross: 0, fees: 0, net: 0 };
          }

          dailyRevenue[date].gross += txn.amount;
          dailyRevenue[date].fees += txn.fee;
          dailyRevenue[date].net += txn.net;
        }
      });

      // Convert to array and sort by date
      const report = Object.entries(dailyRevenue)
        .map(([date, data]) => ({
          date,
          gross: data.gross / 100, // Convert cents to dollars
          fees: data.fees / 100,
          net: data.net / 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        ok: true,
        data: {
          period: { from: from as string, to: to as string },
          daily: report,
          summary: {
            total_gross: report.reduce((sum, day) => sum + day.gross, 0),
            total_fees: report.reduce((sum, day) => sum + day.fees, 0),
            total_net: report.reduce((sum, day) => sum + day.net, 0),
            days: report.length,
          },
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * GET /reports/revenue
 * Aggregate revenue report from balance transactions
 */
router.get(
  '/reports/revenue',
  validateQuery(revenueReportSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { from, to } = req.query;
      const stripe = getStripeClient();

      const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to as string) : new Date();

      // Fetch balance transactions
      const transactions: Stripe.BalanceTransaction[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const batch = await stripe.balanceTransactions.list({
          created: {
            gte: Math.floor(fromDate.getTime() / 1000),
            lte: Math.floor(toDate.getTime() / 1000),
          },
          limit: 100,
          starting_after: startingAfter,
        });

        transactions.push(...batch.data);
        hasMore = batch.has_more;
        if (hasMore && batch.data.length > 0) {
          startingAfter = batch.data[batch.data.length - 1].id;
        }
      }

      // Aggregate totals
      const totals = transactions.reduce(
        (acc, txn) => {
          if (txn.type === 'charge' || txn.type === 'payment') {
            acc.gross += txn.amount;
            acc.fees += txn.fee;
            acc.net += txn.net;
            acc.count += 1;
          }
          return acc;
        },
        { gross: 0, fees: 0, net: 0, count: 0 }
      );

      res.json({
        ok: true,
        data: {
          period: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
          totals: {
            gross: totals.gross / 100,
            fees: totals.fees / 100,
            net: totals.net / 100,
            count: totals.count,
          },
          currency: 'usd',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * GET /reports/subscriptions
 * Subscription status counts and totals
 */
router.get(
  '/reports/subscriptions',
  validateQuery(revenueReportSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { from, to } = req.query;
      const stripe = getStripeClient();

      // Fetch all subscriptions
      const subscriptions: Stripe.Subscription[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;

      const filters: Stripe.SubscriptionListParams = {
        limit: 100,
      };

      if (from) {
        filters.created = { gte: Math.floor(new Date(from as string).getTime() / 1000) };
      }
      if (to) {
        filters.created = { ...filters.created, lte: Math.floor(new Date(to as string).getTime() / 1000) };
      }

      while (hasMore) {
        const batch = await stripe.subscriptions.list({
          ...filters,
          starting_after: startingAfter,
        });

        subscriptions.push(...batch.data);
        hasMore = batch.has_more;
        if (hasMore && batch.data.length > 0) {
          startingAfter = batch.data[batch.data.length - 1].id;
        }
      }

      // Group by status
      const statusCounts = subscriptions.reduce((acc, sub) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate naive MRR (active subscriptions only)
      const mrr = subscriptions
        .filter(sub => sub.status === 'active')
        .reduce((total, sub) => {
          const amount = sub.items.data.reduce((sum, item) => {
            const unitAmount = item.price.unit_amount || 0;
            const quantity = item.quantity || 1;
            // Convert to monthly if needed
            let monthlyAmount = unitAmount * quantity;
            if (item.price.recurring?.interval === 'year') {
              monthlyAmount = monthlyAmount / 12;
            } else if (item.price.recurring?.interval === 'week') {
              monthlyAmount = monthlyAmount * 4.33;
            }
            return sum + monthlyAmount;
          }, 0);
          return total + amount;
        }, 0);

      res.json({
        ok: true,
        data: {
          period: from || to ? {
            from: from ? new Date(from as string).toISOString() : undefined,
            to: to ? new Date(to as string).toISOString() : undefined,
          } : 'all_time',
          status_counts: statusCounts,
          total_subscriptions: subscriptions.length,
          mrr: mrr / 100, // Convert from cents
          currency: 'usd',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * GET /reports/subscriptions/dunning
 * List customers with past due invoices
 */
router.get('/reports/subscriptions/dunning', async (req: Request, res: Response, next) => {
  try {
    const stripe = getStripeClient();

    // Fetch open and past_due invoices
    const invoices: Stripe.Invoice[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    // Fetch open invoices
    while (hasMore) {
      const batch = await stripe.invoices.list({
        collection_method: 'charge_automatically',
        status: 'open',
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      });

      invoices.push(...batch.data);
      hasMore = batch.has_more;

      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    // Reset for past_due invoices
    hasMore = true;
    startingAfter = undefined;

    // Fetch past_due invoices
    while (hasMore) {
      const batch = await stripe.invoices.list({
        collection_method: 'charge_automatically',
        status: 'past_due',
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      });

      invoices.push(...batch.data);
      hasMore = batch.has_more;

      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    // Group by customer and aggregate amounts
    const customerDebts: { [customerId: string]: any } = {};

    for (const invoice of invoices) {
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

      if (!customerId) continue;

      if (!customerDebts[customerId]) {
        // Fetch customer details
        const customer = await stripe.customers.retrieve(customerId);

        customerDebts[customerId] = {
          customer_id: customerId,
          email: (customer as Stripe.Customer).email,
          name: (customer as Stripe.Customer).name,
          total_amount_due: 0,
          invoice_count: 0,
          oldest_invoice_date: null,
          invoices: [],
        };
      }

      customerDebts[customerId].total_amount_due += invoice.amount_due;
      customerDebts[customerId].invoice_count += 1;

      const invoiceDate = new Date(invoice.created * 1000);
      if (
        !customerDebts[customerId].oldest_invoice_date ||
        invoiceDate < new Date(customerDebts[customerId].oldest_invoice_date)
      ) {
        customerDebts[customerId].oldest_invoice_date = invoiceDate.toISOString();
      }

      customerDebts[customerId].invoices.push({
        invoice_id: invoice.id,
        amount_due: invoice.amount_due / 100,
        due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        status: invoice.status,
        attempt_count: invoice.attempt_count,
      });
    }

    // Convert to array and sort by amount due
    const dunningList = Object.values(customerDebts)
      .map((debt) => ({
        ...debt,
        total_amount_due: debt.total_amount_due / 100, // Convert to dollars
      }))
      .sort((a, b) => b.total_amount_due - a.total_amount_due);

    res.json({
      ok: true,
      data: {
        customers: dunningList,
        summary: {
          total_customers: dunningList.length,
          total_amount_due: dunningList.reduce((sum, c) => sum + c.total_amount_due, 0),
          total_invoices: dunningList.reduce((sum, c) => sum + c.invoice_count, 0),
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /reports/mrr
 * Calculate Monthly Recurring Revenue
 */
router.get('/reports/mrr', async (req: Request, res: Response, next) => {
  try {
    const stripe = getStripeClient();

    // Fetch all active subscriptions
    const subscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const batch = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        expand: ['data.items.data.price'],
        ...(startingAfter && { starting_after: startingAfter }),
      });

      subscriptions.push(...batch.data);
      hasMore = batch.has_more;

      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    // Calculate MRR
    let totalMrr = 0;
    const mrrByPriceId: { [priceId: string]: { count: number; mrr: number; price_name?: string } } =
      {};

    subscriptions.forEach((subscription) => {
      subscription.items.data.forEach((item) => {
        const price = item.price;
        let monthlyAmount = 0;

        // Convert to monthly amount based on interval
        if (price.recurring) {
          const unitAmount = price.unit_amount || 0;

          switch (price.recurring.interval) {
            case 'month':
              monthlyAmount = unitAmount * (price.recurring.interval_count || 1);
              break;
            case 'year':
              monthlyAmount = (unitAmount / 12) * (price.recurring.interval_count || 1);
              break;
            case 'week':
              monthlyAmount = unitAmount * 4.33 * (price.recurring.interval_count || 1);
              break;
            case 'day':
              monthlyAmount = unitAmount * 30 * (price.recurring.interval_count || 1);
              break;
          }
        }

        totalMrr += monthlyAmount;

        // Track by price ID
        if (!mrrByPriceId[price.id]) {
          mrrByPriceId[price.id] = {
            count: 0,
            mrr: 0,
            price_name: price.nickname || price.id,
          };
        }

        mrrByPriceId[price.id].count += 1;
        mrrByPriceId[price.id].mrr += monthlyAmount;
      });
    });

    // Convert to array and sort by MRR
    const mrrBreakdown = Object.entries(mrrByPriceId)
      .map(([priceId, data]) => ({
        price_id: priceId,
        price_name: data.price_name,
        subscription_count: data.count,
        mrr: data.mrr / 100, // Convert to dollars
      }))
      .sort((a, b) => b.mrr - a.mrr);

    res.json({
      ok: true,
      data: {
        total_mrr: totalMrr / 100, // Convert to dollars
        active_subscriptions: subscriptions.length,
        average_subscription_value:
          subscriptions.length > 0 ? totalMrr / 100 / subscriptions.length : 0,
        breakdown_by_price: mrrBreakdown,
        calculated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// Apply Stripe error handler
router.use(stripeErrorHandler);

export default router;
