const https = require('https');

// Test patient ID - replace with an actual patient ID
const patientId = 'P147118'; // Caren Sanchez

const options = {
  hostname: 'eonmeds-platform2025-production.up.railway.app',
  path: `/api/v1/patients/${patientId}`,
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

console.log(`Testing patient API: https://${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:');
    try {
      const patient = JSON.parse(data);
      console.log(JSON.stringify(patient, null, 2));
      
      // Check specific fields
      console.log('\nAddress fields:');
      console.log('- address:', patient.address || 'NOT PRESENT');
      console.log('- city:', patient.city || 'NOT PRESENT');
      console.log('- state:', patient.state || 'NOT PRESENT');
      console.log('- zip:', patient.zip || 'NOT PRESENT');
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.end(); 