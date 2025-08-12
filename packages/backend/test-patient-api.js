#!/usr/bin/env node

const axios = require('axios');

async function testPatientAPI() {
  const API_URL = 'https://eonmeds-platform2025-production.up.railway.app';

  try {
    console.log('🔍 Testing patient API...\n');

    // Test the patients endpoint with qualified status
    console.log('1. Testing GET /api/v1/patients?status=qualified');
    const response = await axios.get(`${API_URL}/api/v1/patients`, {
      params: {
        status: 'qualified',
        limit: 100,
        offset: 0,
      },
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    if (response.data.patients) {
      console.log(`\n✅ Found ${response.data.patients.length} qualified patients`);

      // Show first 3 patients
      response.data.patients.slice(0, 3).forEach((p) => {
        console.log(`  - ${p.patient_id}: ${p.first_name} ${p.last_name} (${p.email})`);
      });
    }
  } catch (error) {
    console.error('❌ API Error:', error.response?.status, error.response?.data || error.message);

    if (error.response) {
      console.log('\nResponse headers:', error.response.headers);
      console.log('Response data:', error.response.data);
    }
  }
}

testPatientAPI();
