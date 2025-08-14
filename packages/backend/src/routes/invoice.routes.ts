import { Router } from 'express';
import { 
  getPatientInvoices, 
  createInvoice, 
  updateInvoice,
  deleteInvoice, 
  chargeInvoice, 
  chargeInvoiceManual 
} from '../controllers/invoice.controller';
import { checkJwt } from '../middleware/auth0';

const router = Router();

// Apply Auth0 authentication to all invoice routes
router.use(checkJwt);

// Get all invoices for a patient
router.get("/patient/:patientId", getPatientInvoices);

// Create a new invoice
router.post("/create", createInvoice);

// Update an invoice
router.put("/:invoiceId", updateInvoice);

// Delete an invoice
router.delete("/:invoiceId", deleteInvoice);

// Charge an invoice
router.post("/:invoiceId/charge", chargeInvoice);

// Manually mark invoice as paid
router.post("/:invoiceId/charge-manual", chargeInvoiceManual);

export default router;
