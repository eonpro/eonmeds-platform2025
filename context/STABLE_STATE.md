# Stable State Summary

## Current Stable Checkpoint

**Commit**: `dcaa20c`  
**Tag**: `stripe-phase2-stable`  
**Date**: August 2025

## What's Working

### UI/UX Improvements ✅
- Clients page matches Qualifications page styling exactly
- Patient names are normalized (proper capitalization, no accents)
- Patient IDs sequence properly from P1024+
- Hashtags display with proper colors and single # prefix
- Phone numbers format properly with single-line display
- Delete buttons use trash icon consistently

### Hashtag System ✅
- Proper categorization with unique colors:
  - #weightloss (orange)
  - #webdirect (gray)
  - Sales rep names (blue)
  - #internalrep (indigo)
  - #trt (green)
  - #peptides (yellow)
  - #hrt (pink)
  - #externalenglish (dark cyan)
  - #externalspanish (red)

### Stripe Integration - Phase 2 ✅

#### Core Billing Service (`packages/backend/src/lib/billingService.ts`)
- `getOrCreateCustomer()` - with address support for tax
- `createInvoiceAndPay()` - with automatic tax option
- `createSubscription()` - with automatic tax option
- `pauseSubscription()`, `resumeSubscription()`, `cancelSubscription()`
- `updateSubscriptionPrice()` - with proration control
- `applyCouponToSubscription()` - supports coupons and promotion codes
- `startTrialOnSubscription()` - manage trial periods
- `createSetupIntent()`, `attachPaymentMethod()` - payment method collection
- `createRefund()`, `createRefundByInvoice()`, `createCreditNote()` - refund management

#### API Endpoints (`/api/v1/billing/*`)
- `POST /customer/get-or-create` - Create or retrieve Stripe customer
- `POST /setup-intent` - Create SetupIntent for payment collection
- `POST /payment-methods/attach` - Attach and set default payment method
- `POST /invoice/create-and-pay` - Create and process invoices
- `POST /subscription/create` - Create subscriptions
- `POST /subscription/:id/pause` - Pause subscription
- `POST /subscription/:id/resume` - Resume subscription
- `POST /subscription/:id/cancel` - Cancel subscription
- `POST /subscription/:id/reactivate` - Reactivate canceled subscription
- `POST /subscription/update-price` - Change subscription pricing
- `POST /subscription/apply-coupon` - Apply discounts
- `POST /subscription/trial` - Manage trial periods
- `POST /portal-session` - Create customer portal session
- `POST /refund` - Process refunds by payment intent
- `POST /refund-by-invoice` - Process refunds by invoice
- `POST /credit-note` - Create credit notes

#### Billing Reports (`/api/v1/billing/reports/*`)
- `GET /revenue/daily?from&to` - Daily revenue aggregation
- `GET /subscriptions/dunning` - Past due invoices report
- `GET /mrr` - Monthly recurring revenue calculation

#### Webhook Processing (`/api/v1/stripe/webhook`)
- Hardened with idempotency (processed_events table)
- Signature verification with express.raw()
- Handles all critical events:
  - customer.subscription.* (created/updated/deleted)
  - invoice.* (created/finalized/paid/payment_failed/voided)
  - payment_intent.* (succeeded/failed/processing)
  - charge.succeeded, charge.refunded
- Updates local database tables automatically
- External payment mirroring for non-platform charges

#### Security & Validation
- Zod validation on all endpoints
- Idempotency key support (header-based or auto-generated)
- Stripe error handler middleware
- Tax support with TAX_ENABLED flag
- No secret leakage in error messages

### Database Schema Updates
- `processed_events` - Webhook idempotency
- `billing_events` - Audit trail with minimal PII
- `subscriptions` - Full subscription tracking
- `invoices` - Invoice status and payments
- `external_payment_mirrors` - Track mirrored external payments
- Views: `patient_subscriptions`, `patient_invoices`

### External Payment Mirroring
- Automatically creates EONPRO invoices for external Stripe charges
- Matches patients by email
- Prevents duplicate invoice creation
- Notification system for billing team
- Full idempotency support

## Files - DO NOT MODIFY

### Backend - Stripe Integration
- `packages/backend/src/lib/billingService.ts`
- `packages/backend/src/lib/billing.validation.ts`
- `packages/backend/src/routes/billing.routes.ts`
- `packages/backend/src/routes/billing.reports.ts`
- `packages/backend/src/routes/stripe.webhook.ts`
- `packages/backend/src/api/billing.portal.ts`
- `packages/backend/src/config/stripe.config.ts`
- `packages/backend/src/config/stripe-webhook-tables.sql`
- `packages/backend/STRIPE_ENV_DOCUMENTATION.md`
- `packages/backend/STRIPE_TESTING.md`

