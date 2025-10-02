/**
 * Test script for the tracking API
 * You can run this in your browser console or as a Node.js script
 */

const API_URL = 'https://eonmeds-platform2025-production.up.railway.app/api/v1/tracking';
const API_KEY = '8f372a1ac2c1721be6c8549178cddeb56d3a690b8bd08be5fc14f3157c669f19';

// Test 1: Check if the test endpoint works (no auth)
async function testEndpoint() {
  console.log('Testing tracking API...');
  try {
    const response = await fetch(`${API_URL}/test`);
    const data = await response.json();
    console.log('Test endpoint response:', data);
    return response.ok;
  } catch (error) {
    console.error('Test endpoint failed:', error);
    return false;
  }
}

// Test 2: Test the import endpoint with API key
async function testImport() {
  console.log('Testing import endpoint...');
  
  const testData = {
    tracking_number: 'TEST123456789',
    carrier: 'FedEx',
    recipient_name: 'Test Patient',
    delivery_address: '123 Test St, Test City, ST 12345',
    delivery_date: new Date().toISOString(),
    ship_date: new Date().toISOString(),
    weight: '1.0 LB',
    service: 'FedEx Ground',
    status: 'In Transit'
  };

  try {
    const response = await fetch(`${API_URL}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    console.log('Import response:', response.status, data);
    return response.ok;
  } catch (error) {
    console.error('Import test failed:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('Starting tracking API tests...\n');
  
  const testResult = await testEndpoint();
  console.log(`✅ Test endpoint: ${testResult ? 'PASSED' : 'FAILED'}\n`);
  
  if (testResult) {
    const importResult = await testImport();
    console.log(`✅ Import endpoint: ${importResult ? 'PASSED' : 'FAILED'}\n`);
  }
}

// If running in Node.js
if (typeof window === 'undefined') {
  // Node.js environment - need to install node-fetch
  console.log('To run in Node.js, first install: npm install node-fetch');
  console.log('Then add at the top: const fetch = require("node-fetch");');
} else {
  // Browser environment - run tests
  runTests();
}
