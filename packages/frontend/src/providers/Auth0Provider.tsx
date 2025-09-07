import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import AUTH0_CONFIG from '../config/auth0.config';

interface Auth0ProviderWithNavigateProps {
  children: React.ReactNode;
}

export const Auth0ProviderWithNavigate = ({ children }: Auth0ProviderWithNavigateProps) => {
  const navigate = useNavigate();

  // Using centralized Auth0 configuration
  const { domain, clientId, audience, redirectUri, scope, cacheLocation, useRefreshTokens } = AUTH0_CONFIG;

  console.log('🔐 Auth0 Provider Initialized:', {
    domain,
    clientId,
    audience,
    redirectUri,
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
        scope: scope,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation={cacheLocation}
      useRefreshTokens={useRefreshTokens}
    >
      {children}
    </Auth0Provider>
  );
};
