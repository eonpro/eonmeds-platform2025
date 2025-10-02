# 🌐 PHASE 1: Domain Migration to Cloudflare
## Immediate Action Plan - January 7, 2025

---

## 📋 Pre-Migration Checklist

### Current Domain Status
- [ ] Domain: `eonpro.app`
- [ ] Current Registrar: Wix/GoDaddy
- [ ] Current DNS: Wix/GoDaddy nameservers
- [ ] SSL: Basic (registrar provided)
- [ ] Email: Not configured

### Required Access
- [ ] Domain registrar admin access (Wix/GoDaddy)
- [ ] Cloudflare account (create if needed)
- [ ] AWS console access (for verifying endpoints)
- [ ] Auth0 admin access (for custom domain)

---

## 🚀 Step-by-Step Migration Process

### Step 1: Create Cloudflare Account (5 minutes)
```bash
1. Go to https://dash.cloudflare.com/sign-up
2. Create account with admin@eonpro.app
3. Verify email
4. Select "Add a Site"
```

### Step 2: Add Domain to Cloudflare (10 minutes)
```bash
1. Enter domain: eonpro.app
2. Select plan: Pro ($20/month) - Required for HIPAA
3. Cloudflare will scan existing DNS records
4. Review and confirm DNS records
5. Note the Cloudflare nameservers provided:
   - Example: nina.ns.cloudflare.com
   - Example: todd.ns.cloudflare.com
```

### Step 3: Export Current DNS Records (15 minutes)
Before changing nameservers, document all existing records:

```bash
# Current DNS Records to Preserve
# (Check these in Wix/GoDaddy DNS management)

Type    Name    Value                                   TTL     Priority
----    ----    -----                                   ---     --------
A       @       [Current website IP]                    3600    -
A       www     [Current website IP]                    3600    -
MX      @       [Email server if configured]            3600    10
TXT     @       [Any verification records]               3600    -
```

### Step 4: Configure Cloudflare DNS Records (20 minutes)

Add these DNS records in Cloudflare Dashboard:

```yaml
# Production Frontend (CloudFront)
Type: CNAME
Name: @
Target: d3p4f8m2bxony8.cloudfront.net
Proxy: ✅ (Orange cloud ON)
TTL: Auto

Type: CNAME  
Name: www
Target: d3p4f8m2bxony8.cloudfront.net
Proxy: ✅ (Orange cloud ON)
TTL: Auto

# API Backend (App Runner)
Type: CNAME
Name: api
Target: qm6dnecfhp.us-east-1.awsapprunner.com
Proxy: ✅ (Orange cloud ON)
TTL: Auto

# Auth0 Custom Domain
Type: CNAME
Name: auth
Target: dev-dvouayl22wlz8zwq.us.auth0.com
Proxy: ❌ (Gray cloud OFF - Auth0 handles SSL)
TTL: Auto

# Email (if using Google Workspace)
Type: MX
Name: @
Mail server: aspmx.l.google.com
Priority: 1
TTL: Auto

Type: MX
Name: @
Mail server: alt1.aspmx.l.google.com
Priority: 5
TTL: Auto

# SPF Record (Email authentication)
Type: TXT
Name: @
Content: "v=spf1 include:_spf.google.com ~all"
TTL: Auto

# DMARC Record (Email security)
Type: TXT
Name: _dmarc
Content: "v=DMARC1; p=quarantine; rua=mailto:admin@eonpro.app"
TTL: Auto

# Domain Verification Records (keep any existing)
Type: TXT
Name: @
Content: [Any Google/Microsoft/etc verification strings]
TTL: Auto
```

### Step 5: Update Nameservers at Registrar (10 minutes)

#### For Wix:
```
1. Log into Wix account
2. Go to Subscriptions → Domains
3. Click on eonpro.app → Manage → Advanced → Transfer Away
4. Select "Change Name Servers"
5. Remove Wix nameservers
6. Add Cloudflare nameservers:
   - nina.ns.cloudflare.com
   - todd.ns.cloudflare.com
7. Save changes
```

#### For GoDaddy:
```
1. Log into GoDaddy account
2. Go to My Products → Domains
3. Click on eonpro.app → DNS
4. Select "Change Nameservers"
5. Choose "Custom Nameservers"
6. Enter Cloudflare nameservers:
   - nina.ns.cloudflare.com
   - todd.ns.cloudflare.com
7. Save changes
```

### Step 6: Configure Cloudflare Settings (15 minutes)

#### SSL/TLS Settings:
```
1. Go to SSL/TLS → Overview
2. Set encryption mode: Full (strict)
3. Go to SSL/TLS → Edge Certificates
4. Enable:
   - Always Use HTTPS: ON
   - Automatic HTTPS Rewrites: ON
   - Minimum TLS Version: 1.2
```

#### Security Settings:
```
1. Go to Security → Settings
2. Security Level: High
3. Challenge Passage: 30 minutes
4. Browser Integrity Check: ON
```

#### WAF (Web Application Firewall):
```
1. Go to Security → WAF
2. Create custom rules:
   - Block countries (if needed)
   - Rate limiting rules
   - OWASP Core Ruleset: ON
```

#### Performance Settings:
```
1. Go to Speed → Optimization
2. Enable:
   - Auto Minify: JavaScript, CSS, HTML
   - Brotli: ON
   - Rocket Loader: ON
   - Mirage: ON
```

