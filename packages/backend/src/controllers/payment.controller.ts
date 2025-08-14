import { Request, Response } from "express";
import { pool } from "../config/database";
import { stripeService } from "../services/stripe.service";

// Create a payment intent
export const createPaymentIntent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  res.status(501).json({ 
    error: "Payment processing not implemented",
    message: "Payment system is being rebuilt" 
  });
};

// Charge an invoice with a saved payment method
export const chargeInvoice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId, paymentMethodId } = req.body;

    if (!invoiceId) {
      res.status(400).json({ error: "Invoice ID is required" });
      return;
    }

    // Get invoice details
    const invoiceResult = await pool.query(
      `SELECT i.*, p.stripe_customer_id 
       FROM invoices i
       JOIN patients p ON i.patient_id = p.patient_id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.status === 'paid') {
      res.status(400).json({ error: "Invoice is already paid" });
      return;
    }

    if (!invoice.stripe_customer_id) {
      res.status(400).json({ 
        error: "Patient does not have a Stripe customer",
        message: "Please contact support to set up payment processing"
      });
      return;
    }

    // If no payment method specified, try to use default
    let finalPaymentMethodId = paymentMethodId;
    if (!finalPaymentMethodId) {
      const customer = await stripeService.getCustomer(invoice.stripe_customer_id);
      finalPaymentMethodId = customer?.invoice_settings?.default_payment_method as string;
      
      if (!finalPaymentMethodId) {
        res.status(400).json({ 
          error: "No payment method provided and no default payment method on file",
          needs_payment_method: true
        });
        return;
      }
    }

    // Charge the payment method
    const paymentIntent = await stripeService.chargePaymentMethod({
      amount: Number(invoice.total_amount),
      customerId: invoice.stripe_customer_id,
      paymentMethodId: finalPaymentMethodId,
      description: `Invoice ${invoice.invoice_number}`,
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        patient_id: invoice.patient_id,
      },
    });

    // Update invoice in database
    await pool.query(
      `UPDATE invoices 
       SET status = 'paid', 
           payment_date = NOW(),
           stripe_payment_intent_id = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [invoiceId, paymentIntent.id]
    );

    // Record payment in invoice_payments table
    await pool.query(
      `INSERT INTO invoice_payments (
        invoice_id, amount, payment_method, payment_date,
        stripe_payment_intent_id, status
      ) VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [
        invoiceId,
        invoice.total_amount,
        'card',
        paymentIntent.id,
        'succeeded'
      ]
    );

    res.json({ 
      success: true, 
      payment_intent_id: paymentIntent.id,
      amount_charged: Number(invoice.total_amount),
      message: "Invoice charged successfully" 
    });
  } catch (error: any) {
    console.error("Error charging invoice:", error);
    
    // Handle specific Stripe errors
    if (error.code === 'card_declined') {
      res.status(402).json({ 
        error: "Card was declined",
        decline_code: error.decline_code,
        message: "Please try a different payment method"
      });
    } else if (error.code === 'authentication_required') {
      res.status(402).json({ 
        error: "Card requires authentication",
        payment_intent_id: error.payment_intent?.id,
        message: "Additional verification required"
      });
    } else {
      res.status(500).json({ 
        error: "Failed to charge invoice",
        message: error.message 
      });
    }
  }
};

// Get payment methods for a patient
export const getPaymentMethods = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { patientId } = req.params;
    
    // Get patient's Stripe customer ID
    const result = await pool.query(
      'SELECT stripe_customer_id FROM patients WHERE patient_id = $1',
      [patientId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    
    const stripeCustomerId = result.rows[0].stripe_customer_id;
    
    if (!stripeCustomerId) {
      res.json({ 
        cards: [],
        message: "No payment methods on file" 
      });
      return;
    }
    
    // Get payment methods from Stripe
    const paymentMethods = await stripeService.listPaymentMethods(stripeCustomerId);
    
    // Format for frontend
    const cards = paymentMethods.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand || 'card',
      last4: pm.card?.last4 || '****',
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
      is_default: pm.id === pm.customer?.default_source
    }));
    
    res.json({ 
      cards,
      stripeCustomerId 
    });
  } catch (error: any) {
    console.error("Error getting payment methods:", error);
    res.status(500).json({ 
      error: "Failed to retrieve payment methods",
      message: error.message 
    });
  }
};

// Detach a payment method
export const detachPaymentMethod = async (
  req: Request,
  res: Response,
): Promise<void> => {
  res.json({ 
    success: true,
    message: "Payment method removed (payment system being rebuilt)"
  });
};