import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

interface Auth0ProviderWithNavigateProps {
  children: React.ReactNode;
}

export const Auth0ProviderWithNavigate = ({ children }: Auth0ProviderWithNavigateProps) => {
  const navigate = useNavigate();
  
  const domain = process.env.REACT_APP_AUTH0_DOMAIN!;
  const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID!;
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE!;
  
  // Use the correct redirect URI based on environment
  const redirectUri = process.env.NODE_ENV === 'production' 
    ? 'https://intuitive-learning-production.up.railway.app/callback'
    : 'http://localhost:3000/callback';

  if (!domain || !clientId || !audience) {
    throw new Error('Auth0 configuration is missing. Please check your environment variables.');
  }

  console.log('🔐 Auth0 Configuration:', {
    domain,
    clientId,
    audience,
    redirectUri
  });

  const onRedirectCallback = (appState?: any) => {
    console.log('🔍 Auth0 Redirect Callback triggered');
    console.log('AppState:', appState);
    console.log('Window location:', window.location.href);
    console.log('URL params:', window.location.search);
    
    // Remove the auth params from the URL
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, document.title, url.pathname);
    
    navigate(appState?.returnTo || '/dashboard');
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience,
        scope: 'openid profile email offline_access'
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      {children}
    </Auth0Provider>
  );
}; 