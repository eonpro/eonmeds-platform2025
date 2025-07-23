# Correct Auth0 Configuration

Based on your Auth0 dashboard, these are the correct values:

## Backend Environment Variables (Railway)
```
AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
AUTH0_AUDIENCE=https://api.eonmeds.com
```

## Frontend Environment Variables (Railway)
```
REACT_APP_AUTH0_DOMAIN=dev-dvouayl22wlz8zwq.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L
REACT_APP_AUTH0_AUDIENCE=https://api.eonmeds.com
```

## Important Notes
1. The domain is `dev-dvouayl22wlz8zwq.us.auth0.com` NOT `eonmeds.us.auth0.com`
2. The audience remains `https://api.eonmeds.com`
3. The Client ID is `VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L`

## Where to Set These
1. In Railway backend service, go to Variables tab and add/update these
2. In Railway frontend service, go to Variables tab and add/update these
3. After setting, Railway will automatically redeploy with the correct configuration 