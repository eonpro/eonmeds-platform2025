# Comprehensive Production Billing Stack Implementation Plan
**Principal Architect**: Payments & Billing System  
**Timeline**: 4 weeks  
**Complexity**: High  

## 🎯 Executive Summary

Transform the current basic Stripe integration (25% complete) into a **production-grade, enterprise billing system** that rivals major billing platforms. This includes Stripe Connect for multi-tenancy, comprehensive invoicing, quotes, tax handling, double-entry ledger, and complete billing automation.

## 🏗️ Architecture Decision

### Selected: Hybrid Architecture
**Stripe Connect (Express) + Enhanced Platform Features**

**Rationale**:
1. **Connect for Tenants**: Each clinic gets its own Stripe account
2. **Platform Control**: Maintain billing rules and fees
3. **Compliance**: Better liability isolation per tenant
4. **Scalability**: Handles 1-10,000 tenants efficiently

**Revenue Model**:
- Platform fee: 10% (application_fee_amount)
- Tenant receives: 90% direct to their Stripe account
- Monthly platform invoice for additional services

## 📋 Implementation Phases

### Phase 0: Foundation & Connect Setup (Days 1-3)
```typescript
// Core setup tasks
- [ ] Stripe Connect configuration
- [ ] OAuth flow for tenant onboarding
- [ ] Account status monitoring
- [ ] Webhook endpoint for Connect events
- [ ] Database schema updates
```

### Phase 1: Double-Entry Ledger (Days 4-6)
```sql
-- New tables needed
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY,
  account_number VARCHAR(10) UNIQUE,
  account_name VARCHAR(100),
  account_type VARCHAR(20), -- asset|liability|equity|revenue|expense
  normal_balance VARCHAR(10), -- debit|credit
  parent_account_id UUID
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  entry_date DATE,
  description TEXT,
  source_document VARCHAR(100),
  created_by UUID,
  posted BOOLEAN DEFAULT false
);

CREATE TABLE journal_line_items (
  id UUID PRIMARY KEY,
  journal_entry_id UUID,
  account_id UUID,
  debit_amount DECIMAL(15,2),
  credit_amount DECIMAL(15,2),
  description TEXT
);

CREATE TABLE general_ledger (
  id UUID PRIMARY KEY,
  account_id UUID,
  tenant_id UUID,
  period DATE,
  beginning_balance DECIMAL(15,2),
  debits DECIMAL(15,2),
  credits DECIMAL(15,2),
  ending_balance DECIMAL(15,2)
);
```

### Phase 2: Comprehensive Invoicing (Days 7-12)

#### Invoice Generation System
```typescript
interface InvoiceService {
  // Core invoice operations
  createDraftInvoice(params: InvoiceParams): Promise<Invoice>
  addLineItem(invoiceId: string, item: LineItem): Promise<void>
  calculateTax(invoice: Invoice): Promise<TaxCalculation>
  finalizeInvoice(invoiceId: string): Promise<Invoice>
  sendInvoice(invoiceId: string): Promise<void>
  
  // Advanced features
  createRecurringInvoice(template: InvoiceTemplate): Promise<void>
  applyPayment(invoiceId: string, payment: Payment): Promise<void>
  createCreditNote(invoiceId: string, amount: number): Promise<CreditNote>
  
  // Quotes
  createQuote(params: QuoteParams): Promise<Quote>
  convertQuoteToInvoice(quoteId: string): Promise<Invoice>
  
  // PDF Generation
  generatePDF(invoiceId: string): Promise<Buffer>
  emailInvoice(invoiceId: string, recipients: string[]): Promise<void>
}
```

