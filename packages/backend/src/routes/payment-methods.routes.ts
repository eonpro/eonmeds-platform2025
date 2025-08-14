import { Router, Request, Response } from "express";
import { stripeService } from "../services/stripe.service";
import { pool } from "../config/database";

const router = Router();

/**
 * POST /api/v1/payment-methods/setup-intent
 * Create a setup intent for adding a new payment method
 */
router.post("/setup-intent", async (req: Request, res: Response) => {
  try {
    const { patient_id } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    // Get patient's Stripe customer ID
    const patientResult = await pool.query(
      "SELECT stripe_customer_id FROM patients WHERE patient_id = $1",
      [patient_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const { stripe_customer_id } = patientResult.rows[0];

    if (!stripe_customer_id) {
      return res.status(400).json({ 
        error: "Patient does not have a Stripe customer ID",
        message: "Please contact support to set up payment processing"
      });
    }

    // Create setup intent
    const setupIntent = await stripeService.createSetupIntent(stripe_customer_id);

    res.json({
      success: true,
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
    });
  } catch (error: any) {
    console.error("Error creating setup intent:", error);
    res.status(500).json({ 
      error: "Failed to create setup intent",
      message: error.message 
    });
  }
});

/**
 * GET /api/v1/payment-methods/patient/:patientId
 * List all payment methods for a patient
 */
router.get("/patient/:patientId", async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Get patient's Stripe customer ID
    const patientResult = await pool.query(
      "SELECT stripe_customer_id, first_name, last_name FROM patients WHERE patient_id = $1",
      [patientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const patient = patientResult.rows[0];

    if (!patient.stripe_customer_id) {
      return res.json({ 
        payment_methods: [],
        message: "No payment methods on file"
      });
    }

    // Get payment methods from Stripe
    const paymentMethods = await stripeService.listPaymentMethods(patient.stripe_customer_id);

    // Get default payment method
    const customer = await stripeService.getCustomer(patient.stripe_customer_id);
    const defaultPaymentMethodId = customer?.invoice_settings?.default_payment_method;

    // Format response
    const formattedMethods = paymentMethods.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
      is_default: pm.id === defaultPaymentMethodId,
      created: new Date(pm.created * 1000).toISOString(),
    }));

    res.json({
      payment_methods: formattedMethods,
      patient: {
        id: patientId,
        name: `${patient.first_name} ${patient.last_name}`,
      },
    });
  } catch (error: any) {
    console.error("Error listing payment methods:", error);
    res.status(500).json({ 
      error: "Failed to list payment methods",
      message: error.message 
    });
  }
});

/**
 * POST /api/v1/payment-methods/attach
 * Attach a payment method to a patient (after setup intent success)
 */
router.post("/attach", async (req: Request, res: Response) => {
  try {
    const { payment_method_id, patient_id, set_as_default } = req.body;

    if (!payment_method_id || !patient_id) {
      return res.status(400).json({ 
        error: "Payment method ID and patient ID are required" 
      });
    }

    // Get patient's Stripe customer ID
    const patientResult = await pool.query(
      "SELECT stripe_customer_id FROM patients WHERE patient_id = $1",
      [patient_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const { stripe_customer_id } = patientResult.rows[0];

    if (!stripe_customer_id) {
      return res.status(400).json({ 
        error: "Patient does not have a Stripe customer ID" 
      });
    }

    // Attach payment method
    const paymentMethod = await stripeService.attachPaymentMethod(
      payment_method_id,
      stripe_customer_id
    );

    // Set as default if requested
    if (set_as_default) {
      await stripeService.setDefaultPaymentMethod(stripe_customer_id, payment_method_id);
    }

    res.json({
      success: true,
      payment_method: {
        id: paymentMethod.id,
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
        exp_month: paymentMethod.card?.exp_month,
        exp_year: paymentMethod.card?.exp_year,
        is_default: set_as_default || false,
      },
    });
  } catch (error: any) {
    console.error("Error attaching payment method:", error);
    res.status(500).json({ 
      error: "Failed to attach payment method",
      message: error.message 
    });
  }
});

/**
 * DELETE /api/v1/payment-methods/:paymentMethodId
 * Remove a payment method
 */
router.delete("/:paymentMethodId", async (req: Request, res: Response) => {
  try {
    const { paymentMethodId } = req.params;

    await stripeService.detachPaymentMethod(paymentMethodId);

    res.json({
      success: true,
      message: "Payment method removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing payment method:", error);
    res.status(500).json({ 
      error: "Failed to remove payment method",
      message: error.message 
    });
  }
});

/**
 * PUT /api/v1/payment-methods/:paymentMethodId/default
 * Set a payment method as default
 */
router.put("/:paymentMethodId/default", async (req: Request, res: Response) => {
  try {
    const { paymentMethodId } = req.params;
    const { patient_id } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    // Get patient's Stripe customer ID
    const patientResult = await pool.query(
      "SELECT stripe_customer_id FROM patients WHERE patient_id = $1",
      [patient_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const { stripe_customer_id } = patientResult.rows[0];

    if (!stripe_customer_id) {
      return res.status(400).json({ 
        error: "Patient does not have a Stripe customer ID" 
      });
    }

    // Set as default
    await stripeService.setDefaultPaymentMethod(stripe_customer_id, paymentMethodId);

    res.json({
      success: true,
      message: "Default payment method updated",
    });
  } catch (error: any) {
    console.error("Error setting default payment method:", error);
    res.status(500).json({ 
      error: "Failed to set default payment method",
      message: error.message 
    });
  }
});

export default router;
