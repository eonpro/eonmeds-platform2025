import { Router, Request, Response } from "express";
import { financialDashboardService } from "../services/financial-dashboard.service";

const router = Router();

// Middleware to check for admin role
const checkAdminAccess = (req: Request, res: Response, next: any) => {
  // In a real app, this would check the JWT token for admin role
  // For now, we'll add a simple check that can be enhanced later
  const userRole = (req as any).user?.role || req.headers['x-user-role'];
  
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ 
      error: "Access denied",
      message: "This resource is restricted to administrators only"
    });
  }
  
  next();
};

// Apply admin check to all routes
router.use(checkAdminAccess);

/**
 * GET /api/v1/financial-dashboard/overview
 * Get comprehensive financial dashboard data
 */
router.get("/overview", async (req: Request, res: Response) => {
  try {
    // Parse date range from query params
    const { startDate, endDate } = req.query;
    
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };
    }

    const metrics = await financialDashboardService.getDashboardMetrics(dateRange);

    res.json({
      success: true,
      data: metrics,
      period: {
        start: dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: dateRange?.end || new Date(),
      },
    });
  } catch (error: any) {
    console.error("Error fetching dashboard metrics:", error);
    res.status(500).json({ 
      error: "Failed to fetch financial dashboard data",
      message: error.message 
    });
  }
});

/**
 * GET /api/v1/financial-dashboard/payments
 * Get detailed payment analytics
 */
router.get("/payments", async (req: Request, res: Response) => {
  try {
    const { status, limit = 50 } = req.query;
    
    // Fetch payments with optional status filter
    const paymentIntents = await financialDashboardService.getStripeClient().paymentIntents.list({
      limit: Number(limit),
      expand: ['data.customer', 'data.payment_method'],
    });

    // Filter by status if provided
    let filtered = paymentIntents.data;
    if (status) {
      filtered = filtered.filter(pi => pi.status === status);
    }

    // Format the response
    const payments = filtered.map(pi => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency,
      status: pi.status,
      customer: {
        id: (pi.customer as any)?.id || null,
        email: (pi.customer as any)?.email || null,
        name: (pi.customer as any)?.name || null,
      },
      payment_method: {
        type: (pi.payment_method as any)?.type || null,
        brand: (pi.payment_method as any)?.card?.brand || null,
        last4: (pi.payment_method as any)?.card?.last4 || null,
      },
      description: pi.description,
      metadata: pi.metadata,
      created: new Date(pi.created * 1000),
      failure_reason: pi.last_payment_error?.message || null,
    }));

    res.json({
      success: true,
      data: payments,
      total: payments.length,
    });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ 
      error: "Failed to fetch payment data",
      message: error.message 
    });
  }
});

/**
 * GET /api/v1/financial-dashboard/customers
 * Get customer analytics
 */
router.get("/customers", async (req: Request, res: Response) => {
  try {
    const { limit = 50, hasPaymentMethod } = req.query;
    
    // Fetch customers
    const customers = await financialDashboardService.getStripeClient().customers.list({
      limit: Number(limit),
      expand: ['data.default_source'],
    });

    // Process customer data
    const customerData = await Promise.all(
      customers.data
        .filter(c => !(c as any).deleted)
        .map(async (customer) => {
          // Get payment methods for this customer
          const paymentMethods = await financialDashboardService.getStripeClient().paymentMethods.list({
            customer: customer.id,
            limit: 5,
          });

          // Get lifetime value (total spent)
          const charges = await financialDashboardService.getStripeClient().charges.list({
            customer: customer.id,
            limit: 100,
          });

          const lifetimeValue = charges.data
            .filter(c => c.status === 'succeeded')
            .reduce((sum, c) => sum + (c.amount / 100), 0);

          return {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            created: new Date(customer.created * 1000),
            metadata: customer.metadata,
            payment_methods: paymentMethods.data.map(pm => ({
              id: pm.id,
              type: pm.type,
              brand: pm.card?.brand,
              last4: pm.card?.last4,
              is_default: pm.id === customer.invoice_settings?.default_payment_method,
            })),
            lifetime_value: lifetimeValue,
            total_payments: charges.data.filter(c => c.status === 'succeeded').length,
          };
        })
    );

    // Filter by hasPaymentMethod if specified
    let filtered = customerData;
    if (hasPaymentMethod === 'true') {
      filtered = customerData.filter(c => c.payment_methods.length > 0);
    } else if (hasPaymentMethod === 'false') {
      filtered = customerData.filter(c => c.payment_methods.length === 0);
    }

    res.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ 
      error: "Failed to fetch customer data",
      message: error.message 
    });
  }
});

/**
 * GET /api/v1/financial-dashboard/subscriptions
 * Get subscription metrics
 */
router.get("/subscriptions", async (req: Request, res: Response) => {
  try {
    const metrics = await financialDashboardService.getSubscriptionMetrics();
    
    // Get detailed subscription list
    const subscriptions = await financialDashboardService.getStripeClient().subscriptions.list({
      limit: 100,
      expand: ['data.customer', 'data.default_payment_method'],
    });

    const subscriptionData = subscriptions.data.map(sub => ({
      id: sub.id,
      customer: {
        id: (sub.customer as any)?.id || null,
        email: (sub.customer as any)?.email || null,
        name: (sub.customer as any)?.name || null,
      },
      status: sub.status,
      current_period_start: new Date((sub as any).current_period_start * 1000),
      current_period_end: new Date((sub as any).current_period_end * 1000),
      items: sub.items.data.map(item => ({
        product_name: (item.price.product as any)?.name || 'Unknown',
        amount: (item.price.unit_amount || 0) / 100,
        interval: item.price.recurring?.interval,
        quantity: item.quantity,
      })),
      total_amount: sub.items.data.reduce((sum, item) => {
        return sum + ((item.price.unit_amount || 0) * (item.quantity || 1)) / 100;
      }, 0),
    }));

    res.json({
      success: true,
      metrics,
      subscriptions: subscriptionData,
    });
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ 
      error: "Failed to fetch subscription data",
      message: error.message 
    });
  }
});

/**
 * GET /api/v1/financial-dashboard/revenue-chart
 * Get revenue data for charting
 */
router.get("/revenue-chart", async (req: Request, res: Response) => {
  try {
    const { days = 30, interval = 'daily' } = req.query;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - Number(days) * 24 * 60 * 60 * 1000);

    // Fetch all charges in the date range
    const charges = await financialDashboardService.getStripeClient().charges.list({
      limit: 100,
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
    });

    // Group by day/week/month based on interval
    const revenueByPeriod = new Map<string, number>();
    
    charges.data
      .filter(c => c.status === 'succeeded')
      .forEach(charge => {
        const date = new Date(charge.created * 1000);
        let key: string;
        
        if (interval === 'daily') {
          key = date.toISOString().split('T')[0];
        } else if (interval === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        revenueByPeriod.set(key, (revenueByPeriod.get(key) || 0) + (charge.amount / 100));
      });

    // Convert to array and sort
    const chartData = Array.from(revenueByPeriod.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: chartData,
      summary: {
        total: chartData.reduce((sum, d) => sum + d.amount, 0),
        average: chartData.length > 0 
          ? chartData.reduce((sum, d) => sum + d.amount, 0) / chartData.length 
          : 0,
        periods: chartData.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching revenue chart data:", error);
    res.status(500).json({ 
      error: "Failed to fetch revenue chart data",
      message: error.message 
    });
  }
});

export default router;
