# Stripe PCI Compliance Documentation

## Overview

This document outlines our PCI-compliant implementation of Stripe payment processing in the EONPRO platform. We follow industry best practices to ensure cardholder data security while maintaining SAQ-A eligibility.

## PCI Compliance Level: SAQ-A

We maintain **SAQ-A** compliance, the simplest form of PCI compliance, by:

1. **Never touching raw card data** - All card information is handled directly by Stripe
2. **Using Stripe Elements** - Card input fields are hosted by Stripe in secure iframes
3. **Tokenization only** - We only store Stripe-generated tokens and metadata

## What We Store vs What We Don't Store

### ❌ NEVER Stored in Our Database:
- Primary Account Number (PAN) / Card Number
- CVV/CVC/Security Code
- Full magnetic stripe data
- PIN or PIN block

### ✅ Safe Data We Store:
- Stripe Payment Method ID (e.g., `pm_1234567890`)
- Card brand (e.g., "visa", "mastercard")
- Last 4 digits of card
- Expiration month/year
- Card fingerprint (for duplicate detection)
- Customer's Stripe ID

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│Stripe iframe│────▶│   Stripe    │
│             │     │  (Elements) │     │   Servers   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                        │
       │            API Calls                   │
       ▼            (tokens only)               │
┌─────────────┐                                │
│  Our Backend│◀────────────────────────────────
│   (Express) │     Webhooks & API responses
└─────────────┘
       │
       ▼
┌─────────────┐
│Our Database │ (Only stores safe metadata)
│ (PostgreSQL)│
└─────────────┘
```

## Implementation Details

### Frontend (React)
- Uses `@stripe/react-stripe-js` and Stripe Elements
- Card input rendered in Stripe-hosted iframe
- Only receives tokens, never raw card data

### Backend (Express/Node.js)
- Uses official Stripe Node.js SDK
- All API calls use Stripe's secure HTTPS endpoints
- Webhook signature verification prevents spoofing

### Database Schema
```sql
-- payment_methods_cached table - PCI COMPLIANT
CREATE TABLE payment_methods_cached (
  payment_method_id TEXT PRIMARY KEY,      -- Stripe token
  patient_id UUID,
  stripe_customer_id TEXT NOT NULL,
  brand TEXT,                              -- "visa", "mastercard", etc.
  last4 TEXT,                              -- "1234"
  exp_month INT,                           -- 12
  exp_year INT,                            -- 2025
  fingerprint TEXT,                        -- For duplicate detection
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- NO card numbers, NO CVV, NO sensitive data
```

## Security Measures

### 1. Environment Variables
- Stripe keys stored in environment variables
- Never committed to version control
- Different keys for test/live environments

### 2. HTTPS Only
- All API endpoints require HTTPS in production
- Webhook endpoints use HTTPS exclusively

### 3. Authentication & Authorization
- All payment endpoints require authentication (Auth0 JWT)
- Role-based access control for admin functions

### 4. Webhook Security
- Signature verification on all Stripe webhooks
- Prevents replay attacks and spoofing

### 5. Rate Limiting
- Payment endpoints rate-limited to prevent abuse
- Prevents brute-force attacks

### 6. Audit Logging
- All payment actions logged for compliance
- Includes user, timestamp, and action details

## Compliance Checklist

- [x] No storage of sensitive cardholder data
- [x] Use of Stripe Elements for card input
- [x] HTTPS enforcement in production
- [x] Strong authentication on payment endpoints
- [x] Webhook signature verification
- [x] Environment variable security
- [x] Comprehensive audit logging
- [x] Rate limiting on sensitive endpoints
- [x] Regular security updates

## Incident Response

In case of a suspected security incident:

1. Immediately rotate all Stripe API keys
2. Review audit logs for suspicious activity
3. Contact Stripe support
4. Notify affected users as required by law
5. Document incident and remediation steps

## Regular Security Tasks

### Monthly
- Review audit logs for anomalies
- Verify no sensitive data in logs
- Check for security updates

### Quarterly
- Rotate API keys
- Review and update this documentation
- Security training for developers

### Annually
- Complete SAQ-A self-assessment
- Third-party security audit (recommended)

## Developer Guidelines

1. **Never log card details** - Not even for debugging
2. **Always use Stripe tokens** - Never accept raw card data
3. **Validate on backend** - Don't trust frontend validation alone
4. **Use idempotency keys** - Prevent duplicate charges
5. **Handle errors gracefully** - Don't expose system details

## Contact

For security concerns or questions about this implementation:
- Security Team: security@eonmeds.com
- Compliance Officer: compliance@eonmeds.com

Last Updated: August 2025
Next Review: November 2025
