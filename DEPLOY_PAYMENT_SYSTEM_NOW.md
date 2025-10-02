# 🚀 Deploy Payment System - FINAL STEPS!

## ✅ Step 1: Stripe Key - DONE!
Your Stripe key is now configured correctly!

## 📦 Step 2: Deploy Backend with Payment Routes

### Quick Deploy Option (Recommended)
In your AWS App Runner console (where you just were):

1. **Click "Deploy" button** at the top right
   - This will trigger a new deployment with your updated environment variables

2. **Wait for deployment** (5-10 minutes)
   - Status will change from "Operation in progress" to "Running"
   - The new payment routes will be activated

### OR Manual Redeploy via Terminal
```bash
# If you prefer command line:
cd packages/backend

# Build and push new Docker image
docker build -t eonmeds-backend .
docker tag eonmeds-backend:latest 147997129811.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:latest
docker push 147997129811.dkr.ecr.us-east-1.amazonaws.com/eonmeds-backend:latest

# App Runner will auto-deploy the new image
```

## 🧪 Step 3: Test Payment System

Once deployed, test these endpoints:

### 1. Create Test Invoice
```bash
# First, let's create a test invoice (you'll need an Auth0 token)
curl -X POST https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/invoices \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "test-patient-001",
    "dueDate": "2025-02-28",
    "lineItems": [
      {
        "description": "Consultation",
        "quantity": 1,
        "unitPrice": 150.00
      }
    ]
  }'

# Save the invoice ID and number from response
```

### 2. Generate Payment Link
```bash
# Replace INVOICE_ID with actual ID
curl -X POST https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/invoices/INVOICE_ID/payment-link \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# You'll get a payment link like: https://pay.eonmeds.com/INV-00001
```

### 3. Test Public Payment Page
```bash
# Test public invoice endpoint (no auth needed)
curl https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/public/invoice/INV-00001

# Should return invoice details
```

### 4. Create Stripe Checkout Session
```bash
# Test Stripe integration
curl -X POST https://qm6dnecfhp.us-east-1.awsapprunner.com/api/v1/public/invoice/INV-00001/checkout

# Should return:
# {
#   "sessionId": "cs_test_...",
#   "checkoutUrl": "https://checkout.stripe.com/..."
# }
```

## ✅ Success Indicators

Your payment system is working when:

1. ✅ `/api/v1/public/invoice/XXX` returns invoice data
2. ✅ `/checkout` endpoint creates Stripe session
3. ✅ `/payment-intent` creates payment intent
4. ✅ Payment links are generated successfully

## 🎯 Quick Test with Stripe

Use these test cards:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0025 0000 3155

## 📱 Frontend Payment Page

The payment page is ready at:
```
https://d3p4f8m2bxony8.cloudfront.net/invoice/payment/INV-00001
```

But you'll need to add the route to your React app:
```javascript
// In App.tsx or Routes
<Route path="/invoice/payment/:invoiceNumber" element={<InvoicePayment />} />
```

## 🔥 What Happens After Deploy

Once deployed, your patients can:
1. Receive invoice with payment link
2. Click link → See invoice details
3. Click "Pay Now" → Enter card
4. Payment processed → Invoice marked paid
5. Receive confirmation

## 💡 Pro Tips

1. **Monitor deployment** in App Runner console
2. **Check logs** if any issues arise
3. **Test with small amounts** first
4. **Use Stripe Dashboard** to see payments

## 📞 If You Need Help

Common issues:
- **404 on public routes** → Deployment not complete
- **Stripe error** → Check key format (should start with sk_live_)
- **CORS error** → Frontend URL needs to be in CORS_ORIGINS

---

**Your payment system is ONE DEPLOY away from being LIVE!** 🚀

Click that Deploy button and let's start collecting payments! 💰
