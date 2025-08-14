import { getStripeClient } from "../config/stripe.config";
import type { Stripe } from "../config/stripe.config";

/**
 * Stripe Service - Phase 1: Basic Customer Management
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

      console.log(`✅ Created Stripe customer ${customer.id} for patient ${params.patientId}`);
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
      console.log(`✅ Updated Stripe customer ${customer.id}`);
      return customer;
    } catch (error) {
      console.error(`❌ Failed to update Stripe customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Create a payment intent for an invoice
   */
  async createPaymentIntent(params: {
    amount: number; // Amount in dollars (will be converted to cents)
    customerId: string;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: "usd",
        customer: params.customerId,
        description: params.description,
        metadata: {
          platform: "eonmeds",
          ...params.metadata,
        },
        // Automatic payment methods for better conversion
        automatic_payment_methods: {
          enabled: true,
        },
      });

      console.log(`✅ Created payment intent ${paymentIntent.id} for $${params.amount}`);
      return paymentIntent;
    } catch (error) {
      console.error("❌ Failed to create payment intent:", error);
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

      console.log(`✅ Confirmed payment intent ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      console.error(`❌ Failed to confirm payment intent ${paymentIntentId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();
