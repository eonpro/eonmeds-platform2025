import { Request, Response } from 'express';
import { pool } from '../config/database';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-06-30.basil' })
  : null;

// Create a payment intent
export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!stripe) {
      res.status(500).json({ error: 'Stripe not configured' });
      return;
    }

    const { amount, patientId } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      metadata: { patientId },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

// Charge an invoice
export const chargeInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId, amount } = req.body;

    // Update invoice status
    await pool.query(
      `UPDATE invoices 
       SET status = 'paid', 
           paid_at = NOW(), 
           payment_method = 'card',
           amount_paid = $2
       WHERE id = $1`,
      [invoiceId, amount]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error charging invoice:', error);
    res.status(500).json({ error: 'Failed to charge invoice' });
  }
};

// Get payment methods for a patient
export const getPaymentMethods = async (_req: Request, res: Response): Promise<void> => {
  try {
    // For now, return empty array
    res.json({ paymentMethods: [] });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
};

// Detach a payment method
export const detachPaymentMethod = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true });
  } catch (error) {
    console.error('Error detaching payment method:', error);
    res.status(500).json({ error: 'Failed to detach payment method' });
  }
};
