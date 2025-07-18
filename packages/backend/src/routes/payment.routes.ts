import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { handleStripeWebhook } from '../controllers/stripe-webhook.controller';
import StripeService from '../services/stripe.service';
import pool from '../config/database';

const router = Router();
const stripeService = new StripeService();

// Stripe webhook endpoint (no auth required)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// All other routes require authentication
router.use(authenticateToken);

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
      const customer = await stripeService.getCustomer(patient.stripe_customer_id);
      return res.json({ customer: customer.customer });
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
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// ==================== Payment Methods ====================

// Add payment method to customer
router.post('/payment-methods/attach', async (req, res) => {
  try {
    const { payment_method_id, customer_id } = req.body;
    
    const result = await stripeService.attachPaymentMethod(payment_method_id, customer_id);
    
    if (result.success) {
      res.json({ paymentMethod: result.paymentMethod });
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
      res.json({ paymentMethods: result.paymentMethods });
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

// List invoices for patient
router.get('/invoices/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;
    
    let query = `
      SELECT i.*, 
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
    `;
    
    const params: any[] = [patientId];
    
    if (status) {
      query += ' AND i.status = $' + (params.length + 1);
      params.push(status);
    }
    
    query += ' GROUP BY i.id ORDER BY i.invoice_date DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({ 
      invoices: result.rows,
      total: result.rowCount 
    });
  } catch (error) {
    console.error('Error listing invoices:', error);
    res.status(500).json({ error: 'Failed to list invoices' });
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
            invoice_id, description, quantity, unit_price, service_type
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            invoice.id,
            item.description,
            item.quantity,
            item.unit_price,
            item.service_type
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
    
    // Create payment intent
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
        // Confirm payment logic here
      }
      
      res.json({ paymentIntent: result.paymentIntent });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

export default router; 