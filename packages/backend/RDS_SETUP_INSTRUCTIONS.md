# 🚀 RDS Database Setup Instructions

## Current Status
- ✅ RDS instance is running
- ✅ TypeScript compilation errors fixed
- ✅ Database configuration retrieved from AWS
- ❌ Backend still trying to connect to localhost
- ❌ No tables created yet

## Step 1: Update Your .env File

**IMPORTANT**: You need to manually add the RDS credentials to your `.env` file.

1. Open `packages/backend/.env` in your text editor
2. Add these lines:

```env
# RDS Database Configuration
DB_HOST=eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=eonmeds
DB_USER=eonmeds_admin
DB_PASSWORD=.S:wbEHBnOcnqlyFa9[RxnMC99]I
DB_SSL=true

# HeyFlow Webhook Secret
HEYFLOW_WEBHOOK_SECRET=test-webhook-secret-2025
```

## Step 2: Test Database Connection

Run this command to verify your connection:

```bash
node test-rds-connection.js
```

You should see:
- ✅ Successfully connected to RDS!
- Database info and version
- List of tables (likely empty)

## Step 3: Restart Backend

Once the connection test passes:

```bash
npm run dev
```

The backend should now start without errors!

## Step 4: Create Database Tables

Run the schema to create all necessary tables:

```bash
psql "postgresql://eonmeds_admin:.S:wbEHBnOcnqlyFa9[RxnMC99]I@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds?sslmode=require" -f src/config/schema.sql
```

Or use a GUI tool like TablePlus/pgAdmin with these credentials.

## Step 5: Test HeyFlow Webhook

Once everything is running:
1. Go to HeyFlow and click "Test" on your webhook
2. Check backend logs - you should see NO database errors
3. Patient data will be saved to the database!

## Troubleshooting

### Connection Refused
- Make sure you copied ALL the environment variables
- Check your IP is in the security group (currently allows 75.220.8.116/32)

### Password Authentication Failed
- Double-check the password in .env matches exactly
- Special characters in password need to be preserved

### SSL Error
- Make sure `DB_SSL=true` is set
- The connection uses SSL for security

## Success Indicators
- Backend runs without TypeScript errors ✅
- No "ECONNREFUSED" errors in logs ✅
- HeyFlow webhook returns 200 OK ✅
- Patient data appears in database ✅ 