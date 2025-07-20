const axios = require('axios');

// List of reps to test
const REPS = [
  'Laura Zevallos',
  'Ana Saavedra',
  'Yasmin Saavedra',
  'Rebecca Raines',
  'Maurizio Llanos',
  'Max Putrello',
  'Melissa Manley',
  'Chris Lenaham'
];

// Sample patient data
const SAMPLE_PATIENTS = [
  { firstname: 'Maria', lastname: 'Rodriguez', email: 'maria.test1@example.com', phone: '+1 555 0101' },
  { firstname: 'Carlos', lastname: 'Gonzalez', email: 'carlos.test2@example.com', phone: '+1 555 0102' },
  { firstname: 'Ana', lastname: 'Martinez', email: 'ana.test3@example.com', phone: '+1 555 0103' },
  { firstname: 'Luis', lastname: 'Garcia', email: 'luis.test4@example.com', phone: '+1 555 0104' },
  { firstname: 'Sofia', lastname: 'Lopez', email: 'sofia.test5@example.com', phone: '+1 555 0105' },
  { firstname: 'Diego', lastname: 'Hernandez', email: 'diego.test6@example.com', phone: '+1 555 0106' },
  { firstname: 'Isabella', lastname: 'Perez', email: 'isabella.test7@example.com', phone: '+1 555 0107' },
  { firstname: 'Miguel', lastname: 'Sanchez', email: 'miguel.test8@example.com', phone: '+1 555 0108' }
];

async function simulateInternalForm(patientData, repName) {
  const webhookPayload = {
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    flowID: 'Gb2YDWzoMnCcOAH17EYF', // Internal Espanol 2025 form ID
    createdAt: new Date().toISOString(),
    fields: {
      ...patientData,
      repname: repName,
      'Phone Number': patientData.phone,
      gender: 'Female',
      dob: '01/15/1985',
      feet: '5',
      inches: '4',
      starting_weight: '180',
      idealweight: '140',
      BMI: '30.9',
      address: '123 Test Street, Miami, FL, USA',
      'address [house]': '123',
      'address [street]': 'Test Street',
      'address [city]': 'Miami',
      'address [state]': 'Florida',
      'address [zip]': '33101',
      'Blood Pressure': 'Less than 120/80',
      consent_treatment: 'yes',
      consent_telehealth: 'yes'
    }
  };

  try {
    console.log(`\n📤 Submitting form for ${patientData.firstname} ${patientData.lastname} with rep ${repName}...`);
    
    const response = await axios.post(
      'https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/heyflow',
      webhookPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Success: ${response.data.message || 'Webhook received'}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.response?.data?.error || error.message}`);
  }
}

async function simulateMultipleForms() {
  console.log('🚀 Simulating Internal Espanol 2025 form submissions...\n');
  console.log('Form ID: Gb2YDWzoMnCcOAH17EYF');
  console.log('Webhook URL: https://eonmeds-platform2025-production.up.railway.app/api/v1/webhooks/heyflow\n');
  
  // Submit one form for each rep
  for (let i = 0; i < REPS.length && i < SAMPLE_PATIENTS.length; i++) {
    await simulateInternalForm(SAMPLE_PATIENTS[i], REPS[i]);
    // Small delay between submissions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ All simulated forms submitted!');
  console.log('\n📊 Expected results:');
  console.log('- 8 new patients in the system');
  console.log('- Each with their assigned rep name as a hashtag');
  console.log('- All marked with #weightloss and #internalrep');
  console.log('- Check the dashboard to see them!');
}

// Run the simulation
simulateMultipleForms().catch(console.error); 