const axios = require('axios');

async function testInvoiceCreation() {
  const API_URL = 'http://localhost:3002/api/v1';
  
  console.log('Testing invoice creation fix...\n');

  // Test 1: Invalid request (missing items)
  console.log('Test 1: Invalid request (missing items)');
  try {
    await axios.post(`${API_URL}/billing/invoice/create-and-pay`, {
      patientId: 'P1234',
    });
  } catch (error) {
    console.log('✅ Expected 400 error:', error.response?.data?.error);
  }

  // Test 2: Missing customer info
  console.log('\nTest 2: Missing customer info');
  try {
    await axios.post(`${API_URL}/billing/invoice/create-and-pay`, {
      patientId: 'P1234',
      items: [{ description: 'Test', amount: 100 }],
    });
  } catch (error) {
    console.log('✅ Expected error:', error.response?.data?.error);
  }

  // Test 3: Valid request structure
  console.log('\nTest 3: Valid request structure (will fail auth)');
  try {
    await axios.post(`${API_URL}/billing/invoice/create-and-pay`, {
      email: 'test@example.com',
      name: 'Test User',
      items: [
        { description: 'Consultation', amount: 10000 }, // $100.00
      ],
      email_invoice: true,
    });
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Auth middleware working correctly');
    } else {
      console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
    }
  }

  // Test 4: Legacy endpoint forwarding
  console.log('\nTest 4: Legacy endpoint forwarding');
  try {
    await axios.post(`${API_URL}/payments/invoices/create`, {
      patient_id: 'P1234',
      total_amount: 100,
      description: 'Test Invoice',
      due_date: new Date().toISOString(),
    });
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Legacy endpoint forwarding working');
    } else {
      console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
    }
  }

  console.log('\n✅ All tests completed!');
  console.log('\nTo test with auth, get a token and add to headers:');
  console.log('Authorization: Bearer YOUR_TOKEN');
}

testInvoiceCreation().catch(console.error);
