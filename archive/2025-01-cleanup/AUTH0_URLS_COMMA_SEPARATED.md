# ✅ Auth0 URLs - Comma Separated Format

## Copy & Paste These EXACTLY into Auth0:

### 1️⃣ Allowed Callback URLs
Copy this entire line and paste it:
```
https://d3p4f8m2bxony8.cloudfront.net/callback, http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback, https://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com/callback, http://localhost:3001/callback
```

### 2️⃣ Allowed Logout URLs
Copy this entire line and paste it:
```
https://d3p4f8m2bxony8.cloudfront.net, http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com, https://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com, http://localhost:3001
```

### 3️⃣ Allowed Web Origins
Copy this entire line and paste it:
```
https://d3p4f8m2bxony8.cloudfront.net, http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com, https://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com, http://localhost:3001
```

### 4️⃣ Allowed Origins (CORS) - If you see this field
Same as Web Origins:
```
https://d3p4f8m2bxony8.cloudfront.net, http://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com, https://eonmeds-frontend-staging.s3-website-us-east-1.amazonaws.com, http://localhost:3001
```

---

## 📋 Quick Instructions:

1. **Go to Auth0**: Click "Application Settings page" in your error OR go to https://manage.auth0.com/
2. **Find your app**: Client ID `VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L`
3. **Go to Settings tab**
4. **Paste the comma-separated URLs** into each field above
5. **Scroll down and click "Save Changes"**
6. **Use CloudFront**: https://d3p4f8m2bxony8.cloudfront.net

---

## ⚠️ Important Notes:
- Use commas and spaces between URLs (`, `)
- Include both HTTP and HTTPS versions of S3 URL
- Don't forget to SAVE at the bottom
- After saving, use CloudFront URL (not S3 directly)
