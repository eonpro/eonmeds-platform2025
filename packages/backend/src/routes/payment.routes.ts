import { Router } from "express";
import {
  createPaymentIntent,
  chargeInvoice,
  getPaymentMethods,
  detachPaymentMethod,
} from "../controllers/payment.controller";
import { checkJwt } from "../middleware/auth0";

const router = Router();

// Apply Auth0 authentication to all payment routes
router.use(checkJwt);

// Payment routes (these use JSON body parser)
router.post("/charge-invoice", chargeInvoice);
router.post("/create-payment-intent", createPaymentIntent);
router.get("/patients/:patientId/cards", getPaymentMethods);
router.delete("/payment-methods/:paymentMethodId", detachPaymentMethod);

export default router;