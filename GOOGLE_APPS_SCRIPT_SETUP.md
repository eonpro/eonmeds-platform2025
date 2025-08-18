# EONMeds Tracking - Google Apps Script Setup Guide

## Quick Start (5 Minutes)

### Step 1: Create New Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click **"New project"**
3. Name it: **"EONMeds Tracking System"**

### Step 2: Copy the Script

1. Delete all the default code
2. Copy ALL the code from `complete-tracking-apps-script.js`
3. Paste it into the script editor
4. Click **💾 Save** (Ctrl+S or Cmd+S)

### Step 3: First Run Authorization

1. Click **▶️ Run** button at the top
2. Select function: **`showSetupInstructions`**
3. Click **Run**
4. You'll see "Authorization required" - Click **Review permissions**
5. Choose your Google account
6. Click **Advanced** → **Go to EONMeds Tracking System (unsafe)**
7. Click **Allow**

### Step 4: Test the Connection

1. After authorization, run the script again
2. Go to any Google Sheet (or create a new one)
3. Refresh the page
4. You'll see a new menu: **📦 EONMeds Tracking**
5. Click **📦 EONMeds Tracking** → **🧪 Test Connection**
6. You should see "✅ Success! Connection to EONMeds API is working!"

### Step 5: Process Your First Emails

1. Click **📦 EONMeds Tracking** → **🔄 Process New Emails**
2. The script will:
   - Find unprocessed FedEx/UPS emails
   - Extract tracking information
   - Send to your EONMeds database
   - Mark emails as processed

### Step 6: Set Up Automatic Processing (Optional)

1. Click **📦 EONMeds Tracking** → **⏰ Setup Auto-Processing**
2. Emails will now be processed automatically every 10 minutes

## What This Script Does

- ✅ **Reads** FedEx and UPS tracking emails from `tracking@eonmedicalcenter.com`
- ✅ **Extracts** all tracking information (number, recipient, address, dates, etc.)
- ✅ **Sends** data to your EONMeds database via API
- ✅ **Labels** processed emails to avoid duplicates
- ✅ **Runs** automatically every 10 minutes (if enabled)

## Menu Options Explained

- **🔄 Process New Emails** - Manually process any unprocessed tracking emails
- **📊 Show Status** - See how many emails are waiting and if auto-processing is on
- **🧪 Test Connection** - Verify the API connection is working
- **⏰ Setup Auto-Processing** - Enable automatic processing every 10 minutes
- **🛑 Stop Auto-Processing** - Disable automatic processing

## Troubleshooting

### "Connection Failed" Error
1. Check that your backend is deployed to Railway
2. Verify the API URL in the script matches your Railway backend URL
3. Ensure TRACKING_API_KEY in Railway matches the key in the script

### No Emails Found
1. Check that tracking emails are going to `tracking@eonmedicalcenter.com`
2. Remove the label "Processed_Tracking_EONMeds" from some test emails to reprocess them

### Authorization Issues
1. Make sure you're logged into the correct Google account
2. The account needs access to the Gmail with tracking emails

## How It Works

```
FedEx/UPS Email Arrives
         ↓
Google Apps Script Detects
         ↓
Extracts Tracking Info
         ↓
Sends to EONMeds API
         ↓
Stored in Database
         ↓
Email Marked as Processed
```

## Security Notes

- The API key is stored in the script (only you can see it)
- Emails are only read, never deleted or modified
- Processed emails are labeled for tracking
- All data is sent securely to your Railway backend

## Need Help?

If you see any errors:
1. Click **View** → **Logs** in the script editor
2. Check for error messages
3. The most common issue is the API connection - use Test Connection to verify

That's it! Your tracking system is now connected to EONMeds! 🎉
