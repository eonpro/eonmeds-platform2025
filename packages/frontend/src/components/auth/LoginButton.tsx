import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslation } from 'react-i18next';

interface LoginButtonProps {
  className?: string;
}

export const LoginButton: React.FC<LoginButtonProps> = ({ className }) => {
  const { loginWithRedirect } = useAuth0();
  const { t } = useTranslation('common');

  const handleLogin = () => {
    loginWithRedirect({
      appState: {
        returnTo: window.location.pathname
      }
    });
  };

  return (
    <button
      className={className || 'btn btn-primary'}
      onClick={handleLogin}
    >
      {t('nav.login')}
    </button>
  );
}; 