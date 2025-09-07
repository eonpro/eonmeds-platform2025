# 🔑 Fix OpenAI API Key for BECCA AI

## The Problem
The SOAP Notes AI feature (BECCA AI) is showing: **"401 Incorrect API key provided: sk-proj-"**

This means the OpenAI API key is either:
- Not set in App Runner
- Set incorrectly
- Stored in AWS Secrets Manager but not accessible

---

## ✅ Quick Fix (5 minutes)

### Step 1: Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Log in to your OpenAI account
3. Create a new API key or use an existing one
4. Copy the key (starts with `sk-`)

### Step 2: Add to App Runner

1. **Go to AWS App Runner Console**
   - https://console.aws.amazon.com/apprunner
   - Select `eonmeds-backend-staging`

2. **Click "Configuration" tab**

3. **Click "Edit configuration"**

4. **Add or Update Environment Variable:**
   ```
   OPENAI_API_KEY = sk-[your-actual-api-key-here]
   ```

5. **Click "Apply changes"**

6. **Wait 3-5 minutes for deployment**

---

## 🔐 Alternative: Use AWS Secrets Manager (More Secure)

If you want to keep the API key secure:

### Step 1: Store in Secrets Manager
```bash
aws secretsmanager create-secret \
  --name /eonmeds/api/openai \
  --secret-string '{"apiKey":"sk-your-actual-key-here"}' \
  --region us-east-1
```

### Step 2: Update App Runner to Reference Secret
In App Runner configuration, under Runtime Environment Secrets:
```
OPENAI_API_KEY = arn:aws:secretsmanager:us-east-1:148534177795:secret:/eonmeds/api/openai:apiKey::
```

---

## 🧪 Test After Deployment

Once deployed, test the SOAP Notes feature:

1. Go to any patient profile
2. Click on "SOAP Notes" tab
3. Click "Generate SOAP Note with BECCA AI"
4. It should now work!

---

## 📋 Current Configuration

Looking at your backend code:
- The AI service expects: `process.env.OPENAI_API_KEY`
- It's used in: `packages/backend/src/services/ai.service.ts`
- The error "sk-proj-" suggests a truncated or placeholder key

---

## ⚠️ Important Notes

1. **API Key Format**: Should start with `sk-` and be about 50 characters long
2. **Billing**: Make sure your OpenAI account has billing set up
3. **Rate Limits**: New API keys might have initial rate limits
4. **Model Access**: Ensure your API key has access to the GPT model being used

---

## 🚀 Quick Terminal Check

After updating, you can verify it's working:

```bash
curl -X POST https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/ai/generate-soap/P1636 \
  -H "Authorization: Bearer [your-auth-token]" \
  -H "Content-Type: application/json"
```

If it returns a SOAP note instead of an error, it's working!

---

## Need an OpenAI API Key?

1. Go to: https://platform.openai.com/signup
2. Create an account (if needed)
3. Add billing information
4. Generate an API key
5. Use the key in App Runner configuration

The BECCA AI feature will work once the correct API key is configured!
