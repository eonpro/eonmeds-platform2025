import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import authService from '../services/auth.service';

export const useAuth = () => {
  const auth0 = useAuth0();
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>('en');

  useEffect(() => {
    // Set auth0 instance in auth service
    authService.setAuth0(auth0);

    const loadAuthData = async () => {
      if (auth0.isAuthenticated) {
        try {
          const claims = await auth0.getIdTokenClaims();
          setRoles(claims?.['https://eonmeds.com/roles'] || []);
          setPermissions(claims?.permissions || []);
          setLanguage(claims?.['https://eonmeds.com/language'] || 'en');
        } catch (error) {
          console.error('Error loading auth data:', error);
        }
      }
    };

    loadAuthData();
  }, [auth0, auth0.isAuthenticated]);

  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyRole = (roleList: string[]): boolean => {
    return roleList.some((role) => hasRole(role));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every((permission) => hasPermission(permission));
  };

  const isProvider = (): boolean => {
    return hasAnyRole(['provider', 'admin', 'superadmin']);
  };

  const isAdmin = (): boolean => {
    return hasAnyRole(['admin', 'superadmin']);
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('superadmin');
  };

  return {
    ...auth0,
    roles,
    permissions,
    language,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllPermissions,
    isProvider,
    isAdmin,
    isSuperAdmin,
    authService,
  };
};
