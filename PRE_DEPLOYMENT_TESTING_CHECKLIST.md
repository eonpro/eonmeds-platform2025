# PRE-DEPLOYMENT TESTING CHECKLIST

## 🚨 ALWAYS TEST LOCALLY BEFORE DEPLOYING!

Created: August 16, 2025

---

## 📋 MASTER CHECKLIST

### Step 1: Backend Testing (15 minutes)

```bash
cd packages/backend
```

#### A. Build Test
```bash
# This MUST succeed with no errors
npm run build

# Expected output:
# ✓ No TypeScript errors
# ✓ Creates dist/ folder
# ✓ Exit code 0
```

#### B. Start Backend
```bash
npm run dev

# Expected output:
# 🚀 Server is running!
# 📡 Listening on port 8080
# ✅ Database connected successfully
```

#### C. API Health Checks
```bash
# In a new terminal:

# 1. Basic health check
curl http://localhost:8080/api/v1/health
# Expected: {"status":"ok"}

# 2. Check billing endpoints exist
curl http://localhost:8080/api/v1/billing/invoices
# Expected: [] or list of invoices (not 404)

# 3. Check Stripe webhook endpoint
curl -X POST http://localhost:8080/api/v1/webhooks/stripe
# Expected: Webhook error (not 404)
```

#### D. Check for Common Issues
- [ ] No TypeScript compilation errors
- [ ] No missing dependencies errors
- [ ] Database connects successfully
- [ ] Stripe client initializes
- [ ] No port conflicts

---

### Step 2: Frontend Testing (15 minutes)

```bash
cd packages/frontend
```

#### A. Install & Build Test
```bash
# Install dependencies
npm install

# Test build
npm run build

# Expected output:
# ✓ Creating an optimized production build...
# ✓ Compiled successfully.
# ✓ Build folder created
```

#### B. Start Frontend
```bash
npm start

# Expected output:
# Compiled successfully!
# You can now view frontend in the browser.
# Local: http://localhost:3000
```

#### C. Visual Inspection Checklist
Open http://localhost:3000 in your browser:

- [ ] Homepage loads without errors
- [ ] No console errors (F12 → Console)
- [ ] Login button works
- [ ] After login, sidebar appears
- [ ] "Billing Center" appears in sidebar menu
- [ ] Clicking "Billing Center" navigates to /billing
- [ ] Billing dashboard renders (not 404)
- [ ] UI looks correct (no broken styles)

#### D. Network Inspection
Open Developer Tools (F12) → Network tab:

- [ ] API calls go to correct backend URL
- [ ] No CORS errors
- [ ] No 404s for JS/CSS files
- [ ] API calls have proper auth headers

---

### Step 3: Integration Testing (10 minutes)

Run BOTH frontend and backend simultaneously:

#### Terminal 1: Backend
```bash
cd packages/backend
npm run dev
# Leave running at http://localhost:8080
```

#### Terminal 2: Frontend
```bash
cd packages/frontend
npm start
# Leave running at http://localhost:3000
```

#### Test Full Flow:
1. [ ] Open http://localhost:3000
2. [ ] Log in successfully
3. [ ] Navigate to Billing Center
4. [ ] Create test invoice
5. [ ] View invoice list
6. [ ] No errors in either terminal

---

## 🔍 WHAT TO CHECK FOR

### ✅ Green Flags (Good to Deploy):
- All builds succeed
- No TypeScript errors
- All pages load
- API calls work
- No console errors
- Features work end-to-end

### 🔴 Red Flags (DO NOT DEPLOY):
- Build failures
- TypeScript errors
- 404 pages
- Console errors
- API connection failures
- Missing environment variables
- "Module not found" errors

---

## 🚀 DEPLOYMENT SEQUENCE

### Only Deploy If ALL Tests Pass!

#### 1. Deploy Backend First
```bash
# Method A: Auto-deploy via git
git add -A
git commit -m "feat: Add billing system backend"
git push origin main

# Method B: Manual deploy
railway service eonmeds-platform2025
railway up
```

Wait for successful deployment in Railway logs.

#### 2. Deploy Frontend Second
```bash
railway service intuitive-learning
railway up
```

Wait for successful deployment.

#### 3. Verify Production
- [ ] Check https://intuitive-learning-production.up.railway.app
- [ ] Log in and test billing features
- [ ] Check for any console errors
- [ ] Verify API calls work

---

## 🐛 COMMON ISSUES & FIXES

### Backend Won't Build
```bash
# Fix TypeScript errors first
npm run build
# Address each error before deploying
```

### Frontend Won't Build
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Calls Failing
```bash
# Check frontend .env file
# Ensure REACT_APP_API_URL is correct:
REACT_APP_API_URL=http://localhost:8080  # for local
REACT_APP_API_URL=https://eonmeds-platform2025-production.up.railway.app  # for production
```

### Database Connection Fails
```bash
# Check backend .env file
# Ensure DATABASE_URL is set correctly
```

---

## 📝 FINAL CHECKLIST BEFORE DEPLOYING

### Backend Ready?
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts without errors
- [ ] API endpoints respond correctly
- [ ] No TypeScript errors
- [ ] Environment variables set

### Frontend Ready?
- [ ] `npm run build` succeeds
- [ ] `npm start` works locally
- [ ] All pages load correctly
- [ ] Billing features visible
- [ ] API URL configured correctly

### Integration Ready?
- [ ] Frontend can call backend
- [ ] Authentication works
- [ ] Full user flows work
- [ ] No console errors
- [ ] No network errors

### IF ALL CHECKED ✅ → SAFE TO DEPLOY!
### IF ANY ❌ → FIX LOCALLY FIRST!

---

## 🎯 REMEMBER

1. **Test Locally First** - Never deploy untested code
2. **Check the Right Service** - Frontend for UI, Backend for API
3. **Read Error Messages** - They tell you what's wrong
4. **One Change at a Time** - Easier to debug
5. **Verify in Production** - Always check after deploying

---

## 🆘 EMERGENCY ROLLBACK

If something breaks after deployment:

### Railway Dashboard Method:
1. Go to Railway dashboard
2. Click on the broken service
3. Go to "Deployments" tab
4. Find last working deployment
5. Click "Redeploy" on that version

### CLI Method:
```bash
# List recent deployments
railway deployments

# Rollback to specific deployment
railway rollback <deployment-id>
```
