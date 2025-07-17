import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Auth0ContextInterface } from '@auth0/auth0-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://eonmeds-platform2025-production.up.railway.app/api/v1';

class AuthService {
  private axiosInstance: AxiosInstance;
  private auth0?: Auth0ContextInterface;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.auth0?.isAuthenticated) {
          try {
            const token = await this.auth0.getAccessTokenSilently();
            config.headers.Authorization = `Bearer ${token}`;
          } catch (error) {
            console.error('Error getting access token:', error);
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token might be expired, try to refresh
          if (this.auth0?.isAuthenticated) {
            try {
              await this.auth0.getAccessTokenSilently({ 
                cacheMode: 'off',
                authorizationParams: {
                  prompt: 'none'
                }
              });
              // Retry the original request
              return this.axiosInstance.request(error.config);
            } catch (refreshError) {
              // Refresh failed, redirect to login
              this.auth0.loginWithRedirect();
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setAuth0(auth0: Auth0ContextInterface) {
    this.auth0 = auth0;
  }

  // Auth endpoints
  async syncUser() {
    const response = await this.axiosInstance.post('/auth/sync');
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.axiosInstance.get('/auth/me');
    return response.data;
  }

  async updateProfile(data: { firstName?: string; lastName?: string; phone?: string; language?: string }) {
    const response = await this.axiosInstance.patch('/auth/profile', data);
    return response.data;
  }

  // Method that accepts token directly for use in contexts
  async updateProfileWithToken(token: string, data: { firstName?: string; lastName?: string; phone?: string; language?: string }) {
    const response = await axios.patch(`${API_BASE_URL}/auth/profile`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  // Patient endpoints
  async getPatients() {
    const response = await this.axiosInstance.get('/patients');
    return response.data;
  }

  async getPatient(id: string) {
    const response = await this.axiosInstance.get(`/patients/${id}`);
    return response.data;
  }

  async createPatient(data: any) {
    const response = await this.axiosInstance.post('/patients', data);
    return response.data;
  }

  async updatePatient(id: string, data: any) {
    const response = await this.axiosInstance.put(`/patients/${id}`, data);
    return response.data;
  }

  async deletePatient(id: string) {
    const response = await this.axiosInstance.delete(`/patients/${id}`);
    return response.data;
  }

  // Generic request method
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.request<T>(config);
    return response.data;
  }
}

const authService = new AuthService();
export { authService };
export default authService; 