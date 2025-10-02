import { Request, Response } from "express";
import { pool } from "../config/database";
import { stripeService } from "../services/stripe.service";
import { auditService, AuditAction, AuditSeverity } from "../services/audit.service";
import Stripe from "stripe";

interface ProcessPaymentRequest {
  invoiceId: string;
  payment_method_id?: string;
  amount: number;
  save_payment_method?: boolean;
}

// Create payment intent for invoice
export const createInvoicePaymentIntent = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { invoiceId } = req.params;
  
  try {
    const { save_payment_method } = req.body;

    // Get invoice details
    const invoiceResult = await pool.query(
      `SELECT i.*, p.stripe_customer_id, p.email, p.first_name, p.last_name
       FROM invoices i
       JOIN patients p ON i.patient_id = p.patient_id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const invoice = invoiceResult.rows[0];

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      res.status(400).json({ error: "Invoice is already paid" });
      return;
    }

    // Ensure patient has a Stripe customer ID
    let stripeCustomerId = invoice.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripeService.createCustomer({
        patientId: invoice.patient_id,
        email: invoice.email,
        name: `${invoice.first_name} ${invoice.last_name}`,
        phone: invoice.phone
      });
      
      await pool.query(
        "UPDATE patients SET stripe_customer_id = $1 WHERE patient_id = $2",
        [customer.id, invoice.patient_id]
      );
      
      stripeCustomerId = customer.id;
    }

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: Math.round(invoice.total_amount * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        invoice_id: invoiceId,
        patient_id: invoice.patient_id,
        invoice_number: invoice.invoice_number
      },
      setup_future_usage: save_payment_method ? 'off_session' : undefined,
      description: `Invoice ${invoice.invoice_number} payment`
    });

    // Audit log the payment intent creation
    await auditService.logPayment(
      AuditAction.PAYMENT_INTENT_CREATED,
      paymentIntent.id,
      invoice.total_amount,
      'usd',
      {
        invoice_id: invoiceId,
        patient_id: invoice.patient_id,
        save_payment_method: save_payment_method
      }
    );

    res.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: invoice.total_amount
    });
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    
    // Audit log the error
    await auditService.logError(
      AuditAction.PAYMENT_INTENT_FAILED,
      error,
      { invoice_id: invoiceId, request: req.body }
    );
    
    res.status(500).json({ error: "Failed to create payment intent" });
  }
};

// Process invoice payment
export const processInvoicePayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { payment_intent_id, payment_method_id } = req.body;

    // Get invoice details
    const invoiceResult = await pool.query(
      "SELECT * FROM invoices WHERE id = $1",
      [invoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const invoice = invoiceResult.rows[0];

    // Record payment in database
    const paymentResult = await pool.query(
      `INSERT INTO invoice_payments 
       (invoice_id, amount, payment_method, stripe_payment_intent_id, payment_date)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [invoiceId, invoice.total_amount, 'stripe', payment_intent_id]
    );

    // Update invoice status
    const updateResult = await pool.query(
      `UPDATE invoices 
       SET status = 'paid', 
           paid_at = NOW(), 
           updated_at = NOW(),
           stripe_payment_intent_id = $2
       WHERE id = $1
       RETURNING *`,
      [invoiceId, payment_intent_id]
    );

    res.json({
      success: true,
      invoice: updateResult.rows[0],
      payment: paymentResult.rows[0]
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Failed to process payment" });
  }
};

// Get payment history for an invoice
export const getInvoicePayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    const result = await pool.query(
      `SELECT * FROM invoice_payments 
       WHERE invoice_id = $1 
       ORDER BY payment_date DESC`,
      [invoiceId]
    );

    res.json({
      success: true,
      payments: result.rows
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
};

// Process manual payment
export const processManualPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { amount, payment_method, reference_number, notes } = req.body;

    // Get invoice details
    const invoiceResult = await pool.query(
      "SELECT * FROM invoices WHERE id = $1",
      [invoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const invoice = invoiceResult.rows[0];

    // Record manual payment
    const paymentResult = await pool.query(
      `INSERT INTO invoice_payments 
       (invoice_id, amount, payment_method, reference_number, notes, payment_date)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [invoiceId, amount, payment_method || 'cash', reference_number, notes]
    );

    // Calculate total paid
    const totalPaidResult = await pool.query(
      `SELECT SUM(amount) as total_paid 
       FROM invoice_payments 
       WHERE invoice_id = $1`,
      [invoiceId]
    );

    const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid || 0);
    const invoiceTotal = parseFloat(invoice.total_amount);

    // Determine new status
    let newStatus = 'pending';
    if (totalPaid >= invoiceTotal) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    }

    // Update invoice status
    const updateResult = await pool.query(
      `UPDATE invoices 
       SET status = $2, 
           paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE paid_at END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [invoiceId, newStatus]
    );

    res.json({
      success: true,
      invoice: updateResult.rows[0],
      payment: paymentResult.rows[0],
      total_paid: totalPaid,
      remaining_balance: invoiceTotal - totalPaid
    });
  } catch (error) {
    console.error("Error processing manual payment:", error);
    res.status(500).json({ error: "Failed to process manual payment" });
  }
};

// Refund payment
export const refundPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    // Get payment details
    const paymentResult = await pool.query(
      `SELECT p.*, i.patient_id 
       FROM invoice_payments p
       JOIN invoices i ON p.invoice_id = i.id
       WHERE p.id = $1`,
      [paymentId]
    );

    if (paymentResult.rowCount === 0) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const payment = paymentResult.rows[0];

    // Process refund through Stripe if it was a Stripe payment
    let refundId = null;
    if (payment.stripe_payment_intent_id) {
      const refund = await stripeService.createRefund({
        payment_intent: payment.stripe_payment_intent_id,
        amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
        reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer'
      });
      refundId = refund.id;
    }

    // Record refund in database
    const refundResult = await pool.query(
      `INSERT INTO invoice_payments 
       (invoice_id, amount, payment_method, stripe_refund_id, notes, payment_date, is_refund)
       VALUES ($1, $2, $3, $4, $5, NOW(), true)
       RETURNING *`,
      [payment.invoice_id, -(amount || payment.amount), payment.payment_method, refundId, reason]
    );

    // Update invoice status if needed
    const totalPaidResult = await pool.query(
      `SELECT SUM(amount) as total_paid 
       FROM invoice_payments 
       WHERE invoice_id = $1`,
      [payment.invoice_id]
    );

    const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid || 0);
    
    // Get invoice total
    const invoiceResult = await pool.query(
      "SELECT total_amount FROM invoices WHERE id = $1",
      [payment.invoice_id]
    );
    
    const invoiceTotal = parseFloat(invoiceResult.rows[0].total_amount);

    // Determine new status
    let newStatus = 'pending';
    if (totalPaid >= invoiceTotal) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    }

    await pool.query(
      `UPDATE invoices 
       SET status = $2, 
           updated_at = NOW()
       WHERE id = $1`,
      [payment.invoice_id, newStatus]
    );

    res.json({
      success: true,
      refund: refundResult.rows[0],
      stripe_refund_id: refundId
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ error: "Failed to process refund" });
  }
};
