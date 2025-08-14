import { Router } from "express";
import {
  createPaymentIntent,
  chargeInvoice,
  getPaymentMethods,
  detachPaymentMethod,
} from "../controllers/payment.controller";

const router = Router();

// Payment routes (these use JSON body parser)
router.post("/charge-invoice", chargeInvoice);
router.post("/create-payment-intent", createPaymentIntent);
router.get("/patients/:patientId/cards", getPaymentMethods);
router.delete("/payment-methods/:paymentMethodId", detachPaymentMethod);

export default router;