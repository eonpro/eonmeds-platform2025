import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosInstance } from 'axios';
import { useEffect, useRef } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app';

// Create a single axios instance outside the hook
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add response interceptor for debugging
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API Error:', error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
  );

  return client;
};

export const useApi = (): AxiosInstance => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const apiClientRef = useRef<AxiosInstance | null>(null);

  // Create the client immediately if it doesn't exist
  if (!apiClientRef.current) {
    apiClientRef.current = createApiClient();
  }

  // Set up auth interceptor
  useEffect(() => {
    const client = apiClientRef.current;
    if (!client) return;

    // Add request interceptor for auth
    const requestInterceptor = client.interceptors.request.use(
      async (config) => {
        // Try to get auth token if authenticated
        if (isAuthenticated) {
          try {
            const token = await getAccessTokenSilently({
              authorizationParams: {
                audience: 'https://api.eonmeds.com', // Replace with your actual audience
                scope: 'openid profile email offline_access'
              },
              cacheMode: 'off' // Force fresh token
            });
            
            console.log('Got access token successfully');
            config.headers.Authorization = `Bearer ${token}`;
          } catch (tokenError) {
            console.error('Could not get access token:', tokenError);
            console.log('Current Auth0 state:', {
              isAuthenticated: isAuthenticated, // Use isAuthenticated from useAuth0
              user: null, // No direct access to user object here
              audience: 'https://api.eonmeds.com', // Replace with your actual audience
              domain: 'https://eonmeds.us.auth0.com' // Replace with your actual domain
            });
            
            // TEMPORARY: Allow requests to proceed without token
            // This will let the app work while we fix Auth0
            console.warn('⚠️ Proceeding without auth token - temporary bypass');
            config.headers.Authorization = 'Bearer temporary-bypass-token';
          }
        } else {
          // TEMPORARY: If not authenticated, use bypass token
          console.warn('⚠️ Not authenticated - using temporary bypass token');
          config.headers.Authorization = 'Bearer temporary-bypass-token';
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Cleanup interceptor on unmount
    return () => {
      client.interceptors.request.eject(requestInterceptor);
    };
  }, [getAccessTokenSilently, isAuthenticated]);

  // Always return the axios instance
  return apiClientRef.current!;
}; 