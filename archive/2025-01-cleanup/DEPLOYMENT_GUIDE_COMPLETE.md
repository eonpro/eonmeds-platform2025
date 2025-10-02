# 🚀 Complete Deployment Guide - EonMeds Billing System

## Prerequisites Checklist

Before deploying, ensure you have:
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database (local or cloud)
- [ ] Stripe account (test and live keys)
- [ ] Railway account (or your preferred hosting)
- [ ] SendGrid account for emails
- [ ] Domain name configured

---

## 📋 Step 1: Environment Setup

### 1.1 Create Environment Files

Create `.env` in the root directory:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/eonmeds_billing

# Stripe
STRIPE_SECRET_KEY=sk_test_... # Use test key for development
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Auth0
AUTH0_SECRET=your-auth0-secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Email
SENDGRID_API_KEY=SG...
EMAIL_FROM=billing@yourdomain.com

# App
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 1.2 Install Dependencies

```bash
# Root directory
npm install

# Install all package dependencies
npm run bootstrap
```

---

## 📦 Step 2: Database Setup

### 2.1 Create Database

```bash
# If using local PostgreSQL
createdb eonmeds_billing

# Or use existing database URL
```

### 2.2 Run Migrations

```bash
cd packages/backend

# Run all billing system migrations
npm run migrate:all

# This will create tables for:
# - Core billing (invoices, payments, plans)
# - Enterprise features (webhooks, tax, multi-currency)
# - Fraud detection
# - Reconciliation
# - Audit logs
```

### 2.3 Seed Demo Data (Optional)

```bash
# Create sample data for testing
npm run seed:demo
```

---

## 🏗️ Step 3: Build the System

### 3.1 Build Backend

```bash
cd packages/backend
npm run build
```

### 3.2 Build Frontend

```bash
cd packages/frontend

# Update API URL in config
echo "REACT_APP_API_URL=https://your-api-url.com" > .env.production

# Build production bundle
npm run build
```

---

## 🧪 Step 4: Local Testing

### 4.1 Start Backend

```bash
cd packages/backend
npm run dev
# Backend runs on http://localhost:5000
```

### 4.2 Start Frontend

```bash
cd packages/frontend
npm start
# Frontend runs on http://localhost:3000
```

### 4.3 Test Key Features

1. Navigate to http://localhost:3000/billing-demo
2. Test payment processing with Stripe test cards:
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002
3. Verify insurance eligibility checker
4. Test invoice creation
5. Check AI assistant functionality

---

## 🚄 Step 5: Deploy to Railway

### 5.1 Prepare Railway Configuration

Create `railway.json` in root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 5.2 Deploy Backend

```bash
cd packages/backend

# Login to Railway
railway login

# Create new project
railway init

# Link to existing project (if applicable)
railway link

# Set environment variables
railway variables set DATABASE_URL=$DATABASE_URL
railway variables set STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
railway variables set NODE_ENV=production

# Deploy
railway up

# Note the deployment URL
# Example: https://eonmeds-backend.up.railway.app
```

### 5.3 Deploy Frontend

```bash
cd packages/frontend

# Create new Railway project for frontend
railway init

# Set backend URL
railway variables set REACT_APP_API_URL=https://your-backend-url.up.railway.app

# Deploy
railway up

# Your frontend URL will be provided
# Example: https://eonmeds-frontend.up.railway.app
```

---

## ⚡ Step 6: Configure Webhooks

### 6.1 Stripe Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-backend-url/api/webhooks/stripe`
3. Select events:
   - payment_intent.succeeded
   - payment_intent.failed
   - invoice.paid
   - invoice.payment_failed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted

4. Copy webhook secret and update Railway:
```bash
railway variables set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 6.2 Configure CORS

Update backend environment:
```bash
railway variables set FRONTEND_URL=https://your-frontend-url.up.railway.app
```

---

## 🔐 Step 7: Security Configuration

### 7.1 SSL/HTTPS
Railway provides SSL automatically. For custom domains:

```bash
# Add custom domain
railway domain add yourdomain.com

# Configure DNS (add CNAME record)
# Point to: your-app.up.railway.app
```

### 7.2 Environment Security

```bash
# Set production secrets
railway variables set AUTH0_SECRET=$(openssl rand -hex 32)
railway variables set SESSION_SECRET=$(openssl rand -hex 32)
```

---

## 📊 Step 8: Monitoring Setup

### 8.1 Enable Logging

```bash
# Set log level
railway variables set LOG_LEVEL=info

# Enable detailed error logging
railway variables set SENTRY_DSN=your-sentry-dsn # Optional
```

### 8.2 Health Checks

The system includes health check endpoints:
- Backend: `https://your-backend/health`
- Frontend: `https://your-frontend/`

---

## ✅ Step 9: Post-Deployment Checklist

### 9.1 Verify Core Features

- [ ] User authentication working
- [ ] Payment processing functional
- [ ] Invoice creation and sending
- [ ] Insurance verification active
- [ ] Fraud detection running
- [ ] Reconciliation operational
- [ ] AI assistant responding

### 9.2 Configure Admin Access

1. Log in as admin
2. Navigate to Settings
3. Configure:
   - Tax rates for your region
   - Default payment terms
   - Invoice templates
   - Email templates
   - User roles and permissions

### 9.3 Test Critical Paths

1. **Patient Payment Flow:**
   - Create patient
   - Generate invoice
   - Process payment
   - Verify receipt

2. **Insurance Flow:**
   - Add insurance info
   - Verify eligibility
   - Submit claim
   - Track status

3. **Reconciliation Flow:**
   - Import transactions
   - Run auto-match
   - Review exceptions

---

## 🚨 Troubleshooting

### Common Issues:

**1. Database Connection Failed**
```bash
# Check DATABASE_URL format
# Ensure SSL is configured for production
railway variables set PGSSLMODE=require
```

**2. Stripe Webhooks Not Working**
```bash
# Verify webhook URL
# Check webhook secret
# Test with Stripe CLI
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

**3. CORS Errors**
```bash
# Ensure FRONTEND_URL is set correctly
railway variables set FRONTEND_URL=https://your-frontend-url
```

**4. Build Failures**
```bash
# Clear cache and rebuild
railway run npm cache clean --force
railway up --detach
```

---

## 📈 Performance Optimization

### 9.1 Enable Caching

```bash
railway variables set REDIS_URL=redis://your-redis-url
railway variables set ENABLE_CACHE=true
```

### 9.2 Scale Up

```bash
# Increase replicas for high traffic
railway scale --replicas 3
```

---

## 🎉 Launch Checklist

Before going live:

- [ ] All environment variables set
- [ ] Database migrations complete
- [ ] Stripe in live mode
- [ ] Email sending verified
- [ ] SSL certificates active
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Team trained on system
- [ ] User guide distributed
- [ ] Support channels ready

---

## 🆘 Emergency Contacts

**Railway Support:** support@railway.app
**Stripe Support:** support.stripe.com
**Your Team:**
- Tech Lead: [Contact]
- Database Admin: [Contact]
- Security: [Contact]

---

## 🎊 Congratulations!

Your enterprise billing system is now deployed! 

**Next Steps:**
1. Monitor system performance
2. Gather user feedback
3. Plan feature updates
4. Schedule regular maintenance

**Quick Links:**
- Production URL: https://your-app.com
- Admin Panel: https://your-app.com/admin
- API Docs: https://your-app.com/api/docs
- Status Page: https://status.your-app.com

---

*Deployment Guide Version 1.0*
*Last Updated: November 2024*
