import { Request, Response } from "express";
import { pool } from "../config/database";

// Get all invoices for a patient
export const getPatientInvoices = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { patientId } = req.params;

    const result = await pool.query(
      `SELECT 
        id,
        invoice_number,
        patient_id,
        invoice_date,
        due_date,
        status,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        amount_paid,
        amount_due,
        currency,
        payment_method,
        payment_date,
        stripe_payment_intent_id,
        description,
        notes,
        created_at,
        updated_at,
        paid_at
      FROM invoices 
      WHERE patient_id = $1 
      ORDER BY created_at DESC`,
      [patientId],
    );

    // Transform the data to match frontend expectations
    const invoices = result.rows.map((invoice) => ({
      ...invoice,
      amount: invoice.total_amount, // Frontend expects 'amount'
      date: invoice.invoice_date,
    }));

    res.json({
      invoices,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching patient invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
};

// Create a new invoice
export const createInvoice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    console.log("Invoice creation request body:", req.body);
    
    const { patient_id, amount, total_amount, description, due_date, status = "draft", items = [] } = req.body;
    
    // Support both 'amount' and 'total_amount' for backwards compatibility
    const invoiceAmount = amount || total_amount;
    
    console.log("Creating invoice with data:", { patient_id, amount, total_amount, invoiceAmount });
    
    // Validate required fields
    if (!patient_id) {
      res.status(400).json({ error: "Patient ID is required" });
      return;
    }
    
    if (invoiceAmount === null || invoiceAmount === undefined || invoiceAmount <= 0) {
      res.status(400).json({ error: "Valid invoice amount is required. Received: " + invoiceAmount });
      return;
    }
    
    if (!due_date) {
      res.status(400).json({ error: "Due date is required" });
      return;
    }

    // Create the invoice
    const result = await pool.query(
      `INSERT INTO invoices (
        invoice_number,
        patient_id,
        subtotal,
        total_amount,
        description, 
        due_date, 
        status, 
        invoice_date,
        created_at, 
        updated_at
      )
       VALUES (generate_invoice_number(), $1, $2, $2, $3, $4, $5, CURRENT_DATE, NOW(), NOW())
       RETURNING *`,
      [patient_id, invoiceAmount, description, due_date, status],
    );

    const invoice = result.rows[0];

    // Add line items if provided
    if (items.length > 0) {
      for (const item of items) {
        await pool.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, service_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            invoice.id,
            item.description,
            item.quantity || 1,
            item.unit_price,
            item.service_type,
          ],
        );
      }
    }

    res.json({
      success: true,
      invoice,
      message: "Invoice created successfully"
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ 
      error: "Failed to create invoice",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Delete an invoice
export const deleteInvoice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    const result = await pool.query(
      "DELETE FROM invoices WHERE id = $1 RETURNING *",
      [invoiceId],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    res.json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
};

// Charge an invoice
export const chargeInvoice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { payment_method_id, amount } = req.body;

    // Update invoice status to paid
    const result = await pool.query(
      `UPDATE invoices 
       SET status = 'paid', 
           paid_at = NOW(), 
           updated_at = NOW(),
           payment_method = $2,
           amount_paid = $3
       WHERE id = $1
       RETURNING *`,
      [invoiceId, payment_method_id, amount],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    res.json({
      success: true,
      invoice: result.rows[0],
    });
  } catch (error) {
    console.error("Error charging invoice:", error);
    res.status(500).json({ error: "Failed to charge invoice" });
  }
};

// Manual charge (mark as paid)
export const chargeInvoiceManual = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { amount, notes } = req.body;

    const result = await pool.query(
      `UPDATE invoices 
       SET status = 'paid', 
           paid_at = NOW(), 
           updated_at = NOW(),
           payment_method = 'manual',
           amount_paid = $2,
           notes = COALESCE(notes, '') || ' ' || $3
       WHERE id = $1
       RETURNING *`,
      [invoiceId, amount, notes || "Manual payment"],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    res.json({
      success: true,
      invoice: result.rows[0],
    });
  } catch (error) {
    console.error("Error manually charging invoice:", error);
    res.status(500).json({ error: "Failed to charge invoice" });
  }
};