#### Database Schema
```sql
CREATE TABLE invoices_comprehensive (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  invoice_number VARCHAR(50) UNIQUE,
  customer_id UUID NOT NULL,
  
  -- Stripe references
  stripe_invoice_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  
  -- Invoice details
  status VARCHAR(20), -- draft|sent|paid|overdue|void
  invoice_date DATE,
  due_date DATE,
  terms VARCHAR(50), -- net_30|due_on_receipt|custom
  
  -- Amounts
  subtotal DECIMAL(15,2),
  discount_amount DECIMAL(15,2),
  tax_amount DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  amount_paid DECIMAL(15,2),
  amount_due DECIMAL(15,2) GENERATED AS (total_amount - amount_paid),
  
  -- Additional
  notes TEXT,
  internal_notes TEXT,
  metadata JSONB,
  
  -- Timestamps
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  voided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices_comprehensive(id),
  
  -- Item details
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 1,
  unit_price DECIMAL(15,4),
  amount DECIMAL(15,2),
  
  -- Tax
  tax_rate DECIMAL(5,2),
  tax_amount DECIMAL(15,2),
  
  -- References
  product_id UUID,
  service_date DATE,
  metadata JSONB
);

CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  quote_number VARCHAR(50) UNIQUE,
  customer_id UUID NOT NULL,
  
  -- Quote details
  status VARCHAR(20), -- draft|sent|accepted|expired|converted
  valid_until DATE,
  
  -- Amounts (same as invoice)
  subtotal DECIMAL(15,2),
  discount_amount DECIMAL(15,2),
  tax_amount DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  
  -- Conversion
  converted_to_invoice_id UUID,
  converted_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 3: Stripe Connect Implementation (Days 13-16)

#### Connect Service
```typescript
class StripeConnectService {
  // Onboarding
  async createConnectedAccount(tenant: Tenant): Promise<string> {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: tenant.billing_email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: 'company',
      metadata: {
        tenant_id: tenant.id,
        platform: 'eonmeds'
      }
    });
    return account.id;
  }
  
  // OAuth flow
  async createAccountLink(accountId: string): Promise<string> {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${BASE_URL}/connect/reauth`,
      return_url: `${BASE_URL}/connect/success`,
      type: 'account_onboarding'
    });
    return accountLink.url;
  }
  
  // Destination charge with platform fee
  async createDestinationCharge(params: {
    amount: number,
    currency: string,
    customer: string,
    destination: string,
    applicationFee: number
  }): Promise<PaymentIntent> {
    return stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      customer: params.customer,
      
      // Connect routing
      on_behalf_of: params.destination,
      transfer_data: {
        destination: params.destination
      },
      application_fee_amount: params.applicationFee,
      
      // Metadata
      metadata: {
        platform: 'eonmeds',
        type: 'destination_charge'
      }
    });
  }
  
  // Subscription with Connect
  async createConnectedSubscription(params: {
    customer: string,
    price: string,
    connectedAccountId: string,
    applicationFeePercent: number
  }): Promise<Subscription> {
    return stripe.subscriptions.create({
      customer: params.customer,
      items: [{ price: params.price }],
      
      // Connect settings
      on_behalf_of: params.connectedAccountId,
      application_fee_percent: params.applicationFeePercent,
      
      transfer_data: {
        destination: params.connectedAccountId
      }
    }, {
      stripeAccount: params.connectedAccountId
    });
  }
}
```

### Phase 4: Tax System (Days 17-18)

```typescript
interface TaxService {
  // Tax calculation
  calculateTax(params: {
    amount: number,
    taxRate: number,
    jurisdiction: string
  }): TaxCalculation
  
  // Tax rates management
  getTaxRate(jurisdiction: string): Promise<number>
  updateTaxRates(rates: TaxRate[]): Promise<void>
  
  // Reporting
  generateTaxReport(period: DateRange): Promise<TaxReport>
}

// Tax tables
CREATE TABLE tax_rates (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  jurisdiction VARCHAR(100),
  rate DECIMAL(5,3),
  effective_date DATE,
  end_date DATE
);

CREATE TABLE tax_transactions (
  id UUID PRIMARY KEY,
  invoice_id UUID,
  tax_rate_id UUID,
  taxable_amount DECIMAL(15,2),
  tax_amount DECIMAL(15,2),
  collected_date DATE
);
```

### Phase 5: Payment Links & External Payments (Days 19-20)

```typescript
interface PaymentLinkService {
  // Create payment link
  createPaymentLink(params: {
    products: Array<{productId: string, quantity: number}>,
    tenant: string,
    metadata: Record<string, string>
  }): Promise<PaymentLink>
  
  // Ingest external payment
  ingestExternalPayment(session: CheckoutSession): Promise<{
    matched: boolean,
    invoice?: Invoice,
    confidence: number
  }>
  
  // Auto-matching
  matchByEmail(email: string): Promise<Customer | null>
  matchByAmount(amount: number, date: Date): Promise<Invoice[]>
}
```

### Phase 6: Advanced Features (Days 21-24)

#### Dunning Management
```typescript
interface DunningService {
  // Retry logic
  scheduleRetry(invoice: Invoice): Promise<void>
  
  // Email sequences
  sendReminderEmail(invoice: Invoice, template: string): Promise<void>
  
  // Escalation
  escalateToCollections(invoice: Invoice): Promise<void>
  
  // Smart retries
  optimizeRetrySchedule(customer: Customer): Promise<RetrySchedule>
}
```

#### Billing Portal Enhancement
```typescript
interface BillingPortalService {
  // Customer portal
  createPortalSession(customerId: string): Promise<string>
  
  // Tenant branding
  applyBranding(tenant: Tenant): Promise<void>
  
  // Self-service features
  enableFeatures(features: PortalFeatures): Promise<void>
}
```

### Phase 7: Reporting & Analytics (Days 25-28)

```typescript
interface ReportingService {
  // Financial reports
  generateIncomeStatement(period: DateRange): Promise<Report>
  generateBalanceSheet(date: Date): Promise<Report>
  generateCashFlow(period: DateRange): Promise<Report>
  
  // Operational reports
  generateAgingReport(): Promise<AgingReport>
  generateRevenueByTenant(): Promise<Report>
  generateSubscriptionMetrics(): Promise<MetricsReport>
  
  // Reconciliation
  reconcileStripePayouts(): Promise<ReconciliationReport>
  reconcileLedgerBalance(): Promise<BalanceReport>
}
```

## 🔧 Technical Implementation Details

### Webhook Handler Enhancement
```typescript
// Complete webhook event handling
const WEBHOOK_HANDLERS = {
  // Payment events
  'payment_intent.succeeded': handlePaymentSucceeded,
  'payment_intent.payment_failed': handlePaymentFailed,
  
  // Subscription events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'customer.subscription.trial_will_end': handleTrialEnding,
  
  // Invoice events
  'invoice.created': handleInvoiceCreated,
  'invoice.finalized': handleInvoiceFinalized,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'invoice.overdue': handleInvoiceOverdue,
  
  // Connect events
  'account.updated': handleAccountUpdated,
  'account.application.authorized': handleAccountAuthorized,
  'account.application.deauthorized': handleAccountDeauthorized,
  
  // Payout events
  'payout.created': handlePayoutCreated,
  'payout.paid': handlePayoutPaid,
  'payout.failed': handlePayoutFailed,
  
  // Dispute events
  'charge.dispute.created': handleDisputeCreated,
  'charge.dispute.updated': handleDisputeUpdated,
  'charge.dispute.closed': handleDisputeClosed,
  
  // Quote events (custom)
  'quote.accepted': handleQuoteAccepted,
  'quote.expired': handleQuoteExpired
};
```

### API Endpoints Structure
```yaml
/api/v2/billing:
  # Connect
  /connect:
    POST /onboard
    GET /status/:accountId
    POST /login-link/:accountId
    
  # Invoicing
  /invoices:
    GET /
    POST /
    GET /:id
    PUT /:id
    POST /:id/send
    POST /:id/pay
    POST /:id/void
    GET /:id/pdf
    
  # Quotes
  /quotes:
    POST /
    GET /:id
    POST /:id/accept
    POST /:id/convert
    
  # Subscriptions
  /subscriptions:
    POST /
    GET /:id
    PUT /:id
    DELETE /:id
    POST /:id/pause
    POST /:id/resume
    
  # Payment Links
  /payment-links:
    POST /
    GET /:id
    DELETE /:id
    
  # Ledger
  /ledger:
    GET /entries
    GET /balance-sheet
    GET /income-statement
    GET /trial-balance
    
  # Reports
  /reports:
    GET /revenue
    GET /aging
    GET /tax
    GET /reconciliation
```

## 📊 Database Migration Strategy

```sql
-- Migration script
BEGIN;

-- Rename existing tables with _v1 suffix
ALTER TABLE invoices RENAME TO invoices_v1;
ALTER TABLE stripe_invoices RENAME TO stripe_invoices_v1;
ALTER TABLE ledger_entries RENAME TO ledger_entries_v1;

-- Create new comprehensive tables
-- (Insert all CREATE TABLE statements from above)

-- Migrate data
INSERT INTO invoices_comprehensive 
SELECT ... FROM invoices_v1;

INSERT INTO journal_entries 
SELECT ... FROM ledger_entries_v1;

COMMIT;
```

## 🚀 Deployment Strategy

### Environment Variables
```bash
# Stripe Connect
STRIPE_CONNECT_CLIENT_ID=ca_xxx
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxx

# Platform settings
PLATFORM_FEE_PERCENT=10
DEFAULT_PAYMENT_TERMS=net_30
ENABLE_AUTO_DUNNING=true

# Email settings
SENDGRID_API_KEY=xxx
INVOICE_FROM_EMAIL=billing@eonmeds.com

# PDF generation
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Testing Strategy
1. Unit tests for each service
2. Integration tests for Stripe API
3. End-to-end tests for complete flows
4. Load testing for scale
5. Reconciliation testing

## 📈 Success Metrics

- Payment success rate > 95%
- Invoice delivery rate > 99%
- Webhook processing < 200ms p95
- Ledger reconciliation 100% accurate
- Customer portal usage > 60%
- Dunning recovery rate > 30%

## 🎯 Deliverables

Week 1:
- [ ] Stripe Connect integration
- [ ] Double-entry ledger

Week 2:
- [ ] Invoice generation system
- [ ] Quote management
- [ ] PDF generation

Week 3:
- [ ] Tax calculation
- [ ] Payment links
- [ ] Dunning system

Week 4:
- [ ] Enhanced billing portal
- [ ] Reporting suite
- [ ] Testing & documentation

## 💰 ROI Analysis

**Investment**: 4 weeks development
**Benefits**:
- Reduce billing operations by 80%
- Increase payment recovery by 30%
- Enable scale to 10,000 tenants
- Reduce accounting costs by 60%
- Enable real-time financial reporting

**Payback Period**: 3 months
