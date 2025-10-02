import { getStripeClient } from "../config/stripe.config";
import type { Stripe } from "../config/stripe.config";

/**
 * Stripe Service - Phase 1 & 2: Customer Management + Payment Methods
 */
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = getStripeClient();
  }

  /**
   * Create a Stripe customer for a patient
   */
  async createCustomer(params: {
    patientId: string;
    email: string;
    name: string;
    phone?: string;
  }): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        metadata: {
          patient_id: params.patientId,
          platform: "eonmeds",
        },
      });

      console.info(`✅ Created Stripe customer ${customer.id} for patient ${params.patientId}`);
      return customer;
    } catch (error) {
      console.error(`❌ Failed to create Stripe customer for patient ${params.patientId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a Stripe customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      
      // Check if customer was deleted
      if ((customer as Stripe.DeletedCustomer).deleted) {
        return null;
      }

      return customer as Stripe.Customer;
    } catch (error: any) {
      if (error.code === "resource_missing") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a Stripe customer
   */
  async updateCustomer(
    customerId: string,
    updates: {
      email?: string;
      name?: string;
      phone?: string;
    }
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, updates);
      console.info(`✅ Updated Stripe customer ${customer.id}`);
      return customer;
    } catch (error) {
      console.error(`❌ Failed to update Stripe customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Confirm a payment intent (for testing)
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      console.info(`✅ Confirmed payment intent ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      console.error(`❌ Failed to confirm payment intent ${paymentIntentId}:`, error);
      throw error;
    }
  }

  // ============= PHASE 2: PAYMENT METHODS =============

  /**
   * Create a Setup Intent for adding a payment method without charging
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session', // Allow charging later without customer present
        metadata: {
          platform: 'eonmeds',
        },
      });

      console.info(`✅ Created setup intent ${setupIntent.id} for customer ${customerId}`);
      return setupIntent;
    } catch (error) {
      console.error(`❌ Failed to create setup intent for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * List all payment methods for a customer
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      console.info(`✅ Found ${paymentMethods.data.length} payment methods for customer ${customerId}`);
      return paymentMethods.data;
    } catch (error) {
      console.error(`❌ Failed to list payment methods for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      console.info(`✅ Attached payment method ${paymentMethodId} to customer ${customerId}`);
      return paymentMethod;
    } catch (error) {
      console.error(`❌ Failed to attach payment method:`, error);
      throw error;
    }
  }

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      console.info(`✅ Detached payment method ${paymentMethodId}`);
      return paymentMethod;
    } catch (error) {
      console.error(`❌ Failed to detach payment method ${paymentMethodId}:`, error);
      throw error;
    }
  }

  /**
   * Set a default payment method for a customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      console.info(`✅ Set default payment method ${paymentMethodId} for customer ${customerId}`);
      return customer;
    } catch (error) {
      console.error(`❌ Failed to set default payment method:`, error);
      throw error;
    }
  }

  /**
   * Charge a saved payment method
   */
  async chargePaymentMethod(params: {
    amount: number; // in dollars
    customerId: string;
    paymentMethodId: string;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: 'usd',
        customer: params.customerId,
        payment_method: params.paymentMethodId,
        description: params.description,
        off_session: true,
        confirm: true,
        metadata: {
          platform: 'eonmeds',
          ...params.metadata,
        },
      });

      console.info(`✅ Charged ${params.paymentMethodId} for $${params.amount}`);
      return paymentIntent;
    } catch (error: any) {
      // Handle specific errors like card declined
      if (error.code === 'card_declined') {
        console.error(`❌ Card declined for payment method ${params.paymentMethodId}`);
      } else if (error.code === 'authentication_required') {
        console.error(`❌ Authentication required for payment method ${params.paymentMethodId}`);
      }
      throw error;
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customer?: string;
    payment_method?: string;
    metadata?: Record<string, string>;
    setup_future_usage?: 'off_session' | 'on_session';
    description?: string;
    idempotencyKey?: string;
  }): Promise<Stripe.PaymentIntent> {
    try {
      // Generate idempotency key if not provided
      const idempotencyKey = params.idempotencyKey || 
        `pi_${params.customer}_${params.metadata?.invoice_id}_${Date.now()}`;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency,
        customer: params.customer,
        payment_method: params.payment_method,
        metadata: params.metadata,
        setup_future_usage: params.setup_future_usage,
        description: params.description,
        automatic_payment_methods: {
          enabled: true,
        },
      }, {
        idempotencyKey: idempotencyKey
      });

      console.info(`✅ Created payment intent ${paymentIntent.id} for amount ${params.amount} with idempotency key ${idempotencyKey}`);
      return paymentIntent;
    } catch (error: any) {
      // Check if this is a duplicate request
      if (error.type === 'idempotency_error') {
        console.info(`ℹ️ Duplicate payment request detected, returning existing payment intent`);
        // Return the existing payment intent from the error
        return error.raw.payment_intent;
      }
      console.error(`❌ Failed to create payment intent:`, error);
      throw error;
    }
  }

  /**
   * Create a refund
   */
  async createRefund(params: {
    payment_intent: string;
    amount?: number;
    reason?: Stripe.RefundCreateParams.Reason;
  }): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: params.payment_intent,
        amount: params.amount,
        reason: params.reason,
      });

      console.info(`✅ Created refund ${refund.id} for payment intent ${params.payment_intent}`);
      return refund;
    } catch (error) {
      console.error(`❌ Failed to create refund:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error(`❌ Failed to retrieve payment intent ${paymentIntentId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();
