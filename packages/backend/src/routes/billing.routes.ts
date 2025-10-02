import { Router } from 'express';
import {
  createSetupIntent,
  attachPaymentMethod,
  createInvoice,
  payInvoice,
  deleteInvoice,
  listPaymentMethods,
  getStripeDiagnostics
} from '../controllers/billing.controller';
import { checkJwt } from '../middleware/auth0';
import { paymentRateLimiter } from '../middleware/rate-limit';

const router = Router();

// Apply auth to all billing routes
router.use(checkJwt);

// Diagnostics route (for testing/debugging)
router.get('/diagnostics/stripe', getStripeDiagnostics);

// Payment method routes
router.post('/payment-methods/setup-intent', paymentRateLimiter, createSetupIntent);
router.post('/payment-methods/attach', paymentRateLimiter, attachPaymentMethod);
router.get('/payment-methods/list', listPaymentMethods);

// Invoice routes
router.post('/invoices/create', paymentRateLimiter, createInvoice);
router.post('/invoices/pay', paymentRateLimiter, payInvoice);
router.delete('/invoices/:id', deleteInvoice);

export default router;