#### Page Rules (3 rules included in Pro):
```
Rule 1: API Caching
URL: api.eonpro.app/*
Settings:
- Cache Level: Bypass
- Security Level: High

Rule 2: Static Assets
URL: *.eonpro.app/*.{jpg,jpeg,png,gif,css,js}
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month

Rule 3: Admin Protection
URL: */admin/*
Settings:
- Security Level: High
- Browser Integrity Check: ON
```

### Step 7: Wait for DNS Propagation (5-48 hours)

Check propagation status:
```bash
# Check nameserver propagation
nslookup -type=NS eonpro.app

# Check A record
nslookup eonpro.app

# Check globally
https://www.whatsmydns.net/#NS/eonpro.app
```

### Step 8: Verify Services After Propagation

```bash
# Test main site
curl -I https://eonpro.app
# Expected: 200 OK

# Test www redirect
curl -I https://www.eonpro.app
# Expected: 301 redirect to https://eonpro.app

# Test API
curl https://api.eonpro.app/health
# Expected: {"status":"healthy"}

# Test Auth0 custom domain
curl -I https://auth.eonpro.app
# Expected: 200 OK or redirect to Auth0
```

### Step 9: Update Application Configurations

#### Frontend (.env.production):
```javascript
REACT_APP_API_URL=https://api.eonpro.app
REACT_APP_AUTH0_DOMAIN=auth.eonpro.app
REACT_APP_AUTH0_REDIRECT_URI=https://eonpro.app/callback
REACT_APP_AUTH0_LOGOUT_URL=https://eonpro.app
```

#### Backend (AWS Secrets Manager):
```javascript
{
  "CORS_ORIGIN": "https://eonpro.app,https://www.eonpro.app",
  "AUTH0_DOMAIN": "auth.eonpro.app",
  "FRONTEND_URL": "https://eonpro.app"
}
```

#### Auth0 Dashboard:
```
Allowed Callback URLs:
- https://eonpro.app/callback
- https://www.eonpro.app/callback

Allowed Logout URLs:
- https://eonpro.app
- https://www.eonpro.app

Allowed Web Origins:
- https://eonpro.app
- https://www.eonpro.app
```

### Step 10: Configure Auth0 Custom Domain

```bash
1. In Auth0 Dashboard → Settings → Custom Domains
2. Add domain: auth.eonpro.app
3. Auth0 will provide a verification TXT record
4. Add to Cloudflare:
   Type: TXT
   Name: _cf-custom-hostname.auth
   Content: [verification string from Auth0]
5. Click "Verify" in Auth0
6. Configure SSL certificate (Auth0 manages this)
```

---

## 🔍 Post-Migration Verification

### Functionality Tests:
```bash
# 1. Homepage loads
open https://eonpro.app

# 2. Login works
# Try logging in with test account

# 3. API calls work
curl -H "Authorization: Bearer [token]" \
  https://api.eonpro.app/api/v1/patients

# 4. Webhooks work
# Test Stripe webhook
# Test HeyFlow webhook
```

### Security Tests:
```bash
# SSL Certificate
https://www.ssllabs.com/ssltest/analyze.html?d=eonpro.app

# Security Headers
https://securityheaders.com/?q=eonpro.app

# DNS Security
https://dnsviz.net/d/eonpro.app/analyze/
```

---

## 🚨 Rollback Plan

If issues occur, you can quickly revert:

1. **Revert Nameservers**:
   - Go back to registrar
   - Change nameservers back to original
   - DNS will propagate back in 1-4 hours

2. **Keep Cloudflare Active**:
   - Update DNS records to point to old servers
   - Maintains Cloudflare benefits
   - Instant changes

---

## 📊 Success Metrics

After 24 hours, verify:
- [ ] ✅ All DNS records resolving correctly
- [ ] ✅ SSL certificate active (padlock in browser)
- [ ] ✅ No downtime reported
- [ ] ✅ API response times < 200ms
- [ ] ✅ Login/logout working
- [ ] ✅ Webhooks processing
- [ ] ✅ Email delivery working (if configured)

---

## 💰 Cloudflare Pro Features You Get

- **Security**:
  - WAF with OWASP rules
  - DDoS protection
  - Bot management
  - Rate limiting

- **Performance**:
  - Global CDN
  - Image optimization
  - Brotli compression
  - HTTP/3 support

- **Reliability**:
  - 100% uptime SLA
  - Automatic failover
  - Load balancing (add-on)

- **Analytics**:
  - Real-time analytics
  - Security insights
  - Performance metrics

---

## 📞 Support Contacts

- **Cloudflare Support**: Available 24/7 with Pro plan
- **Domain Registrar**: Check account for support options
- **AWS Support**: Via AWS Console
- **Auth0 Support**: support@auth0.com

---

## ⏰ Timeline

**Total Time: 2-4 hours active work + 5-48 hours propagation**

- Setup & Configuration: 1-2 hours
- DNS Propagation: 5-48 hours (usually 1-4 hours)
- Verification & Testing: 1 hour
- Auth0 Custom Domain: 1 hour

**Best Time to Execute**: 
- Start Tuesday evening (low traffic)
- Monitor Wednesday morning
- Full propagation by Thursday

---

*Ready to begin? Start with Step 1: Create Cloudflare Account*
