# 🔧 Port Configuration Updated

## ✅ EONMEDS Now Uses Port 3001

Since you're using port 3000 for the PHARMAX platform, EONMEDS has been configured to use **port 3001**.

---

## 📋 What Was Changed

1. **package.json** - Added `PORT=3001` to start script
2. **.env.local** - Set `PORT=3001` and updated Auth0 redirect URL
3. **All documentation** - Updated to reflect port 3001

---

## 🚀 Running Both Applications

### PHARMAX Platform (Port 3000)
```bash
# In PHARMAX directory
npm start
# Runs on: http://localhost:3000
```

### EONMEDS Application (Port 3001)
```bash
# In EONPRO 2025/packages/frontend
npm start
# Runs on: http://localhost:3001
```

---

## ⚠️ IMPORTANT: Update Auth0 Dashboard

You MUST update Auth0 to include the new port:

1. Go to: https://manage.auth0.com/
2. Select tenant: `dev-dvouayl22wlz8zwq.us.auth0.com`
3. Find your app (Client ID: `VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L`)
4. Update these URLs:

### Callback URLs:
- `http://localhost:3001/callback` ← NEW PORT

### Logout URLs:
- `http://localhost:3001` ← NEW PORT

### Web Origins:
- `http://localhost:3001` ← NEW PORT

---

## 📝 Port Usage Summary

| Application | Port | URL |
|------------|------|-----|
| **PHARMAX Platform** | 3000 | http://localhost:3000 |
| **EONMEDS** | 3001 | http://localhost:3001 |
| **Backend (AWS)** | N/A | https://qm6dnecfhp.us-east-1.awsapprunner.com |

---

## 🧪 Testing

To test EONMEDS locally with the new port:

```bash
cd packages/frontend
npm start
# Browser opens at http://localhost:3001
```

The app will automatically use port 3001 because it's configured in `.env.local`.

---

## ✅ No Conflicts

Now you can run both applications simultaneously:
- PHARMAX on port 3000
- EONMEDS on port 3001

No port conflicts! 🎉
