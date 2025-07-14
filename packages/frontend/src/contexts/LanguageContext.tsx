import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth.service';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  availableLanguages: { code: string; name: string; nativeName: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' }
];

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { i18n } = useTranslation();

  // Sync language preference from Auth0 user metadata
  useEffect(() => {
    if (isAuthenticated && user?.user_metadata?.language) {
      const userLang = user.user_metadata.language;
      if (userLang !== i18n.language) {
        i18n.changeLanguage(userLang);
      }
    }
  }, [isAuthenticated, user, i18n]);

  // Update language preference in Auth0 and locally
  const changeLanguage = useCallback(async (lang: string) => {
    try {
      // Change language locally first for immediate feedback
      await i18n.changeLanguage(lang);
      
      // If user is authenticated, update Auth0 user metadata
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          await authService.updateProfileWithToken(token, { language: lang });
        } catch (error) {
          console.error('Failed to update language preference in Auth0:', error);
          // Don't throw - local change was successful
        }
      }
      
      // Store in localStorage as backup
      localStorage.setItem('eonmeds_language', lang);
      
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  }, [i18n, isAuthenticated, getAccessTokenSilently]);

  const value: LanguageContextType = {
    currentLanguage: i18n.language,
    changeLanguage,
    availableLanguages
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 