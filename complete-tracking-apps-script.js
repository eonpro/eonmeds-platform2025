/**
 * EONMeds Tracking System - Google Apps Script
 * This script extracts tracking information from FedEx and UPS emails
 * and sends it to your EONMeds database
 */

// ===== CONFIGURATION =====
const EONMEDS_API_URL = 'https://eonmeds-platform2025-production.up.railway.app/api/v1/tracking/import';
const EONMEDS_API_KEY = '8f372a1ac2c1721be6c8549178cddeb56d3a690b8bd08be5fc14f3157c669f19';
const LABEL_NAME = 'Processed_Tracking_EONMeds';

// Search queries for both carriers
const FEDEX_QUERY = 'from:TrackingUpdates@fedex.com to:tracking@eonmedicalcenter.com';
const UPS_QUERY = 'from:mcinfo@ups.com to:tracking@eonmedicalcenter.com OR from:pkginfo@ups.com to:tracking@eonmedicalcenter.com OR subject:"UPS Delivery Notification"';

// ===== MAIN PROCESSING FUNCTION =====
function processTrackingEmails() {
  try {
    // Get or create the label for processed emails
    let label = GmailApp.getUserLabelByName(LABEL_NAME);
    if (!label) {
      label = GmailApp.createLabel(LABEL_NAME);
    }
    
    let totalProcessed = 0;
    
    // Process FedEx emails
    const fedexThreads = GmailApp.search(FEDEX_QUERY + ' -label:' + LABEL_NAME, 0, 50);
    console.log(`Found ${fedexThreads.length} unprocessed FedEx email threads`);
    totalProcessed += processCarrierEmails(fedexThreads, 'FedEx', label);
    
    // Process UPS emails
    const upsThreads = GmailApp.search(UPS_QUERY + ' -label:' + LABEL_NAME, 0, 50);
    console.log(`Found ${upsThreads.length} unprocessed UPS email threads`);
    totalProcessed += processCarrierEmails(upsThreads, 'UPS', label);
    
    console.log(`✅ Processing complete. Total processed: ${totalProcessed}`);
    
    // Show user notification if running manually
    if (totalProcessed > 0) {
      SpreadsheetApp.getActiveSpreadsheet()?.toast(
        `Processed ${totalProcessed} tracking emails`, 
        '✅ Success', 
        5
      );
    }
    
  } catch (error) {
    console.error(`Main error: ${error.toString()}`);
    throw error;
  }
}

// ===== PROCESS EMAILS BY CARRIER =====
function processCarrierEmails(threads, carrier, label) {
  let processedCount = 0;
  
  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const messages = thread.getMessages();
    
    for (let j = 0; j < messages.length; j++) {
      const message = messages[j];
      try {
        // Extract data based on carrier
        let trackingData;
        if (carrier === 'FedEx') {
          trackingData = extractFedExData(message);
        } else if (carrier === 'UPS') {
          trackingData = extractUPSData(message);
        }
        
        if (trackingData && trackingData.trackingId) {
          // Add carrier info
          trackingData.carrier = carrier;
          
          // Send to EONMeds API
          const success = sendToEONMeds(trackingData);
          if (success) {
            processedCount++;
            console.log(`✅ Processed ${carrier} tracking: ${trackingData.trackingId}`);
          }
        }
      } catch (error) {
        console.error(`Error processing ${carrier} message: ${error.toString()}`);
      }
    }
    
    // Mark thread as processed
    thread.addLabel(label);
  }
  
  return processedCount;
}

// ===== SEND DATA TO EONMEDS API =====
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

// ===== EXTRACT FEDEX DATA =====
function extractFedExData(message) {
  const htmlBody = message.getBody();
  const plainBody = message.getPlainBody();
  const dateReceived = message.getDate();
  
  const data = {
    dateReceived: Utilities.formatDate(dateReceived, Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss'),
    trackingId: '',
    recipientName: '',
    deliveryDate: '',
    address: '',
    shipDate: '',
    weight: '',
    service: '',
    status: 'In Transit'
  };
  
  // Extract tracking ID
  const trackingMatch = htmlBody.match(/Tracking ID[\s\S]*?<strong[^>]*>(\d+)<\/strong>/i) ||
                       htmlBody.match(/tracking.*?(\d{12,})/i) ||
                       htmlBody.match(/trknbr=(\d+)/i) ||
                       plainBody.match(/Tracking ID\s*:\s*(\d+)/i);
  if (trackingMatch) {
    data.trackingId = trackingMatch[1];
  }
  
  // Extract recipient information
  const toMatch = htmlBody.match(/To<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
  if (toMatch) {
    const toContent = toMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    
    const toLines = toContent.split('\n')
      .map(line => line.trim())
      .filter(line => line && line !== 'US');
    
    if (toLines.length > 0) {
      data.recipientName = toLines[0];
      if (toLines.length > 1) {
        const addressLines = toLines.slice(1).filter(line => line !== 'US' && line.length > 2);
        data.address = addressLines.join(', ');
      }
    }
  }
  
  // Extract delivery date
  const deliveryDateMatch = htmlBody.match(/Scheduled delivery date[\s\S]*?<p[^>]*>([^<]+)<\/p>/i) ||
                           htmlBody.match(/delivery.*?(\w+\s+\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (deliveryDateMatch) {
    data.deliveryDate = deliveryDateMatch[1].trim();
  }
  
  // Extract delivery time if available
  const deliveryTimeMatch = htmlBody.match(/Estimated between\s+([^<]+)/i);
  if (deliveryTimeMatch && data.deliveryDate) {
    data.deliveryDate += ' - ' + deliveryTimeMatch[1].trim();
  }
  
  // Check if delivered
  if (htmlBody.toLowerCase().includes('delivered') || plainBody.toLowerCase().includes('delivered')) {
    data.status = 'Delivered';
  }
  
  // Extract ship date
  const shipDateMatch = htmlBody.match(/Ship date<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>/i);
  if (shipDateMatch) {
    data.shipDate = shipDateMatch[1].trim();
  }
  
  // Extract weight
  const weightMatch = htmlBody.match(/Total shipment weight<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>/i);
  if (weightMatch) {
    data.weight = weightMatch[1].replace(/\s+/g, ' ').trim();
  }
  
  // Extract service
  const serviceMatch = htmlBody.match(/Service<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>/i);
  if (serviceMatch) {
    data.service = serviceMatch[1]
      .replace(/&reg;/g, '®')
      .replace(/&amp;/g, '&')
      .trim();
  }
  
  return data;
}

// ===== EXTRACT UPS DATA =====
function extractUPSData(message) {
  const htmlBody = message.getBody();
  const plainBody = message.getPlainBody();
  const dateReceived = message.getDate();
  
  const data = {
    dateReceived: Utilities.formatDate(dateReceived, Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss'),
    trackingId: '',
    recipientName: '',
    deliveryDate: '',
    address: '',
    shipDate: '',
    weight: '',
    service: '',
    status: 'In Transit'
  };
  
  // Extract tracking ID
  const subjectMatch = message.getSubject().match(/Tracking Number\s*([1Z][A-Z0-9]+)/i);
  if (subjectMatch) {
    data.trackingId = subjectMatch[1];
  } else {
    const trackingLinkMatch = htmlBody.match(/tracknum=([1Z][A-Z0-9]+)/i);
    if (trackingLinkMatch) {
      data.trackingId = trackingLinkMatch[1];
    } else {
      const plainMatch = plainBody.match(/Tracking Number:\s*([1Z][A-Z0-9]+)/i);
      if (plainMatch) {
        data.trackingId = plainMatch[1];
      }
    }
  }
  
  // Check if delivered
  if (htmlBody.includes('has been delivered') || plainBody.includes('has been delivered')) {
    data.status = 'Delivered';
    
    // Extract delivery date and time for delivered packages
    const deliveryDateMatch = htmlBody.match(/Delivery Date:[^<]*<\/[^>]+>[^<]*<[^>]+>([^<]+)</i) ||
                              plainBody.match(/Delivery Date:\s*([^\n]+)/i);
    const deliveryTimeMatch = htmlBody.match(/Delivery Time:[^<]*<\/[^>]+>[^<]*<[^>]+>([^<]+)</i) ||
                              plainBody.match(/Delivery Time:\s*([^\n]+)/i);
    
    if (deliveryDateMatch && deliveryTimeMatch) {
      data.deliveryDate = deliveryDateMatch[1].trim() + ' ' + deliveryTimeMatch[1].trim();
    } else if (deliveryDateMatch) {
      data.deliveryDate = deliveryDateMatch[1].trim();
    }
    
    // Extract "Left At" location
    const leftAtMatch = htmlBody.match(/Left At:[^<]*<\/[^>]+>[^<]*<[^>]+>([^<]+)</i) ||
                        plainBody.match(/Left At:\s*([^\n]+)/i);
    if (leftAtMatch) {
      data.deliveryDate += ' - Left at: ' + leftAtMatch[1].trim();
    }
  }
  
  // Extract Ship To (recipient and address)
  const shipToMatch = htmlBody.match(/Ship To:<\/strong><\/td><td[^>]*>([^<]+(?:<br>)?[^<]+(?:<br>)?[^<]+(?:<br>)?[^<]+)</i);
  if (shipToMatch) {
    const shipToContent = shipToMatch[1].replace(/<br>/gi, '|').split('|')
      .map(line => line.trim())
      .filter(line => line && line !== 'US');
    
    if (shipToContent.length > 0) {
      data.recipientName = shipToContent[0];
      if (shipToContent.length > 1) {
        data.address = shipToContent.slice(1).join(', ');
      }
    }
  } else {
    const plainShipMatch = plainBody.match(/Ship To:\s*([^\n]+)\n([^\n]+)/);
    if (plainShipMatch) {
      data.recipientName = plainShipMatch[1].trim();
      data.address = plainShipMatch[2].trim();
    }
  }
  
  // Extract weight
  const weightMatch = htmlBody.match(/Package Weight:<\/strong><\/td><td[^>]*>([^<]+)</i) ||
                      plainBody.match(/Package Weight:\s*([^\n]+)/i);
  if (weightMatch) {
    data.weight = weightMatch[1].trim();
  }
  
  // Extract service type
  const serviceMatch = htmlBody.match(/UPS Service:<\/strong><\/td><td[^>]*>([^<]+)</i) ||
                       plainBody.match(/UPS Service:\s*([^\n]+)/i);
  if (serviceMatch) {
    data.service = serviceMatch[1].replace(/&reg;/g, '®').replace(/&amp;/g, '&').trim();
  }
  
  return data;
}

// ===== MENU AND UI FUNCTIONS =====
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📦 EONMeds Tracking')
    .addItem('🔄 Process New Emails', 'processTrackingEmails')
    .addItem('📊 Show Status', 'showStatus')
    .addItem('🧪 Test Connection', 'testEONMedsConnection')
    .addSeparator()
    .addItem('⏰ Setup Auto-Processing', 'setupTrigger')
    .addItem('🛑 Stop Auto-Processing', 'removeTriggers')
    .addToUi();
}

// ===== SHOW CURRENT STATUS =====
function showStatus() {
  const ui = SpreadsheetApp.getUi();
  
  // Count unprocessed emails
  const fedexCount = GmailApp.search(FEDEX_QUERY + ' -label:' + LABEL_NAME, 0, 500).length;
  const upsCount = GmailApp.search(UPS_QUERY + ' -label:' + LABEL_NAME, 0, 500).length;
  
  // Check if trigger is set
  const triggers = ScriptApp.getProjectTriggers();
  const isAutoProcessing = triggers.some(t => t.getHandlerFunction() === 'processTrackingEmails');
  
  ui.alert(
    '📦 EONMeds Tracking Status',
    `Unprocessed Emails:\n` +
    `• FedEx: ${fedexCount}\n` +
    `• UPS: ${upsCount}\n\n` +
    `Auto-Processing: ${isAutoProcessing ? '✅ Active (every 10 min)' : '❌ Inactive'}\n` +
    `API Endpoint: ${EONMEDS_API_URL}`,
    ui.ButtonSet.OK
  );
}

// ===== TEST API CONNECTION =====
function testEONMedsConnection() {
  const ui = SpreadsheetApp.getUi();
  
  const testData = {
    trackingId: 'TEST' + new Date().getTime(),
    carrier: 'FedEx',
    recipientName: 'Test Patient',
    address: '123 Test St, Test City, ST 12345',
    deliveryDate: new Date().toISOString(),
    status: 'Test',
    service: 'Test Service',
    weight: '1.0 LB'
  };
  
  ui.alert('Testing...', 'Sending test data to EONMeds API...', ui.ButtonSet.OK);
  
  const success = sendToEONMeds(testData);
  
  if (success) {
    ui.alert(
      '✅ Success!', 
      'Connection to EONMeds API is working!\n\n' +
      'Test tracking number: ' + testData.trackingId + '\n' +
      'You can now process real tracking emails.',
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      '❌ Connection Failed', 
      'Could not connect to EONMeds API.\n\n' +
      'Please check:\n' +
      '1. API URL is correct\n' +
      '2. API key matches Railway environment variable\n' +
      '3. Backend service is deployed and running',
      ui.ButtonSet.OK
    );
  }
}

// ===== AUTOMATIC PROCESSING SETUP =====
function setupTrigger() {
  // Remove existing triggers
  removeTriggers();
  
  // Create new trigger to run every 10 minutes
  ScriptApp.newTrigger('processTrackingEmails')
    .timeBased()
    .everyMinutes(10)
    .create();
  
  SpreadsheetApp.getUi().alert(
    '✅ Auto-Processing Enabled',
    'Tracking emails will be processed automatically every 10 minutes.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processTrackingEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

// ===== PROCESS RECENT EMAILS ONLY =====
function processRecentEmails() {
  // Process only emails from last 2 days
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const dateString = Utilities.formatDate(twoDaysAgo, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  
  try {
    let label = GmailApp.getUserLabelByName(LABEL_NAME);
    if (!label) {
      label = GmailApp.createLabel(LABEL_NAME);
    }
    
    let totalProcessed = 0;
    
    // Process recent FedEx emails
    const fedexQuery = FEDEX_QUERY + ' after:' + dateString + ' -label:' + LABEL_NAME;
    const fedexThreads = GmailApp.search(fedexQuery, 0, 30);
    totalProcessed += processCarrierEmails(fedexThreads, 'FedEx', label);
    
    // Process recent UPS emails
    const upsQuery = UPS_QUERY + ' after:' + dateString + ' -label:' + LABEL_NAME;
    const upsThreads = GmailApp.search(upsQuery, 0, 30);
    totalProcessed += processCarrierEmails(upsThreads, 'UPS', label);
    
    console.log(`✅ Recent emails processed: ${totalProcessed}`);
    
  } catch (error) {
    console.error(`Error processing recent emails: ${error.toString()}`);
  }
}

// ===== INITIAL SETUP MESSAGE =====
function showSetupInstructions() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '🚀 EONMeds Tracking Setup',
    'Welcome to EONMeds Tracking System!\n\n' +
    'To get started:\n' +
    '1. Click "📦 EONMeds Tracking" menu\n' +
    '2. Select "🧪 Test Connection"\n' +
    '3. If successful, select "🔄 Process New Emails"\n' +
    '4. Optionally, setup auto-processing\n\n' +
    'Your tracking data will be sent directly to EONMeds!',
    ui.ButtonSet.OK
  );
}
