import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export const DebugAuth: React.FC = () => {
  const { 
    isAuthenticated, 
    user, 
    getAccessTokenSilently,
    loginWithRedirect,
    logout,
    getIdTokenClaims
  } = useAuth0();
  
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [localStorage, setLocalStorage] = useState<any>({});
  
  useEffect(() => {
    const gatherDebugInfo = async () => {
      const info: any = {
        isAuthenticated,
        user,
        timestamp: new Date().toISOString()
      };
      
      // Try to get token claims
      try {
        const claims = await getIdTokenClaims();
        info.idTokenClaims = claims;
      } catch (e: any) {
        info.idTokenError = e.message;
      }
      
      // Try to get access token
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: process.env.REACT_APP_AUTH0_AUDIENCE,
            scope: 'openid profile email offline_access'
          },
          cacheMode: 'off'
        });
        info.hasAccessToken = true;
        info.tokenLength = token.length;
      } catch (e: any) {
        info.accessTokenError = e.message;
      }
      
      // Check localStorage
      const localStorageData: any = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.includes('auth0')) {
          try {
            const value = window.localStorage.getItem(key);
            localStorageData[key] = value ? JSON.parse(value) : null;
          } catch {
            localStorageData[key] = window.localStorage.getItem(key);
          }
        }
      }
      
      setDebugInfo(info);
      setLocalStorage(localStorageData);
    };
    
    if (isAuthenticated) {
      gatherDebugInfo();
    }
  }, [isAuthenticated, user, getAccessTokenSilently, getIdTokenClaims]);
  
  const handleDebugLogin = () => {
    // Log the exact parameters being sent
    console.log('🔍 Debug Login - Sending these parameters:');
    const authParams = {
      appState: { returnTo: '/debug-auth' },
      authorizationParams: {
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
        scope: 'openid profile email offline_access',
        response_type: 'code',
        prompt: 'login' as const // Force fresh login
      }
    };
    console.log(authParams);
    loginWithRedirect(authParams);
  };
  
  const handleClearAndLogout = () => {
    // Clear all Auth0 related storage
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.includes('auth0')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
    
    // Clear session storage too
    window.sessionStorage.clear();
    
    // Federated logout
    logout({
      logoutParams: {
        returnTo: window.location.origin + '/debug-auth',
        federated: true
      }
    });
  };
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Auth0 Debug Information</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleDebugLogin}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Debug Login (Force Fresh)
        </button>
        
        <button 
          onClick={handleClearAndLogout}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Everything & Logout
        </button>
      </div>
      
      <h2>Current State:</h2>
      <pre style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '10px', 
        borderRadius: '4px',
        overflow: 'auto'
      }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      
      <h2>LocalStorage (Auth0 Keys):</h2>
      <pre style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '10px', 
        borderRadius: '4px',
        overflow: 'auto'
      }}>
        {JSON.stringify(localStorage, null, 2)}
      </pre>
      
      <h2>Environment:</h2>
      <pre style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '10px', 
        borderRadius: '4px',
        overflow: 'auto'
      }}>
        {JSON.stringify({
          AUTH0_DOMAIN: process.env.REACT_APP_AUTH0_DOMAIN,
          AUTH0_CLIENT_ID: process.env.REACT_APP_AUTH0_CLIENT_ID,
          AUTH0_AUDIENCE: process.env.REACT_APP_AUTH0_AUDIENCE
        }, null, 2)}
      </pre>
    </div>
  );
};