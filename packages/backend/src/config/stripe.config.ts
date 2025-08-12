// Stripe Configuration for EONMeds
// Uses environment variables to keep API keys secure

import Stripe from 'stripe';

export const stripeConfig = {
  // Stripe API Key - Set in .env file
  apiKey: process.env.STRIPE_SECRET_KEY || '',

  // Stripe Webhook Secret - For webhook signature verification
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Subscription Configuration
  subscription: {
    // Trial period in days
    trialPeriodDays: parseInt(process.env.STRIPE_TRIAL_DAYS || '0'),

    // Default payment collection method
    paymentBehavior: 'default_incomplete' as const,

    // Expand fields for detailed responses
    expand: ['latest_invoice.payment_intent'],
  },

  // Invoice Configuration
  invoice: {
    // Days until invoice is due
    daysUntilDue: parseInt(process.env.INVOICE_DUE_DAYS || '30'),

    // Auto advance invoices
    autoAdvance: true,

    // Collection method
    collectionMethod: 'charge_automatically' as const,
  },

  // Customer Configuration
  customer: {
    // Default tax exempt status
    taxExempt: 'none' as const,

    // Invoice prefix
    invoicePrefix: 'EONMEDS',

    // Metadata to attach to all customers
    defaultMetadata: {
      platform: 'eonmeds',
      source: 'web_platform',
    },
  },

  // Product IDs for different services
  products: {
    weightLoss: {
      monthly: process.env.STRIPE_PRODUCT_WEIGHT_LOSS_MONTHLY || '',
      quarterly: process.env.STRIPE_PRODUCT_WEIGHT_LOSS_QUARTERLY || '',
    },
    testosterone: {
      monthly: process.env.STRIPE_PRODUCT_TESTOSTERONE_MONTHLY || '',
      quarterly: process.env.STRIPE_PRODUCT_TESTOSTERONE_QUARTERLY || '',
    },
  },

  // Price IDs for subscriptions
  prices: {
    weightLoss: {
      monthly: process.env.STRIPE_PRICE_WEIGHT_LOSS_MONTHLY || '',
      quarterly: process.env.STRIPE_PRICE_WEIGHT_LOSS_QUARTERLY || '',
    },
    testosterone: {
      monthly: process.env.STRIPE_PRICE_TESTOSTERONE_MONTHLY || '',
      quarterly: process.env.STRIPE_PRICE_TESTOSTERONE_QUARTERLY || '',
    },
  },
};

// Initialize Stripe client - single source of truth
let stripeClient: Stripe | null = null;

// Get or create the Stripe client instance
export const getStripeClient = (): Stripe => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY environment variable is not set. ' +
        'Please add STRIPE_SECRET_KEY=sk_test_... to your .env file.'
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20' as any,
      typescript: true,
    });
  }

  return stripeClient;
};

// Validate configuration on startup
export const validateStripeConfig = () => {
  if (!stripeConfig.apiKey) {
    console.warn('⚠️  STRIPE_SECRET_KEY not set - Stripe payment functionality will be disabled');
    console.warn('   Add STRIPE_SECRET_KEY=sk_test_... to your .env file to enable payments');
    return false;
  }

  if (!stripeConfig.webhookSecret) {
    console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set - webhooks will not be verified');
    console.warn('   Add STRIPE_WEBHOOK_SECRET=whsec_... to your .env file for webhook security');
  }

  console.log('✅ Stripe configuration loaded successfully');
  return true;
};

// Export configured Stripe client for backward compatibility
// Note: Prefer using getStripeClient() for lazy initialization
export const stripe = stripeConfig.apiKey ? getStripeClient() : null;
