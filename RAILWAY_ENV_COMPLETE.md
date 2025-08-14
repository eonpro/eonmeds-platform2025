# Complete Railway Environment Variables

## Frontend Service (intuitive-learning)

### API Configuration

```
REACT_APP_API_BASE_URL=https://eonmeds-platform2025-production.up.railway.app/api/v1
REACT_APP_API_URL=https://eonmeds-platform2025-production.up.railway.app
```

### Auth0 Configuration

```
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_REDIRECT_URI=https://intuitive-learning-production.up.railway.app/callback
```

### Stripe Configuration

```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_51RPS5NGzKhM7cZeGlQITW4CImzbMEldvaRbrBQV894nLYUjnSM7rNKTpzeYVZJVOhCbNxmOvOjnR7RN60XdAHvJ100KshGziwM
```

## Backend Service (eonmeds-platform2025)

### Auth0 Configuration

```
AUTH0_AUDIENCE=https://api.eonmeds.com
AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
```

### Database Configuration

```
DATABASE_URL=postgresql://eonmeds_admin:398Xakf$57@eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com:5432/eonmeds?sslmode=disable
DB_HOST=eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com
DB_NAME=eonmeds
DB_PASSWORD=398Xakf$57
DB_PORT=5432
DB_SSL=false
DB_USER=eonmeds_admin
```

### Security Configuration

```
JWT_SECRET=/gkKu/5Hxop6UYTbbp9A94Ipyh8uRXObGRHs0tWXExw=
HEYFLOW_WEBHOOK_SECRET=398Xakf$57
```

### Environment Configuration

```
NODE_ENV=production
```

### OpenAI Configuration

```
OPENAI_API_KEY=sk-proj-qaKH9Nptoo8Q1X1bfpWu8QsjzL5a456DXYQ1-pH-aWq9TrdRz8RqU87xwkLExq53TqN8GAieB9T3BlbkFJOJL1NbIY66UInqKUSKUM1fXBGJ8DxdiZGu3HJRGNqU_iMWNLTzaPstPZ9nVHbbxeP1utjPCpJgA
```

### Stripe Configuration

```
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_3l3mCp3g2kd50an0PpgQJuBqUfNKGGYv
```

## Important Notes

1. **NEVER CHANGE THESE VALUES** - They are production credentials
2. The Auth0 domain is `dev-dvouayl22wlz8zwq.us.auth0.com` NOT `eonmeds.us.auth0.com`
3. All API URLs point to the Railway backend service
4. Database SSL is disabled (`sslmode=disable` in DATABASE_URL)
5. Both services use the same Auth0 configuration for consistency

## Deployment URLs

- Frontend: https://intuitive-learning-production.up.railway.app
- Backend: https://eonmeds-platform2025-production.up.railway.app

## Additional Auth0 Settings (from dashboard)

### Client Secret

```
-m-_pXKhsatTz88dK1jG7LLruSgsikaf9vQRjFQIDODjzKyL3d3F_xsJctwMpVz6
```

### Allowed Callback URLs

```
http://localhost:3001/callback
http://localhost:3000/callback
http://127.0.0.1:3001/callback
https://intuitive-learning-production.up.railway.app/callback
https://intuitive-learning-production.up.railway.app
https://eonmeds-platform2025-production.up.railway.app/dashboard
https://intuitive-learning-production.up.railway.app/dashboard
```
