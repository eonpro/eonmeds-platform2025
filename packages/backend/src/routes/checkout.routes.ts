/**
 * Customer Checkout Routes
 * Public routes for customer checkout flow
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

/**
 * POST /api/v1/checkout/create-session
 * Create a Stripe payment intent for checkout
 */
router.post('/create-session', async (req: Request, res: Response) => {
  try {
    const {
      plan_id,
      plan_months,
      amount,
      customer,
      shipping_address,
      billing_address,
    } = req.body;

    // Validate required fields
    if (!customer?.email || !customer?.first_name || !customer?.last_name) {
      return res.status(400).json({
        error: 'Missing required customer information',
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
      });
    }

    // Check if customer exists in Stripe
    let stripeCustomer;
    try {
      const customers = await stripe.customers.list({
        email: customer.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        stripeCustomer = customers.data[0];
      } else {
        // Create new Stripe customer
        stripeCustomer = await stripe.customers.create({
          email: customer.email,
          name: `${customer.first_name} ${customer.last_name}`,
          phone: customer.phone,
          address: shipping_address,
          metadata: {
            plan_id: plan_id,
            plan_months: String(plan_months),
            source: 'checkout_page',
          },
        });
      }
    } catch (error) {
      console.error('Error with Stripe customer:', error);
      return res.status(500).json({
        error: 'Failed to process customer information',
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount is already in cents from frontend
      currency: 'usd',
      customer: stripeCustomer.id,
      metadata: {
        plan_id: plan_id,
        plan_months: String(plan_months),
        customer_email: customer.email,
        customer_first_name: customer.first_name,
        customer_last_name: customer.last_name,
        customer_phone: customer.phone || '',
        source: 'checkout_page',
      },
      description: `${plan_months} month subscription plan`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Return client secret for payment confirmation
    res.json({
      clientSecret: paymentIntent.client_secret,
      customerId: stripeCustomer.id,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: error.message || 'Failed to create checkout session',
    });
  }
});

/**
 * POST /api/v1/checkout/confirm-payment
 * Confirm payment and create patient/invoice records
 */
router.post('/confirm-payment', async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Missing payment intent ID',
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Payment not successful',
        status: paymentIntent.status,
      });
    }

    // Extract customer information from metadata
    const {
      customer_email,
      customer_first_name,
      customer_last_name,
      customer_phone,
      plan_id,
      plan_months,
    } = paymentIntent.metadata;

    // Check if patient already exists
    let patientResult = await pool.query(
      'SELECT id, patient_id, stripe_customer_id FROM patients WHERE email = $1',
      [customer_email]
    );

    let patientId;
    let patientRecordId;

    if (patientResult.rows.length === 0) {
      // Generate patient ID
      const patientIdResult = await pool.query(
        'SELECT generate_patient_id() as patient_id'
      );
      patientId = patientIdResult.rows[0].patient_id;

      // Create new patient
      const insertResult = await pool.query(
        `INSERT INTO patients (
          patient_id,
          first_name,
          last_name,
          email,
          phone,
          stripe_customer_id,
          form_type,
          form_version,
          submitted_at,
          status,
          consent_treatment,
          consent_telehealth,
          consent_date,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING id, patient_id`,
        [
          patientId,
          customer_first_name,
          customer_last_name,
          customer_email,
          customer_phone || null,
          paymentIntent.customer,
          'checkout_page',
          '1.0',
          new Date(),
          'active',
          true,
          true,
          new Date(),
        ]
      );
      
      patientRecordId = insertResult.rows[0].id;
      console.log('Created new patient:', patientId);
    } else {
      // Update existing patient with Stripe customer ID if needed
      patientRecordId = patientResult.rows[0].id;
      patientId = patientResult.rows[0].patient_id;
      
      if (!patientResult.rows[0].stripe_customer_id) {
        await pool.query(
          'UPDATE patients SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
          [paymentIntent.customer, patientRecordId]
        );
      }
      console.log('Using existing patient:', patientId);
    }

    // Create order record
    const orderResult = await pool.query(
      `INSERT INTO orders (
        patient_id,
        stripe_payment_intent_id,
        stripe_customer_id,
        plan_id,
        plan_type,
        plan_duration_months,
        total_amount,
        currency,
        customer_email,
        customer_name,
        customer_phone,
        payment_status,
        source,
        metadata,
        paid_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), NOW())
      RETURNING id, order_number`,
      [
        patientRecordId,
        paymentIntent.id,
        paymentIntent.customer,
        plan_id,
        'subscription',
        parseInt(plan_months),
        paymentIntent.amount / 100, // Convert from cents to dollars
        paymentIntent.currency,
        customer_email,
        `${customer_first_name} ${customer_last_name}`,
        customer_phone || null,
        'succeeded',
        'checkout_page',
        JSON.stringify({
          plan_id,
          plan_months,
          stripe_payment_intent: paymentIntent.id,
        }),
      ]
    );

    const orderNumber = orderResult.rows[0].order_number;
    console.log('Created order:', orderNumber);

    // Create invoice record (linked to order)
    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceResult = await pool.query(
      `INSERT INTO invoices (
        invoice_number,
        patient_id,
        order_id,
        stripe_payment_intent_id,
        amount,
        currency,
        status,
        description,
        metadata,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id`,
      [
        invoiceNumber,
        patientRecordId,
        orderResult.rows[0].id,
        paymentIntent.id,
        paymentIntent.amount / 100, // Convert from cents to dollars
        paymentIntent.currency,
        'paid',
        `${plan_months} month subscription plan`,
        JSON.stringify({
          plan_id,
          plan_months,
          stripe_customer_id: paymentIntent.customer,
          order_number: orderNumber,
        }),
      ]
    );

    console.log('Created invoice:', invoiceNumber);

    // TODO: Send confirmation email
    // TODO: Trigger any post-payment workflows

    res.json({
      success: true,
      patientId: patientId,
      invoiceNumber: invoiceNumber,
      message: 'Payment confirmed and patient created successfully',
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      error: error.message || 'Failed to confirm payment',
    });
  }
});

