# 🚀 Stripe Live Deployment Configuration

## ✅ Configuration Complete!

Your application is now configured with **LIVE** Stripe keys:

### Backend (.env)

```bash
STRIPE_SECRET_KEY=sk_live_51RPS5N...yoPT  # ✅ Live Secret Key
STRIPE_WEBHOOK_SECRET=whsec_3l3mCp...GGYv  # ✅ Webhook Secret
```

### Frontend (.env)

```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_51RPS5N...ziwy  # ✅ Live Publishable Key
```

## ⚠️ IMPORTANT: You Are Now in LIVE MODE

This means:

- 💰 **Real money** will be processed
- 💳 **Real credit cards** will be charged
- 📊 All transactions appear in your **live Stripe dashboard**
- 🔐 Use production-level security practices

## 🚀 Deployment to Railway

Make sure to add these environment variables to Railway:

1. Go to your Railway project
2. Navigate to Variables tab
3. Add:
   - `STRIPE_SECRET_KEY` = Your live secret key
   - `STRIPE_WEBHOOK_SECRET` = Your webhook secret
   - For frontend service: `REACT_APP_STRIPE_PUBLISHABLE_KEY` = Your publishable key

## 🧪 Testing Live Payments

1. **Start Small**: Use a real card but charge a small amount first ($1-5)
2. **Check Dashboard**: Verify the payment appears in your Stripe dashboard
3. **Test Refunds**: Make sure you can refund from Stripe dashboard
4. **Monitor Webhooks**: Check webhook logs in Stripe dashboard

## 📱 Payment Flow

1. Customer enters real card details
2. Payment is processed through Stripe
3. Money goes to your Stripe account
4. Webhook confirms payment status
5. Invoice is marked as paid

## 🔒 Security Reminders

- Never commit `.env` files to git
- Keep your secret keys secure
- Use HTTPS in production
- Validate all webhook signatures
- Monitor for suspicious activity

## 💡 Quick Commands

Check if Stripe is working:

```bash
curl http://localhost:3002/api/health
```

Test a payment (use a real card):

```bash
# From the UI, create an invoice and pay it
# Or use the API endpoints directly
```

## 📞 Support

- Stripe Dashboard: https://dashboard.stripe.com/
- Stripe Support: https://support.stripe.com/
- API Docs: https://stripe.com/docs
