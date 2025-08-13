// Configuration for the React app
const config = {
  API_URL:
    process.env.REACT_APP_API_URL ||
    "https://eonmeds-platform2025-production.up.railway.app",
  STRIPE_PUBLISHABLE_KEY:
    process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
    "pk_live_51RPS5NGzKhM7cZeGlOITW4CImzbMEldvaRbrBQV894nLYUjnSM7rNKTpzeYVZJVOhCbNxmOvOjnR7RN60XdAHvJ100Ksh6ziwy",
  AUTH0_DOMAIN: process.env.REACT_APP_AUTH0_DOMAIN || "eonmeds.us.auth0.com",
  AUTH0_CLIENT_ID:
    process.env.REACT_APP_AUTH0_CLIENT_ID || "PUFG93lFKClBBSaeNNyOF10esoSdPPXl",
  AUTH0_AUDIENCE:
    process.env.REACT_APP_AUTH0_AUDIENCE || "https://api.eonmeds.com",
};

export default config;
