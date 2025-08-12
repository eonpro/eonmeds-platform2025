import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { BUILD_INFO } from '../../config/buildInfo';

export const BuildStamp: React.FC = () => {
  const { user } = useAuth0();
  
  // Only show for admin users
  const userRoles = user?.['https://eonmeds.com/roles'] || user?.roles || [];
  const isAdmin = userRoles.includes('superadmin') || userRoles.includes('admin');
  
  if (!isAdmin) {
    return null;
  }

  const formatBuildTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      fontSize: '11px',
      color: '#999',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '4px 8px',
      borderRadius: '4px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      fontFamily: 'monospace',
      zIndex: 1000
    }}>
      <div>Build: {formatBuildTime(BUILD_INFO.buildTime)}</div>
      <div>v{BUILD_INFO.version} • {BUILD_INFO.environment}</div>
    </div>
  );
};
