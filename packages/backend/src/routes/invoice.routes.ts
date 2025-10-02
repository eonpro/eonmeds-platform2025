/**
 * Invoice API Routes
 * RESTful endpoints for invoice management
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { authMiddleware } from '../middleware/auth.middleware';
import { body, param, query, validationResult } from 'express-validator';
import { InvoiceModule } from '../modules/invoicing';

const router = Router();
let invoiceModule: InvoiceModule;

// Initialize invoice module
export function initializeInvoiceRoutes(database: Pool, stripe?: any): Router {
  invoiceModule = new InvoiceModule({
    database,
    stripe,
    emailConfig: {
      from: process.env.EMAIL_FROM || 'billing@eonmeds.com'
    },
    defaultTerms: 'net_30',
    currency: 'USD'
  });
  return router;
}

// Validation middleware
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Create invoice
router.post('/invoices',
  authMiddleware,
  [
    body('customerId').notEmpty(),
    body('lineItems').isArray({ min: 1 }),
    body('lineItems.*.description').notEmpty(),
    body('lineItems.*.quantity').isFloat({ min: 0.001 }),
    body('lineItems.*.unitPrice').isFloat({ min: 0 })
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const dueDate = req.body.dueDate 
        ? new Date(req.body.dueDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await invoiceModule.createInvoice({
        tenantId,
        customerId: req.body.customerId,
        dueDate,
        lineItems: req.body.lineItems,
        notes: req.body.notes
      });

      res.status(201).json({ success: true, invoice });
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice', message: error.message });
    }
  }
);

// Get invoice by ID
router.get('/invoices/:id',
  authMiddleware,
  [param('id').isUUID()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const invoice = await invoiceModule.getInvoice(req.params.id);
      res.json({ success: true, invoice });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: 'Invoice not found' });
      } else {
        res.status(500).json({ error: 'Failed to fetch invoice' });
      }
    }
  }
);

// List invoices
router.get('/invoices',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const filter = {
        tenantId,
        customerId: req.query.customerId as string,
        status: req.query.status as any,
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0
      };

      const result = await invoiceModule.invoiceService.search(filter);
      res.json({
        success: true,
        invoices: result.invoices,
        total: result.total
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to list invoices' });
    }
  }
);

// Apply payment
router.post('/invoices/:id/payments',
  authMiddleware,
  [
    param('id').isUUID(),
    body('amount').isFloat({ min: 0.01 }),
    body('method').notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      await invoiceModule.applyPayment(req.params.id, {
        amount: req.body.amount,
        method: req.body.method,
        reference: req.body.reference,
        date: new Date()
      });
      
      const invoice = await invoiceModule.getInvoice(req.params.id);
      res.json({
        success: true,
        invoice,
        message: invoice.amountDue <= 0 ? 'Invoice paid in full' : 'Payment applied'
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to apply payment' });
    }
  }
);

// Generate payment link
router.post('/invoices/:id/payment-link',
  authMiddleware,
  [param('id').isUUID()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const paymentLink = await invoiceModule.generatePaymentLink(req.params.id);
      
      res.json({
        success: true,
        paymentLink: paymentLink.url,
        token: paymentLink.token,
        expiresAt: paymentLink.expiresAt
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to generate payment link' });
    }
  }
);

// Create Stripe Checkout session
router.post('/invoices/:id/create-checkout',
  authMiddleware,
  [param('id').isUUID()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const session = await invoiceModule.createCheckoutSession(req.params.id);
      
      res.json({
        success: true,
        sessionId: session.sessionId,
        checkoutUrl: session.url
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
);

// Send invoice
router.post('/invoices/:id/send',
  authMiddleware,
  [param('id').isUUID()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      await invoiceModule.sendInvoice(req.params.id, req.body.recipients);
      res.json({ success: true, message: 'Invoice sent successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to send invoice' });
    }
  }
);

// Get PDF
router.get('/invoices/:id/pdf',
  authMiddleware,
  [param('id').isUUID()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const invoice = await invoiceModule.getInvoice(req.params.id);
      const pdf = await invoiceModule.generatePDF(req.params.id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.number}.pdf"`);
      res.send(pdf);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
);

export default router;