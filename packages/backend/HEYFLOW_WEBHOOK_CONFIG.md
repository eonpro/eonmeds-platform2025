# HeyFlow Webhook Configuration

## Your Webhook Details

**Webhook URL**: `https://c72a671932eb.ngrok-free.app/api/v1/webhooks/heyflow`

**Note**: This URL is temporary and will change each time you restart ngrok. For production, you'll need a permanent domain.

## Setup Instructions

### 1. Configure HeyFlow Dashboard

1. Log into HeyFlow: https://app.heyflow.com
2. Select your form
3. Go to: **Settings** → **Integrations** → **Webhooks**
4. Click **"Add Webhook"**
5. Configure with:
   - **Webhook URL**: `https://c72a671932eb.ngrok-free.app/api/v1/webhooks/heyflow`
   - **Request Method**: POST
   - **Trigger**: On form submission
   - **Include form data**: Yes
   - **Signature Secret**: Generate a secure secret (e.g., `hf_webhook_secret_2025_eonmeds`)

### 2. Update Your Backend Configuration

Add the secret from HeyFlow to your `packages/backend/.env` file:

```bash
# HeyFlow Integration
HEYFLOW_WEBHOOK_SECRET=hf_webhook_secret_2025_eonmeds
```

### 3. Restart Your Backend

After adding the environment variable:
```bash
cd packages/backend
# Stop the server (Ctrl+C) and restart
npm run dev
```

### 4. Test the Integration

1. Submit a test form on HeyFlow
2. Check your backend logs for the webhook receipt
3. Verify data in your database (if connected)

## Testing with curl

You can also test manually:
```bash
cd packages/backend
HEYFLOW_WEBHOOK_SECRET=your-secret-here node test-webhook.js
```

## Monitoring

- **Ngrok Inspector**: http://localhost:4040
- **Backend Logs**: Check your terminal running the backend
- **Webhook Health**: GET https://c72a671932eb.ngrok-free.app/api/v1/webhooks/health

## Troubleshooting

If webhooks aren't working:

1. **Check ngrok is running**: The URL should respond
2. **Verify the secret**: Must match in both HeyFlow and .env
3. **Check backend logs**: Look for "Missing signature" or other errors
4. **Test with curl**: Use the test script to isolate issues

## Production Setup

For production, replace the ngrok URL with your actual domain:
- `https://api.eonmeds.com/api/v1/webhooks/heyflow`

Remember to:
- Use HTTPS only
- Keep your webhook secret secure
- Set up monitoring for failed webhooks
- Implement retry logic for reliability 