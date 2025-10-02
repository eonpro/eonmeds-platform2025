# 📋 PLANNER MODE: Invoice & Stripe Integration Fix Plan

## **Executive Summary**
The platform is working but invoice frontend is broken due to incorrect API routes. Need immediate fix then UI enhancement.

---

## **Current State Assessment**

### ✅ **Working Components**
- Platform loads and authenticates
- Patient list displays
- Stripe card addition works
- Backend invoice API fully functional
- All backend endpoints tested and working

### ❌ **Broken Components**
- Frontend invoice routes (404 errors)
- Invoice list not loading
- Create invoice failing
- Using old `/api/v1/payments/invoices` routes

---

## **Root Cause Analysis**

### **Problem 1: Incorrect API Routes**
```javascript
// WRONG (Current)
GET /api/v1/payments/invoices/patient/{id}
POST /api/v1/payments/invoices/create

// CORRECT (Should be)
GET /api/v1/invoices?customerId={id}
POST /api/v1/invoices
```

### **Problem 2: Components Not Updated**
- PatientInvoices.tsx - Using old routes
- CreateInvoiceModal.tsx - Using old routes with `/create` suffix

---

## **Implementation Plan**

### **Phase 1: Immediate Route Fix (30 minutes)**
1. **Fix PatientInvoices.tsx**
   - Line ~72: Change GET route
   - Line ~85: Change DELETE route
   - Success: Invoice list loads

2. **Fix CreateInvoiceModal.tsx**
   - Line ~127: Change POST route
   - Remove `/create` suffix
   - Success: Can create invoices

3. **Verify EditInvoiceModal.tsx**
   - Should already be correct
   - Success: Can edit invoices

### **Phase 2: Test & Deploy (15 minutes)**
1. **Local Test**
   - Build with correct env vars
   - Test all invoice operations
   - Check console for errors

2. **Production Deploy**
   - Build optimized version
   - Deploy to S3
   - Clear CloudFront cache
   - Verify in production

### **Phase 3: UI Enhancement (2 hours)**
Only after core functionality works:

1. **Invoice List Improvements**
   - Modern card layout
   - Status badges (Paid, Pending, Overdue)
   - Quick actions menu
   - Search and filter

2. **Create/Edit Modal**
   - Better form validation
   - Real-time calculations
   - Tax support
   - Multiple line items

3. **Payment Features**
   - Pay button integration
   - Payment confirmation
   - Receipt download
   - Refund management

---

## **Technical Details**

### **Correct API Endpoints (Backend Already Has)**
```javascript
// Invoice CRUD
POST   /api/v1/invoices              // Create
GET    /api/v1/invoices              // List (with query params)
GET    /api/v1/invoices/:id          // Get single
PUT    /api/v1/invoices/:id          // Update
DELETE /api/v1/invoices/:id          // Delete

// Invoice Actions
POST   /api/v1/invoices/:id/send     // Email invoice
GET    /api/v1/invoices/:id/payment-link  // Get payment URL
POST   /api/v1/invoices/:id/pay      // Process payment
POST   /api/v1/invoices/:id/refund   // Process refund
```

### **Frontend Service Configuration**
```javascript
// invoice.service.ts should use:
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  'https://qm6dnecfhp.us-east-1.awsapprunner.com';

// Routes should be:
`${API_BASE_URL}/api/v1/invoices`
```

---

## **Success Metrics**
1. ✅ No 404 errors in console
2. ✅ Invoice list loads correctly
3. ✅ Can create invoices
4. ✅ Can edit invoices
5. ✅ Can delete invoices
6. ✅ Payment links work
7. ✅ UI is modern and clean

---

## **Risk Mitigation**
- Test locally before deploying
- Make one change at a time
- Keep console open to monitor
- Clear cache after deployment
- Have rollback plan ready

---

## **Immediate Next Steps**
1. **EXECUTOR MODE**: Fix API routes in components
2. Test locally
3. Deploy to production
4. Verify functionality
5. Then enhance UI

---

## **Time Estimate**
- **Phase 1 (Routes)**: 30 minutes ⏱️
- **Phase 2 (Deploy)**: 15 minutes ⏱️
- **Phase 3 (UI)**: 2 hours ⏱️
- **Total**: ~3 hours to full completion

---

## **Decision Required**
Should we:
1. **Option A**: Fix routes only, deploy, then enhance UI? (Recommended)
2. **Option B**: Fix everything locally then deploy once?

**Recommendation**: Option A - Get it working first, enhance second

---

**Ready to switch to EXECUTOR MODE and implement Phase 1**
