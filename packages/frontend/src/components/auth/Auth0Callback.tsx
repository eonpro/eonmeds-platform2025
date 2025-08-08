import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

export const Auth0Callback: React.FC = () => {
  const { isLoading, error } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Auth0Callback component mounted');
    console.log('URL:', window.location.href);
    console.log('Loading:', isLoading);
    console.log('Error:', error);
  }, [isLoading, error]);

  useEffect(() => {
    if (!isLoading && !error) {
      console.log('Auth complete, navigating to dashboard');
      navigate('/dashboard');
    }
  }, [isLoading, error, navigate]);

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Authentication Error</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.href = '/'}>Go Home</button>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h2>Completing login...</h2>
      <p>Please wait while we redirect you.</p>
    </div>
  );
};
