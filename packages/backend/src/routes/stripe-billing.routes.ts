import { Router } from "express";
import { ENV } from "../config/env";
import { StripeBillingService } from "../services/stripe-billing.service";

const r = Router();
const billing = new StripeBillingService();

function dollarsToCents(x: number) { return Math.round(x * 100); }

// ----- Customers & payment methods -----
r.post("/customers", async (req, res, next) => {
  try {
    const { email, name, patientId, metadata } = req.body;
    const customer = await billing.getOrCreateCustomer({ email, name, patientId, metadata });
    res.json(customer);
  } catch (e) { next(e); }
});

r.post("/setup-intent", async (req, res, next) => {
  try {
    const { customerId } = req.body;
    const si = await billing.createSetupIntent(customerId);
    res.json({ clientSecret: si.client_secret });
  } catch (e) { next(e); }
});

r.get("/payment-methods/:customerId", async (req, res, next) => {
  try {
    const list = await billing.listPaymentMethods(req.params.customerId);
    res.json(list);
  } catch (e) { next(e); }
});

r.delete("/payment-methods/:id", async (req, res, next) => {
  try {
    const pm = await billing.detachPaymentMethod(req.params.id);
    res.json(pm);
  } catch (e) { next(e); }
});

r.post("/default-payment-method", async (req, res, next) => {
  try {
    const { customerId, paymentMethodId } = req.body;
    const updated = await billing.updateDefaultPaymentMethod(customerId, paymentMethodId);
    res.json(updated);
  } catch (e) { next(e); }
});

// ----- One-off charge -----
r.post("/charge", async (req, res, next) => {
  try {
    const { customerId, amount, currency="usd", paymentMethodId, description, metadata } = req.body;
    const pi = await billing.createPaymentIntent({
      amountInCents: typeof amount === "number" ? dollarsToCents(amount) : amount,
      currency, customerId, paymentMethodId, description, metadata, offSession: true, confirm: true
    });
    res.json(pi);
  } catch (e) { next(e); }
});

r.post("/refund", async (req, res, next) => {
  try {
    const { paymentIntentId, chargeId, amount, reason } = req.body;
    const refund = await billing.refund({ paymentIntentId, chargeId, amountInCents: amount ? dollarsToCents(amount) : undefined, reason });
    res.json(refund);
  } catch (e) { next(e); }
});

// ----- Invoicing -----
r.post("/invoices/items", async (req, res, next) => {
  try {
    const { customerId, priceId, amount, currency="usd", description, metadata } = req.body;
    const ii = await billing.createInvoiceItem({
      customerId, priceId, amountInCents: amount ? dollarsToCents(amount) : undefined, currency, description, metadata
    });
    res.json(ii);
  } catch (e) { next(e); }
});

r.post("/invoices/finalize", async (req, res, next) => {
  try {
    const { customerId, collectionMethod="charge_automatically", daysUntilDue=0, metadata } = req.body;
    const invoice = await billing.createAndFinalizeInvoice({ customerId, collectionMethod, daysUntilDue, metadata });
    res.json(invoice);
  } catch (e) { next(e); }
});

r.post("/invoices/send", async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const sent = await billing.sendInvoice(invoiceId);
    res.json(sent);
  } catch (e) { next(e); }
});

r.post("/invoices/void", async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const out = await billing.voidInvoice(invoiceId);
    res.json(out);
  } catch (e) { next(e); }
});

// ----- Plans (subscriptions) -----
r.post("/subscriptions", async (req, res, next) => {
  try {
    const { customerId, priceId, trialEndUnix, billingCycleAnchorUnix, metadata } = req.body;
    const sub = await billing.createSubscription({ customerId, priceId, trialEndUnix, billingCycleAnchorUnix, metadata });
    res.json(sub);
  } catch (e) { next(e); }
});

r.post("/subscriptions/pause", async (req, res, next) => {
  try {
    const { subscriptionId } = req.body;
    const sub = await billing.pauseSubscription(subscriptionId);
    res.json(sub);
  } catch (e) { next(e); }
});

r.post("/subscriptions/resume", async (req, res, next) => {
  try {
    const { subscriptionId } = req.body;
    const sub = await billing.resumeSubscription(subscriptionId);
    res.json(sub);
  } catch (e) { next(e); }
});

r.delete("/subscriptions/:id", async (req, res, next) => {
  try {
    const sub = await billing.cancelSubscription(req.params.id, true);
    res.json(sub);
  } catch (e) { next(e); }
});

export default r;