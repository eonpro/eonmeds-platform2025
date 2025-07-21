import { Request, Response } from 'express';
import { pool } from '../config/database';
import stripeService from '../services/stripe.service';

// Create a payment intent
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { amount, customerId, metadata } = req.body;
    
    if (!amount || !customerId) {
      return res.status(400).json({
        error: 'Amount and customerId are required'
      });
    }
    
    const result = await stripeService.createPaymentIntent(amount, customerId, metadata);
    
    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }
    
    res.json({
      clientSecret: result.paymentIntent?.client_secret,
      paymentIntentId: result.paymentIntent?.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      error: 'Failed to create payment intent'
    });
  }
};

// Charge an invoice
export const chargeInvoice = async (req: Request, res: Response) => {
  try {
    const {
      invoiceId,
      amount,
      paymentMethodId,
      customerId,
      patientId
    } = req.body;
    
    if (!invoiceId || !amount || !paymentMethodId || !customerId) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }
    
    // Get invoice details
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoiceId]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Invoice not found'
      });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Charge the invoice using Stripe
    const chargeResult = await stripeService.chargeInvoice({
      amount,
      customerId,
      paymentMethodId,
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      patientId
    });
    
    if (!chargeResult.success) {
      return res.status(400).json({
        error: chargeResult.error,
        requiresAction: chargeResult.requiresAction
      });
    }
    
    // Update invoice status
    await pool.query(
      `UPDATE invoices 
       SET status = 'paid', 
           amount_paid = $1,
           payment_date = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [amount, invoiceId]
    );
    
    // Create payment record
    await pool.query(
      `INSERT INTO invoice_payments (
        invoice_id, amount, payment_method, payment_date,
        stripe_payment_intent_id, stripe_charge_id, status
      ) VALUES ($1, $2, $3, NOW(), $4, $5, $6)`,
      [
        invoiceId,
        amount,
        'card',
        chargeResult.paymentIntent?.id,
        chargeResult.paymentIntent?.charges?.data[0]?.id,
        'succeeded'
      ]
    );
    
    res.json({
      success: true,
      paymentIntent: chargeResult.paymentIntent
    });
    
  } catch (error) {
    console.error('Error charging invoice:', error);
    res.status(500).json({
      error: 'Failed to process payment'
    });
  }
};

// Get payment methods for a patient
export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    
    // Get patient's stripe customer ID
    const patientResult = await pool.query(
      'SELECT stripe_customer_id FROM patients WHERE patient_id = $1',
      [patientId]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }
    
    const customerId = patientResult.rows[0].stripe_customer_id;
    
    if (!customerId) {
      return res.json({
        paymentMethods: []
      });
    }
    
    // Get payment methods from Stripe
    const result = await stripeService.listPaymentMethods(customerId);
    
    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }
    
    res.json({
      paymentMethods: result.paymentMethods
    });
    
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      error: 'Failed to fetch payment methods'
    });
  }
};

// Detach a payment method
export const detachPaymentMethod = async (req: Request, res: Response) => {
  try {
    const { paymentMethodId } = req.params;
    
    const result = await stripeService.detachPaymentMethod(paymentMethodId);
    
    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Payment method removed successfully'
    });
    
  } catch (error) {
    console.error('Error detaching payment method:', error);
    res.status(500).json({
      error: 'Failed to remove payment method'
    });
  }
}; 