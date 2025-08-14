import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';

export const DebugDashboard: React.FC = () => {
  const { user, getIdTokenClaims, isAuthenticated } = useAuth0();
  const { roles, isAdmin, isSuperAdmin, hasRole } = useAuth();
  const [idTokenClaims, setIdTokenClaims] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      if (isAuthenticated) {
        try {
          const claims = await getIdTokenClaims();
          setIdTokenClaims(claims);
        } catch (error) {
          console.error('Error fetching claims:', error);
        }
      }
      setLoading(false);
    };
    fetchClaims();
  }, [isAuthenticated, getIdTokenClaims]);

  if (loading) return <div>Loading debug info...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Dashboard - Role Information</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h2>Authentication Status</h2>
        <p>Is Authenticated: {isAuthenticated ? 'YES ✅' : 'NO ❌'}</p>
        <p>User Email: {user?.email || 'Not available'}</p>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e8f5e9' }}>
        <h2>Roles from useAuth Hook</h2>
        <p>Roles Array: {JSON.stringify(roles, null, 2)}</p>
        <p>Is Admin: {isAdmin() ? 'YES ✅' : 'NO ❌'}</p>
        <p>Is SuperAdmin: {isSuperAdmin() ? 'YES ✅' : 'NO ❌'}</p>
        <p>Has 'admin' role: {hasRole('admin') ? 'YES ✅' : 'NO ❌'}</p>
        <p>Has 'superadmin' role: {hasRole('superadmin') ? 'YES ✅' : 'NO ❌'}</p>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fff3e0' }}>
        <h2>ID Token Claims</h2>
        <p>Looking for roles at: https://eonmeds.com/roles</p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {idTokenClaims ? JSON.stringify(idTokenClaims, null, 2) : 'No claims available'}
        </pre>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f3e5f5' }}>
        <h2>User Object from Auth0</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {user ? JSON.stringify(user, null, 2) : 'No user object available'}
        </pre>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#ffebee' }}>
        <h2>What You Need to Do</h2>
        <ol>
          <li>Check if roles appear in the "ID Token Claims" section above</li>
          <li>If no roles in token: Create Auth0 Action to add roles (see AUTH0_ACTION_SETUP.md)</li>
          <li>If roles in token but still no dashboard: The role detection code may need adjustment</li>
          <li>Make sure your Auth0 user has 'admin' or 'superadmin' role assigned</li>
        </ol>
      </div>
    </div>
  );
};