## LOCKED FILES - READ-ONLY

**Note: Stripe Phase 2 stable — do not refactor without approval.**

### Stripe Phase 2 (Mirroring) - Complete
**Commit**: (pending)
**Tag**: stripe-phase2-stable
**Date**: August 11, 2025

The following files are locked and should not be modified unless explicitly approved:

- `packages/backend/src/lib/billingService.ts`
- `packages/backend/src/routes/billing.routes.ts` (previously src/api/billing.routes.ts)
- `packages/backend/src/routes/stripe.webhook.ts` (previously src/api/stripe.webhook.ts)
- `packages/backend/src/routes/billing.reports.ts` (previously src/api/billing.reports.ts)
- `packages/backend/src/lib/mirrorExternalPayment.ts`
- `packages/backend/src/config/stripe.config.ts`
- `packages/backend/src/lib/patientLookup.ts`
- `packages/backend/src/lib/notify.ts`
- `packages/backend/src/api/billing.portal.ts`
- `packages/backend/src/lib/billing.validation.ts`
- `packages/backend/src/db/migrations/001_stripe_external_payments.sql`
- `packages/backend/src/db/migrations/run-migration.ts`

These files contain the core Stripe integration logic and have been thoroughly tested. Any modifications could break payment processing, webhook handling, or billing reporting functionality.

### New Features in Phase 2:
- External payment mirroring (automatic invoice creation for non-platform Stripe charges)
- Enhanced billing service with draft/send/pay invoice capabilities
- Comprehensive billing reports (revenue, subscriptions, MRR, dunning)
- Admin endpoint to re-run mirroring for specific charges
- Idempotent webhook processing with processed_events table
- Patient lookup by email service
- Billing notification system (stub implementation)

### Deployment Configuration:
- Deploy-ready (Railway) — frontend uses $PORT via serve; backend binds 0.0.0.0; webhook order verified
- Frontend: serve in dependencies, start:prod script for Railway
- Backend: Express binds to 0.0.0.0:PORT for all interfaces
- Stripe webhooks mount before express.json() middleware
- Node version constrained to >=18 <=22
- Deploy scripts in scripts/ directory

### Frontend - UI Consistency
- `packages/frontend/src/pages/Clients.tsx`
- `packages/frontend/src/pages/Clients.css`
- `packages/frontend/src/pages/Qualifications.css`
- `packages/frontend/src/pages/PatientProfile.tsx`
- `packages/frontend/src/utils/hashtag-utils.ts`
- `packages/frontend/src/utils/hashtag-display.ts`
- `packages/frontend/src/lib/formatPhone.ts`
- `packages/frontend/src/styles/typography-tokens.css`

### Backend - Core Functionality
- `packages/backend/src/controllers/webhook.controller.ts`
- `packages/backend/src/utils/normalize-name.ts`
- `packages/backend/src/routes/patient.routes.ts`

## Environment Variables Required
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_DEFAULT` (optional)
- `TAX_ENABLED` (optional, default: false)
- `APP_BASE_URL`

## Notes
- All Stripe write operations support idempotency
- Webhook processing is atomic with rollback on failure
- Tax calculation requires customer addresses
- All amounts are in cents (multiply by 100)
- Patient IDs continue from P1024 sequentially
- Names are auto-normalized on creation
- Hashtags are assigned based on HeyFlow form type

## Stripe Integration Graduation - December 2025

### Graduation Checklist ✅
- **Environment**: Build scripts verified (build, start, dev)
- **TypeScript**: Configured with proper outDir and includes
- **Webhook Order**: Stripe webhooks mount before body parsing
- **Port Binding**: Server binds to 0.0.0.0 on PORT (default 3000)
- **Diagnostics**: Self-check CLI tool and API endpoint added
- **Metadata**: All Stripe objects tagged with platform='EONPRO'
- **Idempotency**: Webhook processing with processed_events table
- **External Payments**: Mirroring skips platform-originated charges
- **Error Handling**: Graceful handling of missing payment methods

### New Diagnostic Tools
1. **CLI Self-Check**: `npm run stripe:check`
   - Verifies environment variables
   - Tests Stripe API connection
   - Checks database connectivity
   - Validates webhook configuration
   
2. **API Endpoint**: `GET /api/v1/billing/diagnostics/stripe`
   - Auth: admin or billing role
   - Returns comprehensive status:
     - Environment variable status
     - Stripe connection health
     - Database connection status
     - Webhook configuration
     - Available billing routes

### Database Migrations
- `001_stripe_external_payments.sql` - External payment tracking
- `002_stripe_webhook_tables.sql` - Webhook processing tables

### Stripe graduated to production-ready: diagnostics endpoint + CLI self-check added