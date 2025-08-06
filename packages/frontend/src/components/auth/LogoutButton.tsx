import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslation } from 'react-i18next';

interface LogoutButtonProps {
  className?: string;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ className }) => {
  const { logout } = useAuth0();
  const { t } = useTranslation('common');

  const handleLogout = () => {
    // Force federated logout to clear Auth0 server session
    logout({
      logoutParams: {
        returnTo: window.location.origin,
        federated: true // This ensures Auth0 server session is cleared
      }
    });
  };

  return (
    <button
      className={className || 'btn btn-secondary'}
      onClick={handleLogout}
    >
      {t('nav.logout')}
    </button>
  );
}; 