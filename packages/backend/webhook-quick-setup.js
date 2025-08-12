#!/usr/bin/env node

const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log(`
🚀 EONMeds Webhook Quick Setup
==============================
This wizard will help you connect a HeyFlow form in under 5 minutes!
`);

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function generateWebhookConfig() {
  // Step 1: Get form details
  const formName = await question('📝 What is your HeyFlow form name? ');
  const formId = await question('🔑 What is your HeyFlow form ID? ');
  const formType = await question('💊 Form type (weight_loss/testosterone/diabetes/other)? ');

  // Step 2: Generate secure webhook secret
  const webhookSecret = 'hf_' + crypto.randomBytes(32).toString('hex');
  console.log(`\n✅ Generated webhook secret: ${webhookSecret}`);

  // Step 3: Determine webhook URL
  const environment = await question('\n🌍 Environment (local/staging/production)? ');
  const webhookUrls = {
    local: 'http://localhost:3002/api/v1/webhooks/heyflow',
    staging: 'https://staging.eonmeds.com/api/v1/webhooks/heyflow',
    production: 'https://api.eonmeds.com/api/v1/webhooks/heyflow',
  };

  const webhookUrl = webhookUrls[environment] || webhookUrls.local;

  // Step 4: Create form configuration
  const formConfig = {
    id: crypto.randomUUID(),
    heyflow_form_id: formId,
    form_name: formName,
    form_type: formType,
    webhook_url: webhookUrl,
    webhook_secret: webhookSecret,
    field_mappings: getDefaultFieldMappings(formType),
    created_at: new Date().toISOString(),
  };

  // Step 5: Save configuration
  const configDir = path.join(__dirname, 'src/config/forms');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configFile = path.join(configDir, `${formId}.json`);
  fs.writeFileSync(configFile, JSON.stringify(formConfig, null, 2));

  // Step 6: Update .env file
  console.log(`
📋 Add this to your .env file:
================================
HEYFLOW_WEBHOOK_SECRET_${formId.toUpperCase().replace(/-/g, '_')}=${webhookSecret}
`);

  // Step 7: Display HeyFlow configuration
  console.log(`
🔧 Configure in HeyFlow Dashboard:
==================================
1. Go to your form settings in HeyFlow
2. Navigate to: Integrations → Webhooks
3. Click "Add Webhook"
4. Enter these details:

   Webhook URL: ${webhookUrl}
   Request Method: POST
   Trigger: On form submission
   Include form data: Yes
   Signature Secret: ${webhookSecret}

5. Click "Save" and test with a form submission
`);

  // Step 8: Test webhook connectivity
  const testNow = await question('\n🧪 Would you like to test the webhook now? (y/n) ');

  if (testNow.toLowerCase() === 'y') {
    await testWebhookConnection(formConfig);
  }

  console.log(`
✅ Setup Complete!
==================
Form "${formName}" is ready to receive webhooks.
Configuration saved to: ${configFile}

Next steps:
1. Add the webhook secret to your .env file
2. Configure the webhook in HeyFlow
3. Submit a test form
4. Check logs at: /api/v1/webhooks/monitor/${formId}
`);

  rl.close();
}

function getDefaultFieldMappings(formType) {
  const commonMappings = {
    // HeyFlow field -> Database field
    firstname: 'first_name',
    lastname: 'last_name',
    email: 'email',
    phone: 'phone',
    PhoneNumber: 'phone',
    dob: 'date_of_birth',
    dateofbirth: 'date_of_birth',
    gender: 'gender',
    consent_treatment: 'consent_treatment',
    consent_telehealth: 'consent_telehealth',
  };

  const typeMappings = {
    weight_loss: {
      ...commonMappings,
      starting_weight: 'weight_lbs',
      target_weight: 'target_weight_lbs',
      feet: 'height_feet',
      inches: 'height_inches',
      weight_loss_timeline: 'weight_loss_timeline',
      exercise_frequency: 'exercise_frequency',
    },
    testosterone: {
      ...commonMappings,
      current_symptoms: 'symptoms',
      testosterone_history: 'previous_treatment',
      energy_level: 'energy_level',
    },
    diabetes: {
      ...commonMappings,
      a1c_level: 'a1c_level',
      diabetes_type: 'diabetes_type',
      insulin_use: 'insulin_use',
    },
  };

  return typeMappings[formType] || commonMappings;
}

async function testWebhookConnection(config) {
  console.log('\n🔄 Testing webhook connection...');

  const testPayload = {
    webhookId: 'test_' + Date.now(),
    eventType: 'connection.test',
    formId: config.heyflow_form_id,
    timestamp: new Date().toISOString(),
  };

  try {
    // Generate test signature
    const hmac = crypto.createHmac('sha256', config.webhook_secret);
    const signature = hmac.update(JSON.stringify(testPayload)).digest('hex');

    const response = await axios.post(config.webhook_url, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-heyflow-signature': signature,
      },
      timeout: 5000,
    });

    if (response.status === 200) {
      console.log('✅ Webhook endpoint is responsive!');
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.log('❌ Webhook test failed:', error.message);
    console.log('Make sure your backend is running on the correct port.');
  }
}

// Helper script to monitor webhooks
async function createMonitoringEndpoint() {
  const monitorCode = `
// Add this to your webhook.routes.ts
router.get('/monitor/:formId', async (req, res) => {
  const { formId } = req.params;
  const recentWebhooks = await db.webhook_events.findMany({
    where: { 
      payload: { path: '$.form.id', equals: formId }
    },
    orderBy: { created_at: 'desc' },
    take: 10
  });
  
  res.json({
    formId,
    totalReceived: recentWebhooks.length,
    lastReceived: recentWebhooks[0]?.created_at,
    recentWebhooks: recentWebhooks.map(w => ({
      id: w.id,
      received: w.created_at,
      processed: w.processed,
      error: w.error_message
    }))
  });
});
`;

  console.log('\n📊 Add this monitoring endpoint to track webhooks:', monitorCode);
}

// Run the setup
generateWebhookConfig().catch(console.error);
