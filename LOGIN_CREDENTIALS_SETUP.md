# 🔑 Login Credentials - How to Get Them

## I don't have your existing passwords, but here's how to get login access:

---

## Option 1: Check for Existing Users (FASTEST)

1. Go to: https://manage.auth0.com/
2. Select tenant: `dev-dvouayl22wlz8zwq.us.auth0.com`
3. Go to **User Management** → **Users**
4. Look for any existing users (you might see emails like):
   - Your personal email
   - test@eonmeds.com
   - admin@eonmeds.com
5. If you see a user but forgot password:
   - Click "Forgot Password?" on the login screen
   - Enter the email
   - Check your email for reset link

---

## Option 2: Create a New Test User (RECOMMENDED)

### In Auth0 Dashboard:
1. Go to **User Management** → **Users**
2. Click **"+ Create User"**
3. Fill in:
   ```
   Email: test@eonmeds.com
   Password: Test123!@#
   Connection: Username-Password-Authentication
   ```
4. Click **Create**

### Your Test Login Would Be:
- **Email**: test@eonmeds.com
- **Password**: Test123!@#

---

## Option 3: Enable Self-Registration

1. In Auth0: **Authentication** → **Database**
2. Click on `Username-Password-Authentication`
3. Toggle **"Disable Sign Ups"** to **OFF**
4. Now you can click "Sign Up" on the login page
5. Create your own account with any email/password

---

## Option 4: Create Admin User

### Quick Admin User Setup:
```
Email: admin@eonmeds.com
Password: Admin123!@#
Role: admin (assign after creation)
```

### To Assign Admin Role:
1. Create the user first
2. Click on the user in Auth0
3. Go to **Roles** tab
4. Click **Assign Roles**
5. Create/select "admin" role

---

## 🧪 Quick Test Credentials

If you want to quickly test, create this user in Auth0:

### Test User:
```
Email: demo@eonmeds.com
Password: Demo2025!@#
```

### Steps:
1. Go to Auth0 Dashboard
2. User Management → Users → + Create User
3. Enter the above credentials
4. Save
5. Login at: https://d3p4f8m2bxony8.cloudfront.net

---

## ⚠️ Common Login Issues

### "User doesn't exist"
→ You need to create the user in Auth0 first

### "Wrong password"
→ Use "Forgot Password?" link

### "Callback URL mismatch"
→ Make sure you added all URLs to Auth0 (see previous instructions)

### "CORS error"
→ Add URLs to "Allowed Web Origins" in Auth0

---

## 🚀 Ready to Login?

1. **Create a user** using Option 2 above
2. **Go to**: https://d3p4f8m2bxony8.cloudfront.net
3. **Click Login**
4. **Enter** the credentials you just created
5. **Success!**

---

## 📝 No Existing Users?

If Auth0 shows no users, you'll need to create one. The platform doesn't come with default users for security reasons. Use Option 2 above to create your first user!

**Remember**: I can't see your passwords - they're encrypted in Auth0. You need to either:
- Remember your existing password
- Reset it using "Forgot Password"
- Create a new user
