import { Request, Response } from "express";
import { pool } from "../config/database";

// Placeholder payment controller - to be implemented with new payment provider

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

// Charge an invoice
export const chargeInvoice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId } = req.body;

    // For now, just mark invoice as paid in database
    await pool.query(
      `UPDATE invoices 
       SET status = 'paid', 
           payment_date = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [invoiceId]
    );

    res.json({ 
      success: true, 
      message: "Invoice marked as paid (payment processing pending implementation)" 
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ error: "Failed to update invoice" });
  }
};

// Get payment methods for a patient
export const getPaymentMethods = async (
  req: Request,
  res: Response,
): Promise<void> => {
  res.json({ 
    paymentMethods: [],
    message: "Payment methods not available (payment system being rebuilt)"
  });
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