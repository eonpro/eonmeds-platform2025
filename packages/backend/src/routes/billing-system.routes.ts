import { Router, Request, Response } from 'express';
import { BillingSystemService } from '../services/billing-system.service';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { body, param, query } from 'express-validator';

export function createBillingSystemRoutes(billingService: BillingSystemService): Router {
  const router = Router();

  // All routes require authentication
  router.use(authenticate);

  // ========== BILLING PLANS ==========

  // Create a new billing plan
  router.post('/plans',
    validate([
      body('name').notEmpty().withMessage('Plan name is required'),
      body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
      body('interval').isIn(['day', 'week', 'month', 'year']).withMessage('Invalid interval'),
      body('interval_count').optional().isInt({ min: 1 }).withMessage('Interval count must be positive'),
      body('trial_period_days').optional().isInt({ min: 0 }).withMessage('Trial period must be non-negative')
    ]),
    async (req: Request, res: Response) => {
      try {
        const plan = await billingService.createBillingPlan(req.body);
        res.status(201).json({ success: true, data: plan });
      } catch (error: any) {
        console.error('Error creating billing plan:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Get all billing plans
  router.get('/plans',
    validate([
      query('active_only').optional().isBoolean().withMessage('active_only must be boolean')
    ]),
    async (req: Request, res: Response) => {
      try {
        const activeOnly = req.query.active_only !== 'false';
        const plans = await billingService.getBillingPlans(activeOnly);
        res.json({ success: true, data: plans });
      } catch (error: any) {
        console.error('Error fetching billing plans:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Get a specific billing plan
  router.get('/plans/:id',
    validate([
      param('id').isUUID().withMessage('Invalid plan ID')
    ]),
    async (req: Request, res: Response) => {
      try {
        const plan = await billingService.getBillingPlan(req.params.id);
        if (!plan) {
          return res.status(404).json({ success: false, error: 'Plan not found' });
        }
        res.json({ success: true, data: plan });
      } catch (error: any) {
        console.error('Error fetching billing plan:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // ========== SUBSCRIPTIONS ==========

  // Create a new subscription
  router.post('/subscriptions',
    validate([
      body('customer_id').isUUID().withMessage('Invalid customer ID'),
      body('plan_id').isUUID().withMessage('Invalid plan ID'),
      body('payment_method_id').optional().isString(),
      body('trial_period_days').optional().isInt({ min: 0 })
    ]),
    async (req: Request, res: Response) => {
      try {
        const subscription = await billingService.createSubscription(req.body);
        res.status(201).json({ success: true, data: subscription });
      } catch (error: any) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Update a subscription
  router.patch('/subscriptions/:id',
    validate([
      param('id').isUUID().withMessage('Invalid subscription ID'),
      body('plan_id').optional().isUUID(),
      body('cancel_at_period_end').optional().isBoolean(),
      body('pause_collection').optional().isObject()
    ]),
    async (req: Request, res: Response) => {
      try {
        const subscription = await billingService.updateSubscription(req.params.id, req.body);
        res.json({ success: true, data: subscription });
      } catch (error: any) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Cancel a subscription
  router.post('/subscriptions/:id/cancel',
    validate([
      param('id').isUUID().withMessage('Invalid subscription ID'),
      body('immediately').optional().isBoolean()
    ]),
    async (req: Request, res: Response) => {
      try {
        const immediately = req.body.immediately === true;
        const subscription = await billingService.cancelSubscription(req.params.id, immediately);
        res.json({ success: true, data: subscription });
      } catch (error: any) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Pause a subscription
  router.post('/subscriptions/:id/pause',
    validate([
      param('id').isUUID().withMessage('Invalid subscription ID'),
      body('resume_at').optional().isISO8601()
    ]),
    async (req: Request, res: Response) => {
      try {
        const resumeAt = req.body.resume_at ? new Date(req.body.resume_at) : undefined;
        const subscription = await billingService.pauseSubscription(req.params.id, resumeAt);
        res.json({ success: true, data: subscription });
      } catch (error: any) {
        console.error('Error pausing subscription:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Resume a subscription
  router.post('/subscriptions/:id/resume',
    validate([
      param('id').isUUID().withMessage('Invalid subscription ID')
    ]),
    async (req: Request, res: Response) => {
      try {
        const subscription = await billingService.resumeSubscription(req.params.id);
        res.json({ success: true, data: subscription });
      } catch (error: any) {
        console.error('Error resuming subscription:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // ========== PAYMENTS ==========

  // Process a payment
  router.post('/payments',
    validate([
      body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
      body('customer_id').isUUID().withMessage('Invalid customer ID'),
      body('payment_method_id').notEmpty().withMessage('Payment method ID is required'),
      body('invoice_id').optional().isUUID()
    ]),
    async (req: Request, res: Response) => {
      try {
        const transaction = await billingService.processPayment(req.body);
        res.status(201).json({ success: true, data: transaction });
      } catch (error: any) {
        console.error('Error processing payment:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Save a payment method
  router.post('/payment-methods',
    validate([
      body('customer_id').isUUID().withMessage('Invalid customer ID'),
      body('payment_method_id').notEmpty().withMessage('Payment method ID is required'),
      body('set_as_default').optional().isBoolean()
    ]),
    async (req: Request, res: Response) => {
      try {
        const paymentMethod = await billingService.savePaymentMethod(
          req.body.customer_id,
          req.body.payment_method_id,
          req.body.set_as_default || false
        );
        res.status(201).json({ success: true, data: paymentMethod });
      } catch (error: any) {
        console.error('Error saving payment method:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Get payment methods for a customer
  router.get('/customers/:customer_id/payment-methods',
    validate([
      param('customer_id').isUUID().withMessage('Invalid customer ID')
    ]),
    async (req: Request, res: Response) => {
      try {
        const paymentMethods = await billingService.getPaymentMethods(req.params.customer_id);
        res.json({ success: true, data: paymentMethods });
      } catch (error: any) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // ========== REPORTING ==========

  // Get revenue report
  router.get('/reports/revenue',
    validate([
      query('start_date').isISO8601().withMessage('Invalid start date'),
      query('end_date').isISO8601().withMessage('Invalid end date')
    ]),
    async (req: Request, res: Response) => {
      try {
        const startDate = new Date(req.query.start_date as string);
        const endDate = new Date(req.query.end_date as string);
        const report = await billingService.getRevenueReport(startDate, endDate);
        res.json({ success: true, data: report });
      } catch (error: any) {
        console.error('Error generating revenue report:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Get customer metrics
  router.get('/customers/:customer_id/metrics',
    validate([
      param('customer_id').isUUID().withMessage('Invalid customer ID')
    ]),
    async (req: Request, res: Response) => {
      try {
        const metrics = await billingService.getCustomerMetrics(req.params.customer_id);
        res.json({ success: true, data: metrics });
      } catch (error: any) {
        console.error('Error fetching customer metrics:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Get current MRR
  router.get('/metrics/mrr',
    async (req: Request, res: Response) => {
      try {
        const mrr = await billingService.calculateMRR();
        res.json({ success: true, data: { mrr, currency: 'USD' } });
      } catch (error: any) {
        console.error('Error calculating MRR:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Update financial summary (typically called by a cron job)
  router.post('/reports/update-summary',
    async (req: Request, res: Response) => {
      try {
        await billingService.updateFinancialSummary();
        res.json({ success: true, message: 'Financial summary updated' });
      } catch (error: any) {
        console.error('Error updating financial summary:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  return router;
}
