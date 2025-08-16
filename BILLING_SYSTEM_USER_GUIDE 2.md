# 🏥 EonMeds Enterprise Billing System - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [For Healthcare Staff](#for-healthcare-staff)
3. [For Patients](#for-patients)
4. [For Administrators](#for-administrators)
5. [AI Assistant Guide](#ai-assistant-guide)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Accessing the Billing System
1. Log into EonMeds platform
2. Click on **"Billing Center"** in the main navigation
3. Your dashboard will load with real-time financial data

### First-Time Setup
1. Configure your Stripe account (Admin only)
2. Set up tax rates for your region
3. Create billing plans for common services
4. Customize invoice templates

---

## 👩‍⚕️ For Healthcare Staff

### 1. Creating an Invoice
1. Navigate to **Billing Center → Invoices**
2. Click **"Create Invoice"**
3. Select patient from dropdown
4. Add line items:
   - Search by CPT code
   - Or manually enter service
5. Apply insurance adjustments if needed
6. Click **"Send to Patient"**

### 2. Processing Payments
1. From patient profile, click **"Process Payment"**
2. Enter payment amount
3. Select payment method:
   - Credit/Debit Card
   - Bank Transfer
   - Cash/Check (mark as received)
4. Payment receipt auto-generates

### 3. Insurance Claims
1. Go to **Revenue Cycle → Claims Manager**
2. Click **"New Claim"**
3. System auto-fills patient insurance info
4. Add procedures with CPT codes
5. Click **"Submit to Insurance"**
6. Track status in real-time

### 4. Checking Insurance Eligibility
1. From patient profile, click **"Verify Insurance"**
2. Results show in 2-3 seconds:
   - ✅ Active Coverage
   - 💰 Deductible Status
   - 📋 Copay Amount
   - 🏥 In/Out Network Status

### 5. Quick Actions Cheat Sheet
- **F1** - Quick Pay (when on patient profile)
- **F2** - New Invoice
- **F3** - Verify Insurance
- **F4** - View Claims

---

## 👤 For Patients

### 1. Making a Payment
1. Log into patient portal
2. Click **"Pay Bill"** or payment notification
3. Review invoice details
4. Choose payment method:
   - Saved card
   - New card
   - Payment plan
5. Receive instant confirmation

### 2. Setting Up Payment Plans
1. On invoice, click **"Payment Plan Options"**
2. Choose:
   - 3 months (no interest)
   - 6 months (no interest)
   - 12 months (low interest)
3. Auto-payments set up automatically

### 3. Insurance Information
1. Go to **"My Insurance"**
2. Upload insurance card photos
3. View coverage details
4. Check remaining deductible

### 4. Payment History
1. Navigate to **"Billing History"**
2. View all transactions
3. Download receipts
4. Print for tax purposes

---

## 👨‍💼 For Administrators

### 1. Revenue Dashboard
**Location:** Billing Center → Dashboard

**Key Metrics:**
- **MRR/ARR** - Monthly/Annual Recurring Revenue
- **Collection Rate** - Percentage of billed amount collected
- **Days in A/R** - Average days to collect payment
- **Denial Rate** - Insurance claim denial percentage

**Actions:**
- Click any metric to drill down
- Export data with "Download" button
- Set up alerts for thresholds

### 2. Fraud Detection System
**Location:** Analytics & AI → Fraud Detection

**How to Use:**
1. Review daily alerts
2. Click alert for details
3. Take action:
   - Block suspicious claims
   - Flag for investigation
   - Mark false positive

**Red Flags to Watch:**
- Duplicate claims (same day/service)
- Unusual billing amounts (300%+ average)
- Identity mismatches
- Suspicious patterns

### 3. Batch Operations
**Location:** Billing Operations → Batch Processing

**Common Tasks:**
1. **Monthly Invoice Run**
   - Filter: Last month's services
   - Action: Generate invoices
   - Send: Email all at once

2. **Insurance Eligibility Check**
   - Upload patient list (CSV)
   - Run verification
   - Export results

3. **Payment Posting**
   - Import bank file
   - Auto-match payments
   - Review exceptions

### 4. Reconciliation
**Location:** Billing Operations → Reconciliation

**Daily Process:**
1. Click **"Run Reconciliation"**
2. System matches payments (92% auto-match)
3. Review unmatched items
4. Accept suggested matches or investigate

### 5. Reports & Analytics
**Location:** Analytics & AI → Reports

**Key Reports:**
- Financial Summary (Daily/Monthly)
- Insurance Aging Report
- Provider Productivity
- Denial Analysis
- Patient Balance Report

**Scheduling Reports:**
1. Select report type
2. Set frequency (Daily/Weekly/Monthly)
3. Add email recipients
4. Reports auto-generate and send

---

## 🤖 AI Assistant Guide

### Accessing the Assistant
- Click the **purple chat bubble** (bottom right)
- Or press **Ctrl+Shift+B** (Cmd+Shift+B on Mac)

### Example Commands

**Financial Queries:**
- "What's our revenue today?"
- "Show me this month's collection rate"
- "Compare revenue to last month"

**Claim Management:**
- "Show denied claims from this week"
- "Which claims are over 30 days?"
- "Find claims for Dr. Smith"

**Patient Queries:**
- "Show overdue balances over $500"
- "Which patients have payment plans?"
- "Find patients with expired insurance"

**Action Commands:**
- "Create invoice for John Doe"
- "Send payment reminder to overdue accounts"
- "Generate aging report"

### Pro Tips:
- Be specific with dates and amounts
- Use patient names or IDs for accuracy
- Ask follow-up questions for details

---

## 🔧 Troubleshooting

### Common Issues & Solutions

**1. Payment Not Processing**
- Check internet connection
- Verify card details
- Ensure patient has valid email
- Check Stripe webhook status

**2. Insurance Verification Failing**
- Confirm insurance ID format
- Check patient DOB matches
- Verify insurance is supported
- Try manual verification

**3. Claims Not Submitting**
- Validate all required fields
- Check CPT codes are current
- Ensure provider is credentialed
- Verify insurance is active

**4. Reports Not Generating**
- Check date range selection
- Ensure data exists for period
- Clear browser cache
- Try different browser

### Getting Help
1. **In-App Help:** Click "?" icon
2. **AI Assistant:** Ask your question
3. **Support:** support@eonmeds.com
4. **Emergency:** 1-800-XXX-XXXX

---

## 🎯 Best Practices

### Daily Tasks
- [ ] Check fraud detection alerts
- [ ] Review unmatched payments
- [ ] Process pending claims
- [ ] Verify high-value invoices

### Weekly Tasks
- [ ] Run aging report
- [ ] Review denial trends
- [ ] Update payment plans
- [ ] Reconcile bank statements

### Monthly Tasks
- [ ] Generate financial reports
- [ ] Review collection rates
- [ ] Update fee schedules
- [ ] Audit user access

---

## 🚨 Security & Compliance

### HIPAA Compliance
- All data encrypted at rest and in transit
- Automatic logout after 15 minutes
- Audit trail for all actions
- Role-based access control

### PCI Compliance
- No card numbers stored
- Tokenized payment processing
- Secure payment forms
- Regular security scans

### Best Practices
1. Never share login credentials
2. Log out when finished
3. Report suspicious activity
4. Keep browser updated
5. Use strong passwords

---

## 📱 Mobile App Features

### Available on Mobile:
- View invoices
- Make payments
- Check insurance
- Payment history
- Quick pay widget

### Mobile-Only Features:
- Insurance card scanner
- Face ID/Touch ID login
- Push notifications
- Offline receipt storage

---

## 🎉 Tips for Success

1. **Use Templates** - Create invoice templates for common procedures
2. **Set Automations** - Auto-send payment reminders
3. **Monitor Metrics** - Check dashboard daily
4. **Train Staff** - Regular billing system training
5. **Patient Education** - Help patients use portal

---

## 📞 Contact Information

**Technical Support**
- Email: techsupport@eonmeds.com
- Phone: 1-800-XXX-XXXX
- Hours: 24/7

**Billing Support**
- Email: billing@eonmeds.com
- Phone: 1-800-XXX-YYYY
- Hours: Mon-Fri 8am-6pm EST

**Training Requests**
- Email: training@eonmeds.com
- Online: eonmeds.com/training

---

*Last Updated: November 2024*
*Version: 2.0*
