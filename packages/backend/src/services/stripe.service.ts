import Stripe from 'stripe';
import { stripeConfig } from '../config/stripe.config';

// Initialize Stripe client
const stripe = stripeConfig.apiKey ? new Stripe(stripeConfig.apiKey, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
}) : null;

export class StripeService {
  /**
   * Create or retrieve a Stripe customer for a patient
   */
  async createOrGetCustomer(patient: {
    patient_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    stripe_customer_id?: string;
  }) {
    try {
      if (!stripe) {
        console.error('Stripe is not configured');
        return { success: false, error: 'Stripe is not configured' };
      }

      // If patient already has a Stripe customer ID, retrieve it
      if (patient.stripe_customer_id) {
        try {
          const customer = await stripe.customers.retrieve(patient.stripe_customer_id);
          if (!customer.deleted) {
            return { success: true, customer };
          }
        } catch (error) {
          console.log('Existing customer not found, creating new one');
        }
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email: patient.email,
        name: `${patient.first_name} ${patient.last_name}`,
        phone: patient.phone,
        metadata: {
          patient_id: patient.patient_id,
          created_from: 'eonmeds_platform'
        }
      });

      console.log(`Created Stripe customer ${customer.id} for patient ${patient.patient_id}`);
      return { success: true, customer };

    } catch (error: any) {
      console.error('Error creating Stripe customer:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create customer'
      };
    }
  }

  /**
   * Create a payment intent for charging
   */
  async createPaymentIntent(params: {
    amount: number;
    customerId: string;
    description?: string;
    metadata?: Record<string, string>;
  }) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe is not configured' };
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: 'usd',
        customer: params.customerId,
        description: params.description,
        metadata: {
          ...params.metadata,
          platform: 'eonmeds'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return { success: true, paymentIntent };

    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create payment intent' 
      };
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe is not configured' };
      }

      const paymentMethod = await stripe.paymentMethods.attach(
        paymentMethodId,
        { customer: customerId }
      );

      return { success: true, paymentMethod };

    } catch (error: any) {
      console.error('Error attaching payment method:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to attach payment method' 
      };
    }
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe is not configured', paymentMethods: [] };
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return { 
        success: true, 
        paymentMethods: paymentMethods.data 
      };

    } catch (error: any) {
      console.error('Error listing payment methods:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to list payment methods',
        paymentMethods: [] 
      };
    }
  }

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent(customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe is not configured' };
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return { success: true, setupIntent };

    } catch (error: any) {
      console.error('Error creating setup intent:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create setup intent' 
      };
    }
  }

  /**
   * Create an invoice
   */
  async createInvoice(params: {
    customerId: string;
    items: Array<{
      amount: number;
      description: string;
    }>;
    description?: string;
    metadata?: Record<string, string>;
  }) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe is not configured' };
      }

      // Create invoice
      const invoice = await stripe.invoices.create({
        customer: params.customerId,
        description: params.description,
        auto_advance: false, // Don't auto-finalize
        metadata: {
          ...params.metadata,
          platform: 'eonmeds'
        }
      });

      // Add invoice items
      for (const item of params.items) {
        await stripe.invoiceItems.create({
          customer: params.customerId,
          invoice: invoice.id,
          amount: Math.round(item.amount * 100), // Convert to cents
          currency: 'usd',
          description: item.description,
        });
      }

      // Finalize the invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      return { success: true, invoice: finalizedInvoice };

    } catch (error: any) {
      console.error('Error creating invoice:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create invoice' 
      };
    }
  }

  /**
   * Charge an invoice
   */
  async chargeInvoice(invoiceId: string, paymentMethodId?: string) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe is not configured' };
      }

      // If payment method provided, update the invoice
      if (paymentMethodId) {
        await stripe.invoices.update(invoiceId, {
          default_payment_method: paymentMethodId
        });
      }

      // Pay the invoice
      const paidInvoice = await stripe.invoices.pay(invoiceId);

      return { success: true, invoice: paidInvoice };

    } catch (error: any) {
      console.error('Error charging invoice:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to charge invoice' 
      };
    }
  }

  /**
   * Construct webhook event from request
   */
  constructWebhookEvent(payload: string | Buffer, signature: string) {
    try {
      if (!stripe) {
        throw new Error('Stripe is not configured');
      }

      if (!stripeConfig.webhookSecret) {
        throw new Error('Webhook secret is not configured');
      }

      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        stripeConfig.webhookSecret
      );

      return event;

    } catch (error: any) {
      console.error('Error constructing webhook event:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();
