import { Router } from 'express';
import { 
  createInvoicePaymentIntent,
  processInvoicePayment,
  getInvoicePayments,
  processManualPayment,
  refundPayment
} from '../controllers/invoice-payment.controller';
import { checkJwt } from '../middleware/auth0';
import { paymentRateLimiter, strictRateLimiter } from '../middleware/rate-limit';

const router = Router();

// Apply Auth0 authentication to all payment routes
router.use(checkJwt);

// Create payment intent for an invoice (rate limited)
router.post("/invoice/:invoiceId/payment-intent", paymentRateLimiter, createInvoicePaymentIntent);

// Process payment for an invoice (rate limited)
router.post("/invoice/:invoiceId/payment", paymentRateLimiter, processInvoicePayment);

// Get payment history for an invoice
router.get("/invoice/:invoiceId/payments", getInvoicePayments);

// Process manual payment (rate limited)
router.post("/invoice/:invoiceId/manual-payment", paymentRateLimiter, processManualPayment);

// Refund a payment (strictly rate limited)
router.post("/payment/:paymentId/refund", strictRateLimiter, refundPayment);

export default router;
