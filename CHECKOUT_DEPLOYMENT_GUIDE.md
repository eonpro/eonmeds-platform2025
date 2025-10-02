# Checkout System Deployment Guide

## 🎯 Overview
This guide covers deploying the customer-facing checkout system to `checkout.eonpro.app`

## ✅ What's Been Built

### Frontend Components
- **CheckoutPage.tsx** - Full checkout form with Stripe Elements
  - 3 subscription plans (1, 3, 6 months)
  - Contact information collection
  - Shipping/billing address forms
  - Integrated Stripe card payment
  - Mobile responsive design

- **CheckoutSuccess.tsx** - Order confirmation page
  - Displays order details
  - Confirms payment processing
  - Next steps information

### Backend Endpoints
- `POST /api/v1/checkout/create-session` - Creates Stripe payment intent
- `POST /api/v1/checkout/confirm-payment` - Confirms payment & creates patient
- `GET /api/v1/checkout/order/:id` - Retrieves order details
- `POST /api/v1/checkout/validate-promo` - Validates promo codes

### Database Integration
- Automatically creates patient records on successful payment
- Links patients to Stripe customer IDs
- Creates invoice records for tracking

## 🚀 Deployment Steps

### 1. Environment Variables

Add these to your backend environment (.env or Railway/Vercel):

```bash
# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URL (for redirects)
FRONTEND_URL=https://checkout.eonpro.app

# Database (should already be configured)
DATABASE_URL=postgresql://...
```

Add to frontend environment:

```bash
# Frontend .env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
REACT_APP_API_URL=https://api.eonpro.app
```

### 2. Local Testing

```bash
# Start backend
cd packages/backend
npm run dev

# Start frontend (in new terminal)
cd packages/frontend
npm start

# Navigate to http://localhost:3001/checkout
```

### 3. Test Payment Flow

Use these Stripe test cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

Any future expiry date, any 3-digit CVC

### 4. Deploy to Production

#### Option A: Deploy as Subdomain (Recommended)

1. **Create new Railway/Vercel project** for checkout frontend
2. **Set build command**: `cd packages/frontend && npm run build`
3. **Set start command**: `cd packages/frontend && npm run start:prod`
4. **Configure domain**: checkout.eonpro.app
5. **Set environment variables** as listed above

#### Option B: Deploy to Existing Infrastructure

1. **Add to existing frontend deployment**
2. **Ensure /checkout route is publicly accessible**
3. **Update CORS settings** if needed

### 5. Configure Stripe Webhooks

In Stripe Dashboard:
1. Go to Developers → Webhooks
2. Add endpoint: `https://api.eonpro.app/api/v1/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`

### 6. DNS Configuration

Add to your DNS provider:

```
Type: CNAME
Name: checkout
Value: [your-deployment-url]
TTL: 3600
```

## 🧪 Testing Checklist

- [ ] Frontend loads at /checkout
- [ ] Stripe Elements appear and accept card input
- [ ] Plan selection updates pricing
- [ ] Form validation works
- [ ] Payment processes successfully with test card
- [ ] Success page shows order details
- [ ] Patient record created in database
- [ ] Invoice record created

## 📊 Monitoring

### Key Metrics to Track
- Checkout conversion rate
- Payment success rate
- Average order value
- Cart abandonment rate

### Error Monitoring
- Check browser console for JS errors
- Monitor backend logs for API errors
- Review Stripe Dashboard for payment failures

## 🔧 Troubleshooting

### Common Issues

**1. Stripe Elements not loading**
- Check REACT_APP_STRIPE_PUBLISHABLE_KEY is set
- Verify key starts with `pk_test_` (test mode) or `pk_live_` (production)

**2. Payment fails with "No such customer"**
- Backend Stripe key mismatch
- Check STRIPE_SECRET_KEY is correct

**3. CORS errors**
- Add checkout domain to backend CORS origins
- Verify API_URL in frontend points to correct backend

**4. Patient not created after payment**
- Check database connection
- Verify checkout/confirm-payment endpoint is called
- Check for errors in backend logs

## 📱 Mobile Considerations

The checkout is fully responsive and tested on:
- iOS Safari
- Android Chrome
- Desktop browsers

## 🔐 Security Notes

- All payment processing handled by Stripe (PCI compliant)
- No card details stored in database
- Patient data encrypted in transit (HTTPS)
- HIPAA compliance considerations addressed

## 📈 Next Steps

After successful deployment:

1. **Set up email notifications**
   - Order confirmation emails
   - Admin notifications for new orders

2. **Add analytics tracking**
   - Google Analytics events
   - Conversion tracking

3. **Implement additional features**
   - Coupon/discount codes
   - Subscription management
   - Order history

4. **Create admin dashboard**
   - View orders
   - Process refunds
   - Manage subscriptions

## 💡 Quick Commands

```bash
# Test checkout locally
curl -X POST http://localhost:3000/api/v1/checkout/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "p1",
    "plan_months": 1,
    "amount": 29900,
    "customer": {
      "email": "test@example.com",
      "first_name": "Test",
      "last_name": "User"
    }
  }'

# Check health
curl http://localhost:3000/health
```

## 📞 Support

For issues or questions:
- Check backend logs: `npm run dev`
- Check frontend console: Browser DevTools
- Review Stripe Dashboard for payment logs
- Contact: support@eonpro.app

---

**Last Updated**: December 2024
**Status**: ✅ Ready for Deployment
