import Stripe from 'stripe';
import { stripeConfig } from '../config/stripe.config';

export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    // Initialize Stripe with API key from config if available
    if (stripeConfig.apiKey) {
      this.stripe = new Stripe(stripeConfig.apiKey, {
        apiVersion: '2023-10-16',
      });
    } else {
      console.warn('⚠️  Stripe API key not configured. Stripe functionality will be disabled.');
    }
  }

  // Helper to check if Stripe is configured
  private isConfigured(): boolean {
    return this.stripe !== null;
  }

  // ==================== CUSTOMER METHODS ====================
  
  // Create a new Stripe customer from patient data
  async createCustomer(patientData: any) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.' };
    }
    
    try {
      const customerData = {
        email: patientData.email,
        name: `${patientData.first_name} ${patientData.last_name}`,
        phone: patientData.phone,
        address: {
          line1: patientData.address_street || patientData.address,
          line2: patientData.apartment_number,
          city: patientData.city,
          state: patientData.state,
          postal_code: patientData.zip,
          country: 'US'
        },
        metadata: {
          ...stripeConfig.customer.defaultMetadata,
          patient_id: patientData.patient_id,
          form_type: patientData.form_type,
          created_from: 'eonmeds_platform'
        }
      };

      const customer = await this.stripe.customers.create(customerData);
      return { success: true, customer };
    } catch (error: any) {
      console.error('Error creating Stripe customer:', error);
      return { success: false, error: error.message };
    }
  }

  // Retrieve an existing Stripe customer
  async getCustomer(customerId: string) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return { success: true, customer };
    } catch (error: any) {
      console.error('Error retrieving Stripe customer:', error);
      return { success: false, error: error.message };
    }
  }

  // Update customer information
  async updateCustomer(customerId: string, updateData: Stripe.CustomerUpdateParams) {
    try {
      const customer = await this.stripe.customers.update(customerId, updateData);
      return { success: true, customer };
    } catch (error: any) {
      console.error('Error updating Stripe customer:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== PAYMENT METHOD METHODS ====================

  // Attach a payment method to a customer
  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(
        paymentMethodId,
        { customer: customerId }
      );
      return { success: true, paymentMethod };
    } catch (error: any) {
      console.error('Error attaching payment method:', error);
      return { success: false, error: error.message };
    }
  }

  // List payment methods for a customer
  async listPaymentMethods(customerId: string) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });
      return { success: true, paymentMethods: paymentMethods.data };
    } catch (error: any) {
      console.error('Error listing payment methods:', error);
      return { success: false, error: error.message };
    }
  }

  // Create payment method from card details
  async createPaymentMethodFromCard(cardDetails: {
    card_number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
  }) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Stripe is not configured' };
    }
    
    try {
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardDetails.card_number,
          exp_month: cardDetails.exp_month,
          exp_year: cardDetails.exp_year,
          cvc: cardDetails.cvc
        }
      });
      return { success: true, paymentMethod };
    } catch (error: any) {
      console.error('Error creating payment method:', error);
      return { success: false, error: error.message };
    }
  }

  // Set default payment method for customer
  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
      return { success: true, customer };
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      return { success: false, error: error.message };
    }
  }

  // Detach payment method from customer
  async detachPaymentMethod(paymentMethodId: string) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Stripe is not configured' };
    }
    
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      return { success: true, paymentMethod };
    } catch (error: any) {
      console.error('Error detaching payment method:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== PAYMENT INTENT METHODS ====================

  // Create a payment intent for invoice payment
  async createPaymentIntent(amount: number, customerId: string, metadata: any = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        setup_future_usage: 'off_session',
        metadata: {
          ...metadata,
          platform: 'eonmeds'
        }
      });
      return { success: true, paymentIntent };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      return { success: false, error: error.message };
    }
  }

  // Confirm a payment intent
  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        { payment_method: paymentMethodId }
      );
      return { success: true, paymentIntent };
    } catch (error: any) {
      console.error('Error confirming payment intent:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== INVOICE/CHARGE METHODS ====================

  // Charge an invoice using payment intent
  async chargeInvoice(invoiceData: {
    amount: number;
    customerId: string;
    paymentMethodId: string;
    invoiceId: string;
    invoiceNumber: string;
    patientId: string;
  }) {
    try {
      // Create payment intent with invoice metadata
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(invoiceData.amount * 100), // Convert to cents
        currency: 'usd',
        customer: invoiceData.customerId,
        payment_method: invoiceData.paymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          invoice_id: invoiceData.invoiceId,
          invoice_number: invoiceData.invoiceNumber,
          patient_id: invoiceData.patientId,
          platform: 'eonmeds'
        }
      });

      return { success: true, paymentIntent };
    } catch (error: any) {
      console.error('Error charging invoice:', error);
      
      // Handle specific error types
      if (error.type === 'StripeCardError') {
        return { 
          success: false, 
          error: error.message,
          requiresAction: error.code === 'authentication_required'
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  // ==================== SUBSCRIPTION METHODS (if needed) ====================

  // Create a subscription
  async createSubscription(customerId: string, priceId: string, paymentMethodId?: string) {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: stripeConfig.subscription.paymentBehavior,
        expand: stripeConfig.subscription.expand
      };

      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      if (stripeConfig.subscription.trialPeriodDays > 0) {
        subscriptionData.trial_period_days = stripeConfig.subscription.trialPeriodDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);
      return { success: true, subscription };
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel a subscription
  async cancelSubscription(subscriptionId: string, immediately: boolean = false) {
    try {
      const subscription = immediately
        ? await this.stripe.subscriptions.cancel(subscriptionId)
        : await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
          });
      
      return { success: true, subscription };
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Pause a subscription
  async pauseSubscription(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'mark_uncollectible'
        }
      });
      return { success: true, subscription };
    } catch (error: any) {
      console.error('Error pausing subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Resume a paused subscription
  async resumeSubscription(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: null
      });
      return { success: true, subscription };
    } catch (error: any) {
      console.error('Error resuming subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return { success: true, subscription };
    } catch (error: any) {
      console.error('Error retrieving subscription:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export a singleton instance
export default new StripeService(); 