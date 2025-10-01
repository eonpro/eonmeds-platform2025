// Unified Auth0 Configuration - Single Source of Truth
// Created: January 6, 2025
// Updated: January 7, 2025 - Production-ready configuration
// This file centralizes all Auth0 configuration to prevent scattered values
// IMPORTANT: SPAs should NOT use client secrets - using PKCE flow instead

export const AUTH0_CONFIG = {
  // Auth0 Tenant Configuration
  domain: 'dev-dvouayl22wlz8zwq.us.auth0.com',
  clientId: 'VPA89aq0Y7N05GvX5KqkDm5JLXPknG0L',
  audience: 'https://api.eonmeds.com',
  
  // Environment-specific redirect URIs
  redirectUri: process.env.NODE_ENV === 'production'
    ? 'https://d3p4f8m2bxony8.cloudfront.net/callback'
    : 'http://localhost:3001/callback',
  
  // Logout redirect
  logoutUri: process.env.NODE_ENV === 'production'
    ? 'https://d3p4f8m2bxony8.cloudfront.net'
    : 'http://localhost:3001',
  
  // API Configuration
  apiBaseUrl: process.env.NODE_ENV === 'production'
    ? 'https://qm6dnecfhp.us-east-1.awsapprunner.com'
    : 'http://localhost:8080',
  
  // Auth0 Scopes
  scope: 'openid profile email offline_access',
  
  // Additional settings
  cacheLocation: 'localstorage',
  useRefreshTokens: true,
};

// Validation at module load time
if (!AUTH0_CONFIG.domain || !AUTH0_CONFIG.clientId || !AUTH0_CONFIG.audience) {
  console.error('⚠️ Auth0 configuration is incomplete!');
  console.error('Current config:', AUTH0_CONFIG);
  // Don't throw in production to avoid breaking the app
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Auth0 configuration is missing required fields!');
  }
}

// Log configuration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🔐 Auth0 Configuration Loaded:', {
    domain: AUTH0_CONFIG.domain,
    clientId: AUTH0_CONFIG.clientId,
    audience: AUTH0_CONFIG.audience,
    redirectUri: AUTH0_CONFIG.redirectUri,
  });
}

export default AUTH0_CONFIG;
