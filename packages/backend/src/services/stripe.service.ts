import Stripe from "stripe";
import { stripeConfig } from "../config/stripe.config";
import { v4 as uuidv4 } from "uuid";

// Initialize Stripe
const stripe = stripeConfig.apiKey
  ? new Stripe(stripeConfig.apiKey, {
      apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
      maxNetworkRetries: 3, // Add automatic retry logic
      timeout: 10000, // 10 second timeout
    })
  : null;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to generate idempotency keys
function generateIdempotencyKey(prefix: string): string {
  return `${prefix}_${uuidv4()}`;
}

// Helper function for exponential backoff
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to determine if error is retryable
function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Stripe-specific retryable errors
  if (
    error.type === "StripeConnectionError" ||
    error.type === "StripeAPIError" ||
    error.statusCode === 429 || // Rate limit
    error.statusCode >= 500 // Server errors
  ) {
    return true;
  }

  return false;
}

// Wrapper function for retry logic
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries = MAX_RETRIES,
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.error(
        `${operationName} attempt ${attempt + 1} failed:`,
        error.message,
      );

      if (!isRetryableError(error) || attempt === retries) {
        throw error;
      }

      // Exponential backoff
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      console.log(`Retrying ${operationName} in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

export class StripeService {
  // Create a payment intent with retry logic and idempotency
  async createPaymentIntent(
    amount: number,
    customerId: string,
    metadata?: any,
  ) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const idempotencyKey = generateIdempotencyKey("payment_intent");

      const paymentIntent = await withRetry(
        async () =>
          stripe!.paymentIntents.create(
            {
              amount: Math.round(amount), // Ensure whole number
              currency: "usd",
              customer: customerId,
              metadata: {
                ...metadata,
                platform: "eonmeds",
                test_mode:
                  process.env.NODE_ENV !== "production" ? "true" : "false",
                idempotency_key: idempotencyKey,
              },
              automatic_payment_methods: {
                enabled: true,
              },
            },
            {
              idempotencyKey,
            },
          ),
        "createPaymentIntent",
      );

      console.log(`Payment intent created successfully: ${paymentIntent.id}`);
      return { success: true, paymentIntent };
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        errorType: error.type,
      };
    }
  }

  // Charge an invoice with robust error handling
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
        return { success: false, error: "Stripe not configured" };
      }

      const idempotencyKey = generateIdempotencyKey(
        `charge_${params.invoiceId}`,
      );

      // Create payment intent with invoice metadata
      const paymentIntent = await withRetry(
        async () =>
          stripe!.paymentIntents.create(
            {
              amount: Math.round(params.amount), // Ensure whole number
              currency: "usd",
              customer: params.customerId,
              payment_method: params.paymentMethodId,
              confirm: true,
              metadata: {
                invoice_id: params.invoiceId,
                invoice_number: params.invoiceNumber,
                patient_id: params.patientId,
                platform: "eonmeds",
                test_mode:
                  process.env.NODE_ENV !== "production" ? "true" : "false",
                idempotency_key: idempotencyKey,
              },
            },
            {
              idempotencyKey,
            },
          ),
        "chargeInvoice",
      );

      if (paymentIntent.status === "requires_action") {
        return {
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        };
      }

      if (paymentIntent.status === "succeeded") {
        console.log(
          `Invoice ${params.invoiceId} charged successfully: ${paymentIntent.id}`,
        );
        return {
          success: true,
          paymentIntent,
          chargeId: paymentIntent.latest_charge as string,
        };
      }

      return {
        success: false,
        error: `Payment intent status: ${paymentIntent.status}`,
        paymentIntent,
      };
    } catch (error: any) {
      console.error("Error charging invoice:", error);

      // Handle specific Stripe errors
      if (error.type === "StripeCardError") {
        return {
          success: false,
          error: `Card error: ${error.message}`,
          errorCode: error.code,
          declineCode: error.decline_code,
        };
      }

      if (error.type === "StripeInvalidRequestError") {
        return {
          success: false,
          error: `Invalid request: ${error.message}`,
          errorCode: error.code,
        };
      }

      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        errorType: error.type,
      };
    }
  }

  // List payment methods for a customer
  async listPaymentMethods(customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const paymentMethods = await withRetry(
        async () =>
          stripe!.paymentMethods.list({
            customer: customerId,
            type: "card",
          }),
        "listPaymentMethods",
      );

      return { success: true, paymentMethods: paymentMethods.data };
    } catch (error: any) {
      console.error("Error listing payment methods:", error);
      return { success: false, error: error.message };
    }
  }

  // Detach a payment method
  async detachPaymentMethod(paymentMethodId: string) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      await withRetry(
        async () => stripe!.paymentMethods.detach(paymentMethodId),
        "detachPaymentMethod",
      );
      return { success: true };
    } catch (error: any) {
      console.error("Error detaching payment method:", error);
      return { success: false, error: error.message };
    }
  }

  // Create a customer
  async createCustomer(params: { email: string; name: string; phone?: string; metadata?: any }) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const customer = await withRetry(
        async () =>
          stripe!.customers.create({
            email: params.email,
            name: params.name,
            phone: params.phone,
            metadata: {
              ...params.metadata,
              platform: "eonmeds",
            },
          }),
        "createCustomer",
      );

      return { success: true, customer };
    } catch (error: any) {
      console.error("Error creating customer:", error);
      return { success: false, error: error.message };
    }
  }

  // Update a customer
  async updateCustomer(
    customerId: string,
    params: {
      email?: string;
      name?: string;
      phone?: string;
      metadata?: any;
    },
  ) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const customer = await withRetry(
        async () =>
          stripe!.customers.update(customerId, {
            email: params.email,
            name: params.name,
            phone: params.phone,
            metadata: params.metadata,
          }),
        "updateCustomer",
      );

      return { success: true, customer };
    } catch (error: any) {
      console.error("Error updating customer:", error");
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
        return { success: false, error: "Stripe not configured" };
      }

      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        items: [{ price: params.priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          ...params.metadata,
          platform: "eonmeds",
        },
      };

      if (params.paymentMethodId) {
        subscriptionParams.default_payment_method = params.paymentMethodId;
      }

      if (params.trialDays) {
        subscriptionParams.trial_period_days = params.trialDays;
      }

      const subscription = await withRetry(
        async () => stripe!.subscriptions.create(subscriptionParams),
        "createSubscription",
      );

      return { success: true, subscription };
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      return { success: false, error: error.message };
    }
  }

  // Cancel a subscription
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false,
  ) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const subscription = await withRetry(
        async () =>
          stripe!.subscriptions.update(subscriptionId, {
            cancel_at_period_end: !immediately,
          }),
        "cancelSubscription",
      );

      if (immediately) {
        await withRetry(
          async () => stripe!.subscriptions.cancel(subscriptionId),
          "cancelSubscription",
        );
      }

      return { success: true, subscription };
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      return { success: false, error: error.message };
    }
  }

  // Attach a payment method to a customer
  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const paymentMethod = await withRetry(
        async () =>
          stripe!.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
          }),
        "attachPaymentMethod",
      );

      return { success: true, paymentMethod };
    } catch (error: any) {
      console.error("Error attaching payment method:", error);
      return { success: false, error: error.message };
    }
  }

  // Create a setup intent for saving payment methods
  async createSetupIntent(customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const setupIntent = await withRetry(
        async () =>
          stripe!.setupIntents.create({
            customer: customerId,
            payment_method_types: ["card"],
            usage: "off_session",
          }),
        "createSetupIntent",
      );

      return { success: true, setupIntent };
    } catch (error: any) {
      console.error("Error creating setup intent:", error);
      return { success: false, error: error.message };
    }
  }

  // Retrieve a customer
  async retrieveCustomer(customerId: string) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const customer = await withRetry(
        async () => stripe!.customers.retrieve(customerId),
        "retrieveCustomer",
      );

      if (customer.deleted) {
        return { success: false, error: "Customer has been deleted" };
      }

      return { success: true, customer };
    } catch (error: any) {
      console.error("Error retrieving customer:", error);
      return { success: false, error: error.message };
    }
  }

  // Create an invoice
  async createInvoice(params: { customerId: string; description?: string; metadata?: any }) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const invoice = await withRetry(
        async () =>
          stripe!.invoices.create({
            customer: params.customerId,
            description: params.description,
            metadata: {
              ...params.metadata,
              platform: "eonmeds",
            },
            auto_advance: true,
          }),
        "createInvoice",
      );

      return { success: true, invoice };
    } catch (error: any) {
      console.error("Error creating invoice:", error);
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
        return { success: false, error: "Stripe not configured" };
      }

      const invoiceItem = await withRetry(
        async () =>
          stripe!.invoiceItems.create({
            customer: params.customerId,
            amount: Math.round(params.amount),
            currency: "usd",
            description: params.description,
            invoice: params.invoiceId,
          }),
        "addInvoiceItem",
      );

      return { success: true, invoiceItem };
    } catch (error: any) {
      console.error("Error adding invoice item:", error);
      return { success: false, error: error.message };
    }
  }

  // Finalize an invoice
  async finalizeInvoice(invoiceId: string) {
    try {
      if (!stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const invoice = await withRetry(
        async () => stripe!.invoices.finalizeInvoice(invoiceId),
        "finalizeInvoice",
      );
      return { success: true, invoice };
    } catch (error: any) {
      console.error("Error finalizing invoice:", error);
      return { success: false, error: error.message };
    }
  }
}

export default new StripeService();