import { Router } from 'express';
import express from 'express';
import { checkJwt, handleAuthError } from '../middleware/auth0';
import { handleStripeWebhook } from '../controllers/stripe-webhook.controller';
import stripeService from '../services/stripe.service';
import { pool } from '../config/database';
import { validateStripeConfig } from '../config/stripe.config';

const router = Router();

// Validate Stripe configuration on startup
validateStripeConfig();

// Stripe webhook endpoint (no auth required)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// All other routes require Auth0 authentication
router.use(checkJwt);
router.use(handleAuthError);

// ==================== Customer Management ====================

// Create or get Stripe customer for patient
router.post('/customers/create', async (req, res) => {
  try {
    const { patient_id } = req.body;
    
    // Get patient data
    const patientResult = await pool.query(
      'SELECT * FROM patients WHERE patient_id = $1',
      [patient_id]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = patientResult.rows[0];
    
    // Check if customer already exists
    if (patient.stripe_customer_id) {
      const result = await stripeService.getCustomer(patient.stripe_customer_id);
      if (result.success) {
        return res.json({ customer: result.customer });
      }
    }
    
    // Create new customer
    const result = await stripeService.createCustomer(patient);
    
    if (result.success) {
      // Update patient with Stripe customer ID
      await pool.query(
        'UPDATE patients SET stripe_customer_id = $1 WHERE patient_id = $2',
        [result.customer.id, patient_id]
      );
      
      res.json({ customer: result.customer });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Payment Methods ====================

// Add payment method to customer
router.post('/payment-methods/attach', async (req, res) => {
  try {
    const { payment_method_id, customer_id } = req.body;
    
    const result = await stripeService.attachPaymentMethod(payment_method_id, customer_id);
    
    if (result.success) {
      res.json({ customer: result.customer });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error attaching payment method:', error);
    res.status(500).json({ error: 'Failed to attach payment method' });
  }
});

// List customer's payment methods
router.get('/payment-methods/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const result = await stripeService.listPaymentMethods(customerId);
    
    if (result.success) {
      res.json({ customer: result.customer });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error listing payment methods:', error);
    res.status(500).json({ error: 'Failed to list payment methods' });
  }
});

// ==================== Subscriptions ====================

// Create subscription
router.post('/subscriptions/create', async (req, res) => {
  try {
    const { patient_id, price_id, payment_method_id } = req.body;
    
    // Get patient with Stripe customer ID
    const patientResult = await pool.query(
      'SELECT stripe_customer_id FROM patients WHERE patient_id = $1',
      [patient_id]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const customerId = patientResult.rows[0].stripe_customer_id;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Patient has no Stripe customer ID' });
    }
    
    const result = await stripeService.createSubscription(customerId, price_id, payment_method_id);
    
    if (result.success) {
      res.json({ subscription: result.subscription });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Pause subscription
router.post('/subscriptions/:subscriptionId/pause', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const result = await stripeService.pauseSubscription(subscriptionId);
    
    if (result.success) {
      res.json({ subscription: result.subscription });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error pausing subscription:', error);
    res.status(500).json({ error: 'Failed to pause subscription' });
  }
});

// Resume subscription
router.post('/subscriptions/:subscriptionId/resume', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const result = await stripeService.resumeSubscription(subscriptionId);
    
    if (result.success) {
      res.json({ subscription: result.subscription });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

// Cancel subscription
router.post('/subscriptions/:subscriptionId/cancel', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { immediately = false } = req.body;
    
    const result = await stripeService.cancelSubscription(subscriptionId, immediately);
    
    if (result.success) {
      res.json({ subscription: result.subscription });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Get subscription details
router.get('/subscriptions/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const result = await stripeService.getSubscription(subscriptionId);
    
    if (result.success) {
      res.json({ subscription: result.subscription });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// ==================== Invoices ====================

// Get all invoices for a patient
router.get('/invoices/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const query = `
      SELECT 
        i.*,
        array_agg(
          json_build_object(
            'id', ii.id,
            'description', ii.description,
            'quantity', ii.quantity,
            'unit_price', ii.unit_price,
            'amount', ii.amount
          )
        ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.patient_id = $1
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `;
    
    const result = await pool.query(query, [patientId]);
    
    res.json({
      success: true,
      invoices: result.rows
    });
  } catch (error) {
    console.error('Error fetching patient invoices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch invoices' 
    });
  }
});

// Get income report (admin only)
router.get('/income-report', async (req, res) => {
  try {
    const { start_date, end_date, payment_method } = req.query;
    
    let paymentQuery = `
      SELECT 
        p.id,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.status,
        p.stripe_payment_id,
        p.offline_reference,
        i.invoice_number,
        i.patient_id,
        pat.first_name || ' ' || pat.last_name as patient_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN patients pat ON i.patient_id = pat.patient_id
      WHERE p.payment_date >= $1 AND p.payment_date <= $2
    `;
    
    const queryParams = [start_date, end_date];
    
    if (payment_method && payment_method !== 'all') {
      paymentQuery += ` AND p.payment_method = $3`;
      queryParams.push(payment_method);
    }
    
    paymentQuery += ` ORDER BY p.payment_date DESC`;
    
    const paymentsResult = await pool.query(paymentQuery, queryParams);
    
    // Calculate stats
    const statsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_method = 'stripe' AND status = 'paid' THEN amount ELSE 0 END), 0) as stripe_payments,
        COALESCE(SUM(CASE WHEN payment_method != 'stripe' AND status = 'paid' THEN amount ELSE 0 END), 0) as offline_payments,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as refunds,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_payments,
        COUNT(*) as payment_count
      FROM payments
      WHERE payment_date >= $1 AND payment_date <= $2
    `;
    
    const statsResult = await pool.query(statsQuery, [start_date, end_date]);
    
    res.json({
      success: true,
      payments: paymentsResult.rows,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Error generating income report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate income report' 
    });
  }
});

// Mark invoice as paid (offline payment)
router.post('/mark-paid', async (req, res) => {
  try {
    const { invoice_id, payment_date, payment_method, reference, notes } = req.body;
    
    // Start transaction
    await pool.query('BEGIN');
    
    // Get invoice details
    const invoiceQuery = `
      SELECT id, invoice_number, amount_due, patient_id 
      FROM invoices 
      WHERE id = $1 AND status = 'open'
    `;
    const invoiceResult = await pool.query(invoiceQuery, [invoice_id]);
    
    if (invoiceResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: 'Invoice not found or already paid' 
      });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Create payment record
    const paymentQuery = `
      INSERT INTO payments (
        invoice_id, 
        amount, 
        payment_method, 
        payment_date, 
        status, 
        offline_reference,
        notes
      ) VALUES ($1, $2, $3, $4, 'paid', $5, $6)
      RETURNING id
    `;
    
    await pool.query(paymentQuery, [
      invoice_id,
      invoice.amount_due,
      payment_method,
      payment_date,
      reference,
      notes
    ]);
    
    // Update invoice status
    const updateInvoiceQuery = `
      UPDATE invoices 
      SET 
        status = 'paid',
        amount_paid = amount_due,
        amount_due = 0,
        paid_at = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await pool.query(updateInvoiceQuery, [invoice_id, payment_date]);
    
    // Commit transaction
    await pool.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Invoice marked as paid successfully'
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark invoice as paid' 
    });
  }
});

// Charge an invoice using Stripe
router.post('/invoices/:invoiceId/charge', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { payment_method_id } = req.body;
    
    // Get invoice details
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoiceId]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }
    
    if (!invoice.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer associated with this invoice' });
    }
    
    // Charge the invoice
    const result = await stripeService.chargeInvoice({
      amount: invoice.amount_due,
      customerId: invoice.stripe_customer_id,
      paymentMethodId: payment_method_id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      patientId: invoice.patient_id
    });
    
    if (result.success) {
      // Payment will be marked as paid via webhook
      res.json({ 
        success: true,
        paymentIntent: result.paymentIntent 
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: result.error,
        requiresAction: result.requiresAction 
      });
    }
  } catch (error) {
    console.error('Error charging invoice:', error);
    res.status(500).json({ error: 'Failed to charge invoice' });
  }
});

// Get invoice by ID
router.get('/invoices/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const result = await pool.query(
      `SELECT i.*, 
              array_agg(
                json_build_object(
                  'id', ii.id,
                  'description', ii.description,
                  'quantity', ii.quantity,
                  'unit_price', ii.unit_price,
                  'amount', ii.amount
                )
              ) as items,
              p.first_name, p.last_name, p.email
       FROM invoices i
       LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
       LEFT JOIN patients p ON i.patient_id = p.patient_id
       WHERE i.id = $1
       GROUP BY i.id, p.first_name, p.last_name, p.email`,
      [invoiceId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json({ invoice: result.rows[0] });
  } catch (error) {
    console.error('Error getting invoice:', error);
    res.status(500).json({ error: 'Failed to get invoice' });
  }
});

// Create manual invoice
router.post('/invoices/create', async (req, res) => {
  try {
    const { patient_id, items, due_date, description } = req.body;
    
    // Get patient
    const patientResult = await pool.query(
      'SELECT stripe_customer_id FROM patients WHERE patient_id = $1',
      [patient_id]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Generate invoice number
      const invoiceNumResult = await pool.query('SELECT generate_invoice_number() as number');
      const invoiceNumber = invoiceNumResult.rows[0].number;
      
      // Calculate totals
      let subtotal = 0;
      items.forEach((item: any) => {
        subtotal += item.quantity * item.unit_price;
      });
      
      // Create invoice
      const invoiceResult = await pool.query(
        `INSERT INTO invoices (
          invoice_number, patient_id, stripe_customer_id,
          invoice_date, due_date, status, subtotal, total_amount,
          description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          invoiceNumber,
          patient_id,
          patientResult.rows[0].stripe_customer_id,
          new Date(),
          due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          'open',
          subtotal,
          subtotal, // Add tax calculation if needed
          description || 'Medical services'
        ]
      );
      
      const invoice = invoiceResult.rows[0];
      
      // Add line items
      for (const item of items) {
        await pool.query(
          `INSERT INTO invoice_items (
            invoice_id, description, quantity, unit_price, service_type, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            invoice.id,
            item.description,
            item.quantity,
            item.unit_price,
            item.service_type,
            JSON.stringify({ service_package_id: item.service_package_id }) // Store package_id in metadata
          ]
        );
      }
      
      await pool.query('COMMIT');
      
      res.json({ invoice });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// ==================== Payment Processing ====================

// Process payment for invoice
router.post('/invoices/:invoiceId/pay', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { payment_method_id } = req.body;
    
    // Get invoice details
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoiceId]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }
    
    const result = await stripeService.createPaymentIntent(
      invoice.amount_due * 100, // Convert to cents
      invoice.stripe_customer_id,
      {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        patient_id: invoice.patient_id
      }
    );
    
    if (result.success) {
      // If payment method provided, confirm payment
      if (payment_method_id) {
        const confirmResult = await stripeService.confirmPaymentIntent(result.paymentIntent.id, payment_method_id);
        if (confirmResult.success) {
          res.json({ paymentIntent: confirmResult.paymentIntent });
        } else {
          res.status(400).json({ error: confirmResult.error });
        }
      } else {
        res.json({ paymentIntent: result.paymentIntent });
      }
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

export default router; 