/**
 * GET /api/v1/checkout/order/:paymentIntentId
 * Get order details for success page
 */
router.get('/order/:paymentIntentId', async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({
        error: 'Payment not found',
      });
    }

    // Get order details from database
    const orderResult = await pool.query(
      `SELECT 
        o.order_number,
        o.total_amount,
        o.payment_status,
        o.customer_email,
        o.customer_name,
        o.plan_type,
        o.plan_duration_months,
        p.patient_id,
        p.email,
        p.first_name,
        p.last_name
      FROM orders o
      LEFT JOIN patients p ON o.patient_id = p.id
      WHERE o.stripe_payment_intent_id = $1`,
      [paymentIntentId]
    );

    if (orderResult.rows.length === 0) {
      // Payment exists in Stripe but not yet in our database
      // This might happen if webhook hasn't processed yet
      return res.json({
        orderNumber: `EON-${Date.now()}`,
        email: paymentIntent.receipt_email || paymentIntent.metadata.customer_email,
        amount: paymentIntent.amount / 100,
        status: paymentIntent.status,
        processing: true,
      });
    }

    const order = orderResult.rows[0];

    res.json({
      orderNumber: order.order_number,
      patientId: order.patient_id,
      email: order.customer_email || order.email,
      customerName: order.customer_name || `${order.first_name} ${order.last_name}`,
      amount: parseFloat(order.total_amount),
      status: order.payment_status,
      planType: order.plan_type,
      planDuration: order.plan_duration_months,
      processing: false,
    });
  } catch (error: any) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      error: 'Failed to fetch order details',
    });
  }
});

/**
 * POST /api/v1/checkout/validate-promo
 * Validate promo code
 */
router.post('/validate-promo', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    // Simple promo code validation
    // In production, this would check against a database of valid codes
    const validPromos: Record<string, number> = {
      'SAVE10': 10,
      'WELCOME20': 20,
      'FIRST50': 50,
    };

    const discount = validPromos[code.toUpperCase()] || 0;

    res.json({
      valid: discount > 0,
      discount: discount,
      message: discount > 0 ? `${discount}% discount applied!` : 'Invalid promo code',
    });
  } catch (error: any) {
    console.error('Error validating promo:', error);
    res.status(500).json({
      error: 'Failed to validate promo code',
    });
  }
});

export default router;
