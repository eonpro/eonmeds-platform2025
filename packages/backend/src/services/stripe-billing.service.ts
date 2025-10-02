import Stripe from "stripe";

export class StripeBillingService {
  private stripe: Stripe;

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, { apiVersion: "2025-07-30.basil" });
  }

  // ---------- Customers ----------
  async getOrCreateCustomer(opts: { email: string; name?: string; metadata?: Record<string,string>, patientId?: string }) {
    const { email, name, metadata = {}, patientId } = opts;
    // Try to find by email (idempotent enough for our flow)
    const existing = await this.stripe.customers.list({ email, limit: 1 });
    if (existing.data.length) return existing.data[0];

    return this.stripe.customers.create({
      email,
      name,
      metadata: { patientId: patientId ?? "", ...metadata },
    });
  }

  // ---------- Save a card (SetupIntent) ----------
  async createSetupIntent(customerId: string) {
    return this.stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      payment_method_types: ["card"],
    });
  }

  async listPaymentMethods(customerId: string) {
    return this.stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });
  }

  async detachPaymentMethod(paymentMethodId: string) {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  // ---------- One-off charge (PaymentIntent) ----------
  async createPaymentIntent(opts: {
    amountInCents: number; currency: string; customerId: string;
    paymentMethodId?: string; captureMethod?: "automatic"|"manual"; description?: string; metadata?: Record<string,string>;
    offSession?: boolean; confirm?: boolean;
  }) {
    const { amountInCents, currency, customerId, paymentMethodId, captureMethod="automatic", description, metadata={}, offSession=true, confirm=true } = opts;

    return this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      automatic_payment_methods: paymentMethodId ? undefined : { enabled: true },
      confirm,
      off_session: offSession,
      capture_method: captureMethod,
      description,
      metadata,
      setup_future_usage: "off_session",
    });
  }

  async refund(opts: { paymentIntentId?: string; chargeId?: string; amountInCents?: number; reason?: Stripe.RefundCreateParams.Reason }) {
    const { paymentIntentId, chargeId, amountInCents, reason } = opts;
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      charge: chargeId,
      amount: amountInCents,
      reason
    });
  }

  // ---------- Invoicing (Stripe) ----------
  async createInvoiceItem(opts: { customerId: string; priceId?: string; amountInCents?: number; currency?: string; description?: string; metadata?: Record<string,string> }) {
    const { customerId, priceId, amountInCents, currency="usd", description, metadata } = opts;
    // Use price ID if provided (for pre-created products/prices)
    if (priceId) {
      return this.stripe.invoiceItems.create({ 
        customer: customerId, 
        price: priceId, 
        metadata, 
        description 
      } as any); // Type assertion needed due to Stripe types
    }
    // Otherwise use amount directly
    if (!amountInCents) throw new Error("amountInCents required when priceId not provided");
    return this.stripe.invoiceItems.create({ customer: customerId, currency, amount: amountInCents, description, metadata });
  }

  async createAndFinalizeInvoice(opts: { customerId: string; autoAdvance?: boolean; collectionMethod?: "charge_automatically"|"send_invoice"; daysUntilDue?: number; metadata?: Record<string,string> }) {
    const { customerId, autoAdvance=true, collectionMethod="charge_automatically", daysUntilDue=0, metadata } = opts;
    const invoice = await this.stripe.invoices.create({
      customer: customerId,
      auto_advance: autoAdvance,
      collection_method: collectionMethod,
      days_until_due: collectionMethod === "send_invoice" ? daysUntilDue : undefined,
      metadata,
    });
    return this.stripe.invoices.finalizeInvoice(invoice.id);
  }

  async sendInvoice(invoiceId: string) {
    return this.stripe.invoices.sendInvoice(invoiceId);
  }

  async voidInvoice(invoiceId: string) {
    return this.stripe.invoices.voidInvoice(invoiceId);
  }

  async markUncollectible(invoiceId: string) {
    return this.stripe.invoices.markUncollectible(invoiceId);
  }

  // ---------- Plans (Subscriptions) ----------
  async createSubscription(opts: { customerId: string; priceId: string; prorationBehavior?: Stripe.SubscriptionCreateParams.ProrationBehavior; trialEndUnix?: number; billingCycleAnchorUnix?: number; metadata?: Record<string,string> }) {
    const { customerId, priceId, prorationBehavior="create_prorations", trialEndUnix, billingCycleAnchorUnix, metadata } = opts;
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      proration_behavior: prorationBehavior,
      trial_end: trialEndUnix,
      billing_cycle_anchor: billingCycleAnchorUnix,
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata,
      expand: ["latest_invoice.payment_intent"],
    });
  }

  async pauseSubscription(subId: string) {
    return this.stripe.subscriptions.update(subId, { pause_collection: { behavior: "mark_uncollectible" } });
  }

  async resumeSubscription(subId: string) {
    return this.stripe.subscriptions.update(subId, { pause_collection: "" as any });
  }

  async cancelSubscription(subId: string, atPeriodEnd = true) {
    return this.stripe.subscriptions.update(subId, { cancel_at_period_end: atPeriodEnd });
  }

  async updateDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    return this.stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
  }
}