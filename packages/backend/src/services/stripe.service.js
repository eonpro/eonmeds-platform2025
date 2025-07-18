const Stripe = require('stripe');
const { stripeConfig } = require('../config/stripe.config');

class StripeClient {
  constructor() {
    // Initialize Stripe with API key from config
    this.stripe = Stripe(stripeConfig.apiKey);
  }

  // ==================== CUSTOMER METHODS ====================
  
  // Create a new Stripe customer from patient data
  async createCustomer(patientData) {
    try {
      const customerData = {
        email: patientData.email,
        name: `${patientData.first_name} ${patientData.last_name}`,
        phone: patientData.phone,
        address: {
          line1: patientData.address_street,
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
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      return { success: false, error: error.message };
    }
  }
} 