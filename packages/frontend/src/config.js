// Configuration for the React app
// HARDCODED Auth0 values for immediate fix - Jan 6, 2025
const config = {
  API_URL:
    process.env.REACT_APP_API_URL || 'https://qm6dnecfhp.us-east-1.awsapprunner.com',
  STRIPE_PUBLISHABLE_KEY:
    process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
    'pk_live_51RPS5NGzKhM7cZeGlOITW4CImzbMEldvaRbrBQV894nLYUjnSM7rNKTpzeYVZJVOhCbNxmOvOjnR7RN60XdAHvJ100Ksh6ziwy',
  // HARDCODED - Using correct Auth0 tenant
  AUTH0_DOMAIN: 'dev-dvouayl22wlz8zwq.us.auth0.com',
  AUTH0_CLIENT_ID: 'VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L',
  AUTH0_AUDIENCE: 'https://api.eonmeds.com',
};

export default config;
