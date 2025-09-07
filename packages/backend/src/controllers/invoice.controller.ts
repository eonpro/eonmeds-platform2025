import { Request, Response } from "express";
import { pool } from "../config/database";
import { getStripeClient } from "../config/stripe.config";
import Stripe from "stripe";

// Get Stripe client
const stripe = getStripeClient();

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
        stripe_invoice_id,
        description,
        notes,
        created_at,
        updated_at,
        paid_at
      FROM invoices 
      WHERE patient_id = $1 AND voided_at IS NULL
      ORDER BY created_at DESC`,
      [patientId],
    );

    res.json({
      invoices: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching patient invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
};

// Get single invoice by ID
export const getInvoiceById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    const result = await pool.query(
      `SELECT 
        i.*,
        p.first_name,
        p.last_name,
        p.email,
        p.phone,
        p.stripe_customer_id as patient_stripe_id
      FROM invoices i
      JOIN patients p ON i.patient_id = p.patient_id
      WHERE i.id = $1 AND i.voided_at IS NULL`,
      [invoiceId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    // Get invoice items
    const itemsResult = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at`,
      [invoiceId]
    );

    const invoice = result.rows[0];
    invoice.items = itemsResult.rows;

    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
};

// Create a new invoice
export const createInvoice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const client = await pool.connect();
  
  try {
    const { 
      patient_id, 
      amount, 
      description, 
      due_date, 
      items = [],
      send_invoice = false 
    } = req.body;
    
    // Validate required fields
    if (!patient_id) {
      res.status(400).json({ error: "Patient ID is required" });
      return;
    }
    
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Valid invoice amount is required" });
      return;
    }
    
    if (!due_date) {
      res.status(400).json({ error: "Due date is required" });
      return;
    }

    await client.query('BEGIN');

    // Get patient details
    const patientResult = await client.query(
      `SELECT patient_id, email, stripe_customer_id, first_name, last_name 
       FROM patients WHERE patient_id = $1`,
      [patient_id]
    );

    if (patientResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: "Patient not found" });
      return;
    }

    const patient = patientResult.rows[0];

    // Create or get Stripe customer
    let stripeCustomerId = patient.stripe_customer_id;
    
    if (!stripeCustomerId && stripe) {
      try {
        const stripeCustomer = await stripe.customers.create({
          email: patient.email,
          name: `${patient.first_name} ${patient.last_name}`,
          metadata: {
            patient_id: patient.patient_id
          }
        });
        
        stripeCustomerId = stripeCustomer.id;
        
        // Update patient with Stripe customer ID
        await client.query(
          `UPDATE patients SET stripe_customer_id = $1 WHERE patient_id = $2`,
          [stripeCustomerId, patient_id]
        );
      } catch (stripeError) {
        console.error("Error creating Stripe customer:", stripeError);
        // Continue without Stripe - invoice will be created without Stripe integration
      }
    }

    // Create the invoice in database
    const invoiceResult = await client.query(
      `INSERT INTO invoices (
        invoice_number,
        patient_id,
        stripe_customer_id,
        due_date,
        status,
        subtotal,
        total_amount,
        description,
        currency
      ) VALUES (
        generate_invoice_number(),
        $1,
        $2,
        $3,
        'draft',
        $4,
        $4,
        $5,
        'USD'
      ) RETURNING *`,
      [
        patient_id,
        stripeCustomerId,
        due_date,
        amount,
        description || `Invoice for ${patient.first_name} ${patient.last_name}`
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Add invoice items if provided
    if (items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id,
            description,
            quantity,
            unit_price,
            service_type
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            invoice.id,
            item.description,
            item.quantity || 1,
            item.unit_price || amount,
            item.service_type
          ]
        );
      }
    } else {
      // Create default item if none provided
      await client.query(
        `INSERT INTO invoice_items (
          invoice_id,
          description,
          quantity,
          unit_price
        ) VALUES ($1, $2, 1, $3)`,
        [invoice.id, description || 'Medical Services', amount]
      );
    }

    // Create Stripe invoice if customer exists
    if (stripeCustomerId && stripe && send_invoice) {
      try {
        // Create invoice items in Stripe
        const stripeInvoiceItem = await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          description: description || 'Medical Services',
        });

        // Create the invoice
        const stripeInvoice = await stripe.invoices.create({
          customer: stripeCustomerId,
          collection_method: 'send_invoice',
          days_until_due: 30,
          metadata: {
            invoice_id: invoice.id,
            patient_id: patient_id
          }
        });

        // Finalize the invoice
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

        // Update database with Stripe invoice ID
        await client.query(
          `UPDATE invoices 
           SET stripe_invoice_id = $1, status = 'open' 
           WHERE id = $2`,
          [finalizedInvoice.id, invoice.id]
        );

        invoice.stripe_invoice_id = finalizedInvoice.id;
        invoice.status = 'open';

        // Send the invoice
        if (send_invoice) {
          await stripe.invoices.sendInvoice(finalizedInvoice.id);
        }
      } catch (stripeError) {
        console.error("Error creating Stripe invoice:", stripeError);
        // Continue - invoice exists in database even if Stripe fails
      }
    } else {
      // Update status to open for non-Stripe invoices
      await client.query(
        `UPDATE invoices SET status = 'open' WHERE id = $1`,
        [invoice.id]
      );
      invoice.status = 'open';
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      invoice,
      message: "Invoice created successfully"
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error creating invoice:", error);
    res.status(500).json({ 
      error: "Failed to create invoice",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// Update an invoice
export const updateInvoice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    // Allowed fields to update
    const allowedFields = [
      'due_date', 'description', 'notes', 'status',
      'subtotal', 'tax_amount', 'discount_amount', 'total_amount'
    ];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }
    
    values.push(invoiceId);
    
    const result = await pool.query(
      `UPDATE invoices 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount} AND voided_at IS NULL
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    
    res.json({
      success: true,
      invoice: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ error: "Failed to update invoice" });
  }
};

// Delete (void) an invoice
export const deleteInvoice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    
    // Check if invoice exists and is not paid
    const checkResult = await pool.query(
      `SELECT status, stripe_invoice_id FROM invoices 
       WHERE id = $1 AND voided_at IS NULL`,
      [invoiceId]
    );
    
    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    
    const invoice = checkResult.rows[0];
    
    if (invoice.status === 'paid') {
      res.status(400).json({ error: "Cannot delete paid invoices" });
      return;
    }
    
    // Void in Stripe if exists
    if (invoice.stripe_invoice_id && stripe) {
      try {
        await stripe.invoices.voidInvoice(invoice.stripe_invoice_id);
      } catch (stripeError) {
        console.error("Error voiding Stripe invoice:", stripeError);
      }
    }
    
    // Soft delete in database
    await pool.query(
      `UPDATE invoices 
       SET voided_at = NOW(), status = 'voided' 
       WHERE id = $1`,
      [invoiceId]
    );
    
    res.json({
      success: true,
      message: "Invoice voided successfully"
    });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
};

// Charge an invoice using Stripe
export const chargeInvoice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { payment_method_id } = req.body;
    
    if (!payment_method_id) {
      res.status(400).json({ error: "Payment method ID is required" });
      return;
    }
    
    // Get invoice details
    const invoiceResult = await pool.query(
      `SELECT i.*, p.stripe_customer_id 
       FROM invoices i
       JOIN patients p ON i.patient_id = p.patient_id
       WHERE i.id = $1 AND i.voided_at IS NULL`,
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
      res.status(400).json({ error: "No Stripe customer associated with this patient" });
      return;
    }
    
    if (!stripe) {
      res.status(500).json({ error: "Stripe is not configured" });
      return;
    }
    
    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: invoice.stripe_customer_id,
    });
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.amount_due * 100), // Convert to cents
      currency: 'usd',
      customer: invoice.stripe_customer_id,
      payment_method: payment_method_id,
      confirm: true,
      metadata: {
        invoice_id: invoice.id,
        patient_id: invoice.patient_id
      }
    });
    
    if (paymentIntent.status === 'succeeded') {
      // Update invoice as paid
      await pool.query(
        `UPDATE invoices 
         SET status = 'paid', 
             amount_paid = total_amount,
             payment_date = NOW(),
             paid_at = NOW(),
             stripe_payment_intent_id = $1
         WHERE id = $2`,
        [paymentIntent.id, invoiceId]
      );
      
      // Record payment
      await pool.query(
        `INSERT INTO invoice_payments 
         (invoice_id, amount, payment_method, stripe_payment_intent_id, status)
         VALUES ($1, $2, 'card', $3, 'succeeded')`,
        [invoiceId, invoice.amount_due, paymentIntent.id]
      );
      
      res.json({
        success: true,
        message: "Payment successful",
        payment_intent_id: paymentIntent.id
      });
    } else {
      res.status(400).json({
        error: "Payment failed",
        status: paymentIntent.status
      });
    }
  } catch (error) {
    console.error("Error charging invoice:", error);
    res.status(500).json({ 
      error: "Failed to process payment",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Manually mark invoice as paid
export const chargeInvoiceManual = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { payment_method = 'cash', payment_date = new Date(), notes } = req.body;
    
    // Check invoice exists and is not already paid
    const checkResult = await pool.query(
      `SELECT * FROM invoices 
       WHERE id = $1 AND voided_at IS NULL`,
      [invoiceId]
    );
    
    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    
    const invoice = checkResult.rows[0];
    
    if (invoice.status === 'paid') {
      res.status(400).json({ error: "Invoice is already paid" });
      return;
    }
    
    // Update invoice as paid
    await pool.query(
      `UPDATE invoices 
       SET status = 'paid', 
           amount_paid = total_amount,
           payment_method = $1,
           payment_date = $2,
           paid_at = $2,
           notes = COALESCE(notes, '') || $3
       WHERE id = $4`,
      [payment_method, payment_date, notes ? `\nManual payment: ${notes}` : '', invoiceId]
    );
    
    // Record payment
    await pool.query(
      `INSERT INTO invoice_payments 
       (invoice_id, amount, payment_method, payment_date, status, metadata)
       VALUES ($1, $2, $3, $4, 'succeeded', $5)`,
      [invoiceId, invoice.amount_due, payment_method, payment_date, { manual: true, notes }]
    );
    
    res.json({
      success: true,
      message: "Invoice marked as paid manually"
    });
  } catch (error) {
    console.error("Error marking invoice as paid:", error);
    res.status(500).json({ error: "Failed to mark invoice as paid" });
  }
};
