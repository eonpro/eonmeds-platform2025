# Stripe Architecture Decision for EONMEDS Multi-Tenant EHR
**Date**: 2025-09-07  
**Author**: Principal Payments Architect  
**Status**: APPROVED

## Executive Summary
After analyzing the existing codebase and requirements, we will implement **Option A: Single Stripe Account** with tenant metadata for the EONMEDS platform, maintaining strict HIPAA compliance by never sending PHI to Stripe.

## Architecture Decision: Single Stripe Account

### Selected Option
**Option A: Single Stripe Account with Tenant Metadata**

### Rationale
1. **Existing Infrastructure**: The platform already has substantial Stripe implementation with a single account model
2. **Simplified Operations**: Single account reduces operational complexity for a cash-pay telehealth platform
3. **Unified Financial Reporting**: Easier reconciliation and financial reporting across all tenants
4. **Platform Control**: Platform maintains full control over payment flows and can implement custom revenue sharing
5. **Current Reality**: Current implementation shows ~1,605 patients across multiple tenants already using single account

### Fee Model
- **Platform Fee**: 10% of transaction value (1000 basis points)
- **Implementation**: Internal ledger tracks platform fees per tenant
- **Distribution**: Monthly payouts to tenants after platform fee deduction
- **Transparency**: Tenants can view their earnings and fees in real-time dashboard

## Compliance Strategy

### HIPAA Guardrails
1. **No PHI to Stripe**: Only opaque IDs in all Stripe objects
   - `tenant_id`: UUID for clinic/practice
   - `patient_uuid`: Internal patient identifier (not SSN, MRN, or name)
   - `order_id`: Transaction reference
   
2. **Metadata Structure**:
```json
{
  "tenant_id": "uuid-here",
  "patient_uuid": "internal-id",
  "order_id": "ORD-123456",
  "product_code": "TELEMED_VISIT",
  "environment": "production"
}
```

3. **Description Fields**: Generic descriptions only
   - ✅ "Telehealth Services"
   - ✅ "Monthly Program"
   - ❌ "Dr. Smith Consultation for Diabetes"
   - ❌ "GLP-1 Weight Loss Treatment"

### Financial Institution Exception (HIPAA §1179)
Payment processing falls under the financial institution exception when:
- Limited to payment authorization and settlement
- No PHI beyond what's strictly needed for payment
- Stripe treated as payment processor only, not a Business Associate

## Implementation Architecture

### Data Model
```sql
-- Core tenant and customer tables
tenants(
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  billing_email VARCHAR(255),
  platform_fee_bps INTEGER DEFAULT 1000,
  payout_schedule VARCHAR(50) DEFAULT 'monthly'
)

customers(
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  stripe_customer_id VARCHAR(255) UNIQUE,
  patient_uuid VARCHAR(255) NOT NULL,
  billing_email VARCHAR(255),
  status VARCHAR(50)
)

-- Payment tracking
payments(
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  amount_cents INTEGER,
  currency VARCHAR(3),
  status VARCHAR(50),
  type VARCHAR(50), -- one_time|subscription|refund
  platform_fee_cents INTEGER,
  created_at TIMESTAMP
)

-- Internal ledger for reconciliation
ledger_entries(
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  source VARCHAR(50), -- payment|refund|dispute|payout
  source_id VARCHAR(255),
  amount_cents INTEGER,
  currency VARCHAR(3),
  direction VARCHAR(10), -- debit|credit
  balance_cents INTEGER, -- running balance per tenant
  occurred_at TIMESTAMP
)
```

### Webhook Architecture
Single webhook endpoint: `POST /api/stripe/webhook`
- Raw body handling for signature verification
- Idempotent processing via event ID deduplication
- Async queue for heavy processing
- Immediate ACK (< 200ms)

### Payment Flows

#### Save Card Flow
1. Create/retrieve Stripe Customer with metadata
2. Create SetupIntent
3. Client confirms with Payment Element
4. Store payment method reference (no card details)

#### One-off Payment Flow
1. Create PaymentIntent with tenant metadata
2. Attach to customer
3. Process with saved card or new payment method
4. Update internal ledger on webhook

#### Subscription Flow
1. Create Product/Price per tenant offering
2. Create Subscription with metadata
3. Handle lifecycle via webhooks
4. Track in internal subscriptions table

## Migration Strategy

### Phase 1: Foundation (Week 1)
- [x] Core Stripe configuration
- [x] Customer creation with metadata
- [x] Webhook endpoint setup
- [ ] Internal ledger implementation

### Phase 2: Payments (Week 2)
- [x] SetupIntent for card saving
- [x] PaymentIntent for one-off charges
- [ ] Refund processing
- [ ] Dispute handling

### Phase 3: Subscriptions (Week 3)
- [ ] Product/Price creation per tenant
- [x] Subscription lifecycle management
- [ ] Proration handling
- [ ] Dunning configuration

### Phase 4: External Payments (Week 4)
- [ ] Auto-matching by email
- [ ] Manual review queue
- [ ] Reconciliation jobs
- [ ] Payout calculations

## Security Measures

1. **API Key Management**
   - Secrets stored in AWS Secrets Manager
   - Separate test/live keys
   - Quarterly rotation schedule

2. **Webhook Security**
   - Signature verification on all events
   - IP allowlisting for Stripe
   - Rate limiting per event type

3. **Data Protection**
   - No PCI data stored locally
   - Stripe handles all card data
   - Token-based references only

## Success Metrics

- **Payment Success Rate**: Target >95%
- **Webhook Processing Time**: <500ms p95
- **Reconciliation Accuracy**: 100% daily
- **Platform Fee Collection**: 100% automated
- **Tenant Payout Time**: <5 business days

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Single point of failure | High | Multi-region deployment, Stripe fallback |
| Tenant attribution errors | Medium | Strict metadata validation, manual review queue |
| HIPAA violation via metadata | High | Automated PHI scanning, strict field validation |
| Revenue leakage | Medium | Daily reconciliation, webhook retry mechanism |

## Decision Log

- **2025-09-07**: Initial decision for Single Stripe Account model
- **Reviewed by**: Engineering, Compliance, Finance teams
- **Approved by**: CTO, CFO, Compliance Officer

## Next Steps

1. Complete Phase 1 foundation tasks
2. Implement comprehensive webhook handling
3. Build admin dashboard for payment monitoring
4. Create tenant payout automation
5. Establish daily reconciliation jobs

---

**Note**: This decision is based on current scale (1,605 patients). If the platform scales to >10,000 patients or >50 tenants, we should revisit and potentially migrate to Stripe Connect for better tenant isolation.
