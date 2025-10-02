// ADD THIS TO YOUR EXISTING GOOGLE APPS SCRIPT
// Configuration - Add these at the top with your other config
const EONMEDS_API_URL = 'https://eonmeds-backend-production.up.railway.app/api/v1/tracking/import';
const EONMEDS_API_KEY = 'your-secure-api-key-here'; // Set this to match TRACKING_API_KEY in your backend

// ADD THIS NEW FUNCTION to send data to your database
function sendToEONMeds(trackingData) {
  try {
    const payload = {
      tracking_number: trackingData.trackingId,
      carrier: trackingData.carrier,
      recipient_name: trackingData.recipientName,
      delivery_address: trackingData.address,
      delivery_date: trackingData.deliveryDate,
      ship_date: trackingData.shipDate,
      weight: trackingData.weight,
      service: trackingData.service,
      status: trackingData.status
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-API-Key': EONMEDS_API_KEY
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(EONMEDS_API_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200 || responseCode === 201) {
      console.log(`✅ Sent to EONMeds: ${trackingData.trackingId}`);
      return true;
    } else {
      console.error(`❌ Failed to send to EONMeds: ${response.getContentText()}`);
      return false;
    }
  } catch (error) {
    console.error(`Error sending to EONMeds: ${error.toString()}`);
    return false;
  }
}

// MODIFY YOUR EXISTING addRowsToTop FUNCTION
// Add this after the existing code that adds rows to the sheet
function addRowsToTop(sheet, newRows) {
  if (newRows.length === 0) return;
  
  // ... YOUR EXISTING CODE TO ADD TO GOOGLE SHEETS ...
  
  // ADD THIS: Send each new tracking entry to EONMeds
  console.log('Sending tracking data to EONMeds database...');
  let sentCount = 0;
  
  newRows.forEach(data => {
    const success = sendToEONMeds(data);
    if (success) sentCount++;
  });
  
  console.log(`✅ Sent ${sentCount}/${newRows.length} tracking entries to EONMeds`);
}

// OPTIONAL: Add a function to sync all historical data
function syncAllTrackingToEONMeds() {
  const SPREADSHEET_ID = '1QjpQjMkDHXVjG8hcp6TEkbnXCQ7JewxTYpyvzAEbtlY';
  const SHEET_NAME = 'Tracking';
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    console.log('Sheet not found');
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    console.log('No data to sync');
    return;
  }
  
  // Get all data (skip header row)
  const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  let syncCount = 0;
  
  data.forEach((row, index) => {
    // Parse the tracking ID from hyperlink formula
    const trackingFormula = row[1].toString();
    const trackingMatch = trackingFormula.match(/([A-Z0-9]{12,})/i);
    
    if (trackingMatch) {
      const trackingData = {
        dateReceived: row[0],
        trackingId: trackingMatch[1],
        recipientName: row[2],
        deliveryDate: row[3],
        address: row[4],
        shipDate: row[5],
        weight: row[6],
        service: row[7],
        status: row[8] === 'Yes' ? 'Delivered' : 'In Transit',
        carrier: row[1].includes('fedex.com') ? 'FedEx' : 'UPS'
      };
      
      const success = sendToEONMeds(trackingData);
      if (success) syncCount++;
      
      // Add small delay to avoid overwhelming the API
      if (index % 10 === 0) {
        Utilities.sleep(1000); // 1 second pause every 10 records
      }
    }
  });
  
  console.log(`✅ Historical sync complete: ${syncCount}/${data.length} records sent to EONMeds`);
}

// ADD THIS TO YOUR MENU for easy one-time sync
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📦 Tracking System')
    .addItem('🔄 Refresh Now', 'manualRefresh')
    // ... your existing menu items ...
    .addSeparator()
    .addItem('🔄 Sync All to EONMeds Database', 'syncAllTrackingToEONMeds')
    .addItem('⚙️ Test EONMeds Connection', 'testEONMedsConnection')
    .addToUi();
}

// Test function to verify connection
function testEONMedsConnection() {
  const testData = {
    trackingId: 'TEST' + new Date().getTime(),
    carrier: 'FedEx',
    recipientName: 'Test Patient',
    address: '123 Test St',
    deliveryDate: new Date().toISOString(),
    status: 'Test'
  };
  
  const success = sendToEONMeds(testData);
  
  if (success) {
    SpreadsheetApp.getUi().alert('✅ Success!', 'Connection to EONMeds database is working!', SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert('❌ Failed', 'Could not connect to EONMeds. Check your API key and URL.', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
