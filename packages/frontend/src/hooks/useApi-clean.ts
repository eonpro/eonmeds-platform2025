import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3002/api/v1';

export const useApi = () => {
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect } = useAuth0();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Get access token if authenticated
      let token: string | null = null;
      
      if (isAuthenticated) {
        try {
          token = await getAccessTokenSilently({
            authorizationParams: {
              audience: process.env.REACT_APP_AUTH0_AUDIENCE,
              scope: 'openid profile email offline_access'
            }
          });
        } catch (tokenError) {
          console.error('Failed to get access token:', tokenError);
          
          // If token refresh fails, redirect to login
          if ((tokenError as any).error === 'login_required' || 
              (tokenError as any).error === 'consent_required') {
            await loginWithRedirect({
              authorizationParams: {
                audience: process.env.REACT_APP_AUTH0_AUDIENCE,
                scope: 'openid profile email offline_access'
              }
            });
            return null;
          }
          
          throw new Error('Authentication failed. Please try logging in again.');
        }
      }

      const requestConfig: AxiosRequestConfig = {
        ...config,
        method,
        url: `${API_BASE_URL}${endpoint}`,
        data,
        headers: {
          ...config?.headers,
          ...(token && { Authorization: `Bearer ${token}` })
        }
      };

      const response = await axios(requestConfig);
      return response.data;
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string; message?: string }>;
      
      // Handle 401 errors by redirecting to login
      if (axiosError.response?.status === 401) {
        await loginWithRedirect({
          authorizationParams: {
            audience: process.env.REACT_APP_AUTH0_AUDIENCE,
            scope: 'openid profile email offline_access'
          }
        });
        return null;
      }
      
      const errorMessage = axiosError.response?.data?.message || 
                          axiosError.response?.data?.error || 
                          axiosError.message || 
                          'An error occurred';
      
      setError(errorMessage);
      console.error('API Error:', axiosError.response?.status, axiosError.response?.data);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently, isAuthenticated, loginWithRedirect]);

  const get = useCallback((endpoint: string, config?: AxiosRequestConfig) => 
    request('GET', endpoint, undefined, config), [request]);

  const post = useCallback((endpoint: string, data?: any, config?: AxiosRequestConfig) => 
    request('POST', endpoint, data, config), [request]);

  const put = useCallback((endpoint: string, data?: any, config?: AxiosRequestConfig) => 
    request('PUT', endpoint, data, config), [request]);

  const patch = useCallback((endpoint: string, data?: any, config?: AxiosRequestConfig) => 
    request('PATCH', endpoint, data, config), [request]);

  const del = useCallback((endpoint: string, config?: AxiosRequestConfig) => 
    request('DELETE', endpoint, undefined, config), [request]);

  return {
    get,
    post,
    put,
    patch,
    delete: del,
    loading,
    error
  };
}; 