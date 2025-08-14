import { Router } from 'express';
import { 
  getPatientInvoices, 
  createInvoice, 
  deleteInvoice, 
  chargeInvoice, 
  chargeInvoiceManual 
} from '../controllers/invoice.controller';

const router = Router();

// Get all invoices for a patient
router.get("/patient/:patientId", getPatientInvoices);

// Create a new invoice
router.post("/create", createInvoice);

// Delete an invoice
router.delete("/:invoiceId", deleteInvoice);

// Charge an invoice
router.post("/:invoiceId/charge", chargeInvoice);

// Manually mark invoice as paid
router.post("/:invoiceId/charge-manual", chargeInvoiceManual);

export default router;
