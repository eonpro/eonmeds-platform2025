# HeyFlow Webhook Integration Setup Guide

## Overview
This guide explains how to set up and test the HeyFlow webhook integration for patient intake forms.

## Prerequisites
1. Backend server running on port 3002
2. PostgreSQL database (local or AWS RDS)
3. HeyFlow account with form created
4. Access to modify .env file

## Setup Steps

### 1. Environment Configuration
Add the following to your `packages/backend/.env` file:

```bash
# HeyFlow Integration
HEYFLOW_WEBHOOK_SECRET=your-webhook-secret-here

# Database Configuration (if not already set)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eonmeds
DB_USER=postgres
DB_PASSWORD=your-password
```

### 2. Database Setup
Run the database migrations to create required tables:

```bash
# Connect to your PostgreSQL database
psql -U postgres -d eonmeds

# Run the schema file
\i packages/backend/src/config/schema.sql
```

Or if using AWS RDS:
```bash
psql -h your-rds-endpoint.region.rds.amazonaws.com -U postgres -d eonmeds -f packages/backend/src/config/schema.sql
```

### 3. Restart Backend Server
After updating .env, restart the backend:
```bash
cd packages/backend
npm run dev
```

### 4. Test Webhook Locally
Use the provided test script:
```bash
cd packages/backend
HEYFLOW_WEBHOOK_SECRET=your-webhook-secret-here node test-webhook.js
```

### 5. Configure HeyFlow Dashboard
1. Log into HeyFlow dashboard
2. Navigate to your form settings
3. Go to Integrations → Webhooks
4. Add new webhook with:
   - URL: `https://your-domain.com/api/v1/webhooks/heyflow`
   - Events: Form Submission
   - Secret: Same value as HEYFLOW_WEBHOOK_SECRET

For local testing with ngrok:
```bash
ngrok http 3002
# Use the ngrok URL + /api/v1/webhooks/heyflow
```

## Webhook Payload Structure

### Expected Fields from HeyFlow Form:
```javascript
{
  "webhookId": "unique-webhook-id",
  "eventType": "form.submitted",
  "timestamp": "ISO-8601-date",
  "form": {
    "id": "form_weight_loss_v2",
    "name": "Weight Loss Consultation",
    "version": "2.0",
    "language": "es"
  },
  "submission": {
    "id": "submission-id",
    "fields": {
      // Personal Information
      "first_name": "string",
      "last_name": "string",
      "email": "string",
      "phone": "string",
      "date_of_birth": "YYYY-MM-DD",
      "gender": "string",
      
      // Physical Information
      "height_feet": number,
      "height_inches": number,
      "weight_lbs": number,
      
      // Medical Information
      "medical_conditions": ["array"],
      "current_medications": ["array"],
      "allergies": ["array"],
      
      // Consent
      "consent_treatment": boolean,
      "consent_telehealth": boolean,
      
      // Form-specific fields...
    }
  }
}
```

## Security Features

### HMAC Signature Verification
- All webhooks are verified using HMAC-SHA256
- Signature sent in `x-heyflow-signature` header
- Timing-safe comparison prevents timing attacks

### Data Protection
- Raw webhooks stored in `webhook_events` table
- Patient data encrypted at rest (if using RDS encryption)
- All access logged for HIPAA compliance

## Monitoring & Debugging

### Check Webhook Health
```bash
curl http://localhost:3000/api/v1/webhooks/health
```

### View Recent Webhooks (SQL)
```sql
-- View recent webhook events
SELECT id, webhook_id, event_type, processed, error_message, created_at 
FROM webhook_events 
ORDER BY created_at DESC 
LIMIT 10;

-- View recent patients
SELECT id, first_name, last_name, email, form_type, status, created_at 
FROM patients 
ORDER BY created_at DESC 
LIMIT 10;
```

### Common Issues

1. **401 Unauthorized**
   - Check HEYFLOW_WEBHOOK_SECRET in .env matches HeyFlow dashboard
   - Ensure x-heyflow-signature header is present

2. **Database Connection Failed**
   - Verify database credentials in .env
   - Check if database tables exist (run schema.sql)
   - For RDS: Check security group allows your IP

3. **500 Internal Server Error**
   - Check backend logs for specific error
   - Verify all required fields are in payload
   - Check database constraints aren't violated

## Production Considerations

1. **Use HTTPS** - Webhooks should only be sent over HTTPS
2. **IP Whitelisting** - Consider restricting webhook endpoint to HeyFlow IPs
3. **Rate Limiting** - Implement rate limiting to prevent abuse
4. **Queue Processing** - Move to async processing for scale
5. **Monitoring** - Set up alerts for webhook failures
6. **Backup Strategy** - Keep raw webhook payloads for recovery

## Next Steps

After successful webhook setup:
1. Create patient dashboard to view submissions
2. Implement email notifications for new patients
3. Set up Stripe subscription creation
4. Add more form types (testosterone, etc.)
5. Create webhook analytics dashboard 