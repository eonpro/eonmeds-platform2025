import Stripe from 'stripe';
import { stripeConfig } from '../config/stripe.config';

// Initialize Stripe
const stripe = stripeConfig.apiKey ? new Stripe(stripeConfig.apiKey, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
}) : null;

class StripeService {
  // Create a payment intent
  async createPaymentIntent(amount: number, customerId: string, metadata?: any) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Ensure whole number
        currency: 'usd',
        customer: customerId,
        metadata: {
          ...metadata,
          platform: 'eonmeds',
          test_mode: process.env.NODE_ENV !== 'production' ? 'true' : 'false'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return { success: true, paymentIntent };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      return { success: false, error: error.message };
    }
  }

  // Charge an invoice
  async chargeInvoice(params: {
    amount: number;
    customerId: string;
    paymentMethodId: string;
    invoiceId: string;
    invoiceNumber: string;
    patientId: string;
  }) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      // Create payment intent with invoice metadata
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(params.amount), // Ensure whole number
        currency: 'usd',
        customer: params.customerId,
        payment_method: params.paymentMethodId,
        confirm: true,
        metadata: {
          invoice_id: params.invoiceId,
          invoice_number: params.invoiceNumber,
          patient_id: params.patientId,
          platform: 'eonmeds',
          test_mode: process.env.NODE_ENV !== 'production' ? 'true' : 'false'
        }
      });

      if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          error: 'Payment requires additional authentication'
        };
      }

      if (paymentIntent.status === 'succeeded') {
        return { success: true, paymentIntent };
      }

      return {
        success: false,
        error: `Payment failed with status: ${paymentIntent.status}`
      };
    } catch (error: any) {
      console.error('Error charging invoice:', error);
      return { success: false, error: error.message };
    }
  }

  // List payment methods for a customer
  async listPaymentMethods(customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return { success: true, paymentMethods: paymentMethods.data };
    } catch (error: any) {
      console.error('Error listing payment methods:', error);
      return { success: false, error: error.message };
    }
  }

  // Detach a payment method
  async detachPaymentMethod(paymentMethodId: string) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      await stripe.paymentMethods.detach(paymentMethodId);
      return { success: true };
    } catch (error: any) {
      console.error('Error detaching payment method:', error);
      return { success: false, error: error.message };
    }
  }

  // Create a customer
  async createCustomer(params: {
    email: string;
    name: string;
    phone?: string;
    metadata?: any;
  }) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        metadata: {
          ...params.metadata,
          platform: 'eonmeds'
        }
      });

      return { success: true, customer };
    } catch (error: any) {
      console.error('Error creating customer:', error);
      return { success: false, error: error.message };
    }
  }

  // Update a customer
  async updateCustomer(customerId: string, params: {
    email?: string;
    name?: string;
    phone?: string;
    metadata?: any;
  }) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const customer = await stripe.customers.update(customerId, {
        email: params.email,
        name: params.name,
        phone: params.phone,
        metadata: params.metadata
      });

      return { success: true, customer };
    } catch (error: any) {
      console.error('Error updating customer:', error);
      return { success: false, error: error.message };
    }
  }

  // Create a subscription
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    paymentMethodId?: string;
    trialDays?: number;
    metadata?: any;
  }) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        items: [{ price: params.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          ...params.metadata,
          platform: 'eonmeds'
        }
      };

      if (params.paymentMethodId) {
        subscriptionParams.default_payment_method = params.paymentMethodId;
      }

      if (params.trialDays) {
        subscriptionParams.trial_period_days = params.trialDays;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);

      return { success: true, subscription };
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel a subscription
  async cancelSubscription(subscriptionId: string, immediately: boolean = false) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: !immediately
      });

      if (immediately) {
        await stripe.subscriptions.cancel(subscriptionId);
      }

      return { success: true, subscription };
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Attach a payment method to a customer
  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return { success: true, paymentMethod };
    } catch (error: any) {
      console.error('Error attaching payment method:', error);
      return { success: false, error: error.message };
    }
  }

  // Create a setup intent for saving payment methods
  async createSetupIntent(customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      return { success: true, setupIntent };
    } catch (error: any) {
      console.error('Error creating setup intent:', error);
      return { success: false, error: error.message };
    }
  }

  // Retrieve a customer
  async retrieveCustomer(customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const customer = await stripe.customers.retrieve(customerId);
      
      if (customer.deleted) {
        return { success: false, error: 'Customer has been deleted' };
      }

      return { success: true, customer };
    } catch (error: any) {
      console.error('Error retrieving customer:', error);
      return { success: false, error: error.message };
    }
  }

  // Create an invoice
  async createInvoice(params: {
    customerId: string;
    description?: string;
    metadata?: any;
  }) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const invoice = await stripe.invoices.create({
        customer: params.customerId,
        description: params.description,
        metadata: {
          ...params.metadata,
          platform: 'eonmeds'
        },
        auto_advance: true,
      });

      return { success: true, invoice };
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      return { success: false, error: error.message };
    }
  }

  // Add an invoice item
  async addInvoiceItem(params: {
    customerId: string;
    amount: number;
    description: string;
    invoiceId?: string;
  }) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const invoiceItem = await stripe.invoiceItems.create({
        customer: params.customerId,
        amount: Math.round(params.amount),
        currency: 'usd',
        description: params.description,
        invoice: params.invoiceId,
      });

      return { success: true, invoiceItem };
    } catch (error: any) {
      console.error('Error adding invoice item:', error);
      return { success: false, error: error.message };
    }
  }

  // Finalize an invoice
  async finalizeInvoice(invoiceId: string) {
    try {
      if (!stripe) {
        return { success: false, error: 'Stripe not configured' };
      }

      const invoice = await stripe.invoices.finalizeInvoice(invoiceId);
      return { success: true, invoice };
    } catch (error: any) {
      console.error('Error finalizing invoice:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new StripeService(); 