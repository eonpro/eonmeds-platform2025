import { Router, Request, Response } from 'express';
import { createInvoiceAndPay } from '../lib/billingService';
// Removed unused import: getStripeClient

const router = Router();

/**
 * Forward old invoice creation endpoint to new billing route
 * This ensures backward compatibility with existing frontend
 */
router.post('/create', async (req: Request, res: Response) => {
  console.info('[Invoice Forward] Forwarding legacy invoice create to new billing service');
  
  try {
    // Transform the request body to match new format
    const transformedBody = {
      patientId: req.body.patient_id,
      email: req.body.email,
      name: req.body.name,
      items: req.body.items?.map((item: any) => ({
        description: item.description || `${item.service_type || 'Service'}`,
        amount: Math.round((item.unit_price || 0) * 100), // Convert to cents
        currency: 'usd',
      })) || [{
        description: req.body.description || 'Invoice',
        amount: Math.round((req.body.total_amount || req.body.amount || 0) * 100), // Convert to cents
        currency: 'usd',
      }],
      email_invoice: req.body.email_invoice || false,
    };

    console.info('[Invoice Forward] Transformed body:', JSON.stringify(transformedBody));

    // Call the billing service directly
    const result = await createInvoiceAndPay(transformedBody);

    // Return success response
    res.json({
      ok: true,
      invoice: result.invoice,
      payment: result.payment,
    });
  } catch (error: any) {
    console.error('[Invoice Forward] Error:', error);
    
    // Check for specific error types
    if (error.message?.includes('no default payment method')) {
      return res.status(402).json({
        ok: false,
        error: error.message,
        need_payment_method: true,
        suggestion: 'Open billing portal or email invoice',
      });
    }
    
    // Default error response
    res.status(500).json({
      ok: false,
      error: 'Failed to create invoice',
    });
  }
});

export default router;
