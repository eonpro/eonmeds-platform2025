const Stripe = require('stripe');

class StripeClient {
  constructor(apiKey) {
    this.stripe = Stripe(apiKey);
  }

  // Customer Management
  async createCustomer(patientData) {
    try {
      const customer = await this.stripe.customers.create({
        email: patientData.email,
        name: `${patientData.firstName} ${patientData.lastName}`,
        phone: patientData.phone,
        metadata: {
          patient_id: patientData.id,
          intakeq_id: patientData.intakeq_id
        }
      });
      return { success: true, customer };
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomer(customerId) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return { success: true, customer };
    } catch (error) {
      console.error('Error retrieving customer:', error);
      return { success: false, error: error.message };
    }
  }

  // Payment Method Management
  async attachPaymentMethod(paymentMethodId, customerId) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(
        paymentMethodId,
        { customer: customerId }
      );
      return { success: true, paymentMethod };
    } catch (error) {
      console.error('Error attaching payment method:', error);
      return { success: false, error: error.message };
    }
  }

  async listPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });
      return { success: true, paymentMethods: paymentMethods.data };
    } catch (error) {
      console.error('Error listing payment methods:', error);
      return { success: false, error: error.message };
    }
  }

  async setDefaultPaymentMethod(customerId, paymentMethodId) {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Error setting default payment method:', error);
      return { success: false, error: error.message };
    }
  }

  async detachPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      return { success: true, paymentMethod };
    } catch (error) {
      console.error('Error detaching payment method:', error);
      return { success: false, error: error.message };
    }
  }

  // One-time Charges
  async createCharge(customerId, amount, description = '', paymentMethodId = null, metadata = {}) {
    try {
      const params = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        description: description,
        metadata: metadata,
        confirm: true,
        return_url: `${process.env.BASE_URL || 'http://localhost:3000'}/payments/success`
      };

      if (paymentMethodId) {
        params.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(params);
      
      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Error creating charge:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Subscription Management
  async createSubscription(customerId, priceId, paymentMethodId = null) {
    try {
      const subscriptionData = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      };

      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);
      return { success: true, subscription };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return { success: false, error: error.message };
    }
  }

  async pauseSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'mark_uncollectible'
        }
      });
      return { success: true, subscription };
    } catch (error) {
      console.error('Error pausing subscription:', error);
      return { success: false, error: error.message };
    }
  }

  async resumeSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: null
      });
      return { success: true, subscription };
    } catch (error) {
      console.error('Error resuming subscription:', error);
      return { success: false, error: error.message };
    }
  }

  async cancelSubscription(subscriptionId, immediately = false) {
    try {
      if (immediately) {
        const subscription = await this.stripe.subscriptions.del(subscriptionId);
        return { success: true, subscription };
      } else {
        const subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
        return { success: true, subscription };
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return { success: false, error: error.message };
    }
  }

  async getSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return { success: true, subscription };
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      return { success: false, error: error.message };
    }
  }

  async listSubscriptions(customerId) {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        limit: 10
      });
      return { success: true, subscriptions: subscriptions.data };
    } catch (error) {
      console.error('Error listing subscriptions:', error);
      return { success: false, error: error.message };
    }
  }

  // Products and Prices
  async createProduct(name, description) {
    try {
      const product = await this.stripe.products.create({
        name: name,
        description: description
      });
      return { success: true, product };
    } catch (error) {
      console.error('Error creating product:', error);
      return { success: false, error: error.message };
    }
  }

  async createPrice(productId, amount, interval = 'month') {
    try {
      const priceData = {
        product: productId,
        unit_amount: Math.round(amount * 100),
        currency: 'usd'
      };

      if (interval) {
        priceData.recurring = { interval };
      }

      const price = await this.stripe.prices.create(priceData);
      return { success: true, price };
    } catch (error) {
      console.error('Error creating price:', error);
      return { success: false, error: error.message };
    }
  }

  async listProducts(active = true) {
    try {
      const products = await this.stripe.products.list({
        active: active,
        limit: 100
      });
      return { success: true, products: products.data };
    } catch (error) {
      console.error('Error listing products:', error);
      return { success: false, error: error.message };
    }
  }

  async listPrices(productId = null) {
    try {
      const params = { limit: 100 };
      if (productId) {
        params.product = productId;
      }
      const prices = await this.stripe.prices.list(params);
      return { success: true, prices: prices.data };
    } catch (error) {
      console.error('Error listing prices:', error);
      return { success: false, error: error.message };
    }
  }

  // Webhook signature verification
  constructWebhookEvent(payload, signature, webhookSecret) {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return null;
    }
  }

  // Payment Intent for client-side confirmation
  async createPaymentIntent(amount, customerId = null, metadata = {}) {
    try {
      const params = {
        amount: Math.round(amount * 100),
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true
        },
        metadata
      };

      if (customerId) {
        params.customer = customerId;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(params);
      return { success: true, paymentIntent };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return { success: false, error: error.message };
    }
  }

  // Setup Intent for saving cards
  async createSetupIntent(customerId) {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        automatic_payment_methods: {
          enabled: true
        }
      });
      return { success: true, setupIntent };
    } catch (error) {
      console.error('Error creating setup intent:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = StripeClient; 