# Tracking System Setup Instructions

## Overview
Since you already have a beautiful tracking dashboard, you DON'T need N8N for basic tracking functionality. This guide shows you how to connect your existing Google Apps Script directly to your EONMeds database.

## Step 1: Set Up Your Database

Run this SQL in your AWS RDS database:

```sql
-- Run the migration file we created:
-- packages/backend/src/migrations/create-tracking-tables.sql
```

## Step 2: Configure Your Backend

1. Add this environment variable to Railway backend service:
   ```
   TRACKING_API_KEY=generate-a-secure-random-key-here
   ```

2. Deploy the backend with the new tracking routes we added

## Step 3: Update Your Google Apps Script

1. Open your Google Apps Script
2. Add the code from `google-apps-script-modifications.js`
3. Update these constants at the top:
   ```javascript
   const EONMEDS_API_URL = 'https://your-backend-url.railway.app/api/v1/tracking/import';
   const EONMEDS_API_KEY = 'same-key-as-TRACKING_API_KEY-env-var';
   ```

4. Test the connection using the menu: "📦 Tracking System" → "⚙️ Test EONMeds Connection"

## Step 4: Update Your Tracking Dashboard

Modify your dashboard to read from the new API endpoints instead of Google Sheets:

```javascript
// Instead of reading from Google Sheets
// Use these API endpoints:

// Search tracking
GET /api/v1/tracking/search?q=883665326721

// Get all tracking with pagination
GET /api/v1/tracking/search?page=1&limit=50

// Get tracking for specific patient
GET /api/v1/tracking/patient/123
```

## Step 5: One-Time Historical Data Import

1. In Google Sheets, click "📦 Tracking System" → "🔄 Sync All to EONMeds Database"
2. This will send all your existing tracking data to the database

## That's It! 🎉

Your tracking system now:
- ✅ Stores data in your AWS RDS database
- ✅ Keeps Google Sheets as backup
- ✅ Works with your existing dashboard
- ✅ No N8N required for basic functionality

## When You Might Want N8N Later

Consider N8N in the future if you want:
- Automatic patient matching (link tracking to patient records)
- SMS/Email notifications when packages arrive
- Complex workflows (update inventory when delivered)
- Integration with other systems

## Troubleshooting

### "Invalid API Key" Error
- Check that TRACKING_API_KEY in Railway matches EONMEDS_API_KEY in Google Apps Script

### "Failed to import tracking data" Error
- Check Railway logs for the backend service
- Ensure the database tables were created
- Verify your backend URL is correct

### Dashboard Not Showing Data
- Update your dashboard to use the new API endpoints
- Check browser console for errors
- Ensure you're authenticated
