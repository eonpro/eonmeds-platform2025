const crypto = require('crypto');
const axios = require('axios');

// Test webhook payload simulating HeyFlow form submission
const testPayload = {
  webhookId: 'wh_test_' + Date.now(),
  eventType: 'form.submitted',
  timestamp: new Date().toISOString(),
  form: {
    id: 'form_weight_loss_v2',
    name: 'Weight Loss Consultation',
    version: '2.0',
    language: 'es'
  },
  submission: {
    id: 'sub_test_' + Date.now(),
    fields: {
      // Personal Information
      first_name: 'Maria',
      last_name: 'Garcia',
      email: 'maria.garcia.test@example.com',
      phone: '+1-555-0123',
      date_of_birth: '1985-03-15',
      gender: 'female',
      
      // Physical Information
      height_feet: 5,
      height_inches: 4,
      weight_lbs: 180,
      
      // Weight Loss Goals
      target_weight_lbs: 140,
      weight_loss_timeline: '6_months',
      previous_weight_loss_attempts: 'Diet and exercise, but struggled with consistency',
      exercise_frequency: 'twice_weekly',
      diet_restrictions: 'vegetarian,gluten_free',
      
      // Medical History
      medical_conditions: ['diabetes_type2', 'hypertension'],
      current_medications: ['metformin', 'lisinopril'],
      allergies: ['penicillin'],
      diabetes_type: 'type_2',
      thyroid_condition: false,
      heart_conditions: [],
      
      // Consent
      consent_treatment: true,
      consent_telehealth: true,
      consent_date: new Date().toISOString(),
      
      // Language Preference
      preferred_language: 'es'
    }
  }
};

// Function to generate HMAC signature
function generateSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return digest;
}

// Send test webhook
async function testWebhook() {
  try {
    // You'll need to set this to match your .env HEYFLOW_WEBHOOK_SECRET
    const webhookSecret = process.env.HEYFLOW_WEBHOOK_SECRET || 'test-webhook-secret';
    const signature = generateSignature(testPayload, webhookSecret);
    
    console.log('Sending test webhook to: http://localhost:3002/api/v1/webhooks/heyflow');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    console.log('Signature:', signature);
    
    const response = await axios.post(
      'http://localhost:3002/api/v1/webhooks/heyflow',
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-heyflow-signature': signature
        }
      }
    );
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.error('Error Response:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
console.log('=== HeyFlow Webhook Test ===\n');
testWebhook(); 