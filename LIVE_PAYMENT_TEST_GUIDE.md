# 💳 Testing Your First Live Payment

## ⚡ Quick Start

Your application is now configured for **LIVE PAYMENTS**! Here's how to test:

### 1. Access Your Application

- Frontend: http://localhost:3000
- Backend: http://localhost:3002

### 2. Create a Test Invoice

1. Go to **Clients** section
2. Select a client or create a new one
3. Click **"Create Invoice"**
4. Add a small amount (recommended: $1-5 for testing)
5. Add a service item
6. Save the invoice

### 3. Process the Payment

1. Click **"Pay Invoice"** button
2. You'll see the payment modal
3. **IMPORTANT**: You'll need to use a real credit card
4. Enter your card details:
   - Card Number: Your actual credit card
   - Expiry: MM/YY
   - CVC: 3-digit code
   - ZIP: Your billing ZIP code

### 4. Verify the Payment

After successful payment:

- ✅ Invoice status changes to "Paid"
- ✅ Payment appears in your Stripe Dashboard
- ✅ Customer receives email receipt (if configured)

### 5. Check Stripe Dashboard

1. Go to https://dashboard.stripe.com/
2. Look for your payment in the **Payments** section
3. Verify the amount and customer details

## ⚠️ Important Reminders

- **This is LIVE mode** - Real money will be charged
- **Start small** - Test with $1-5 first
- **Use your own card** for testing
- **Refunds** can be done from Stripe Dashboard

## 🧪 Test Scenarios

### Basic Payment Flow:

1. Create invoice → Pay → Verify in Stripe

### Card Management:

1. Go to client profile → Cards tab
2. Add a payment method
3. Use saved card for future payments

### Error Handling:

- Try insufficient funds (if you have a test card)
- Try incorrect CVC
- Verify error messages display properly

## 🚨 Troubleshooting

### Payment Fails:

- Check browser console for errors
- Verify Stripe keys are loaded
- Check backend logs

### Backend Not Loading Stripe:

```bash
cd packages/backend
grep STRIPE .env  # Should show your keys
npm run dev       # Restart backend
```

### Frontend Not Loading Stripe:

```bash
cd packages/frontend
grep STRIPE .env  # Should show publishable key
npm start        # Restart frontend
```

## 📞 Support

- Stripe Dashboard: https://dashboard.stripe.com/
- Stripe Support: https://support.stripe.com/
