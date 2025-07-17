import axios from 'axios';

// Patient service for API calls
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app';

export interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  name?: string; // Combined first and last name
  email: string;
  phone: string;
  date_of_birth: string;
  status: string;
  created_at: string;
  membership_hashtags?: string[];
  membership_status?: string;
}

export interface PatientListResponse {
  patients: Patient[];
  total: number;
  limit: number;
  offset: number;
}

export interface IntakeFormData {
  id: string;
  patient_id: string;
  form_type: string;
  submitted_at: string;
  responses: any;
}

class PatientService {
  private async getAuthToken(): Promise<string | null> {
    // Try to get the Auth0 token, but don't fail if it's not there
    const auth0Token = localStorage.getItem('auth0Token');
    return auth0Token;
  }

  async getPatients(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
  }): Promise<PatientListResponse> {
    try {
      const token = await this.getAuthToken();
      const headers: any = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/v1/patients`, {
        params,
        headers
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching patients:', error);
      // Return empty data instead of throwing to prevent app crash
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        return {
          patients: [],
          total: 0,
          limit: params?.limit || 10,
          offset: params?.offset || 0
        };
      }
      throw error;
    }
  }

  async getPatientById(id: string): Promise<Patient> {
    try {
      const token = await this.getAuthToken();
      const headers: any = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/v1/patients/${id}`, {
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching patient:', error);
      throw error;
    }
  }

  async createPatient(patientData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    gender: string;
  }): Promise<Patient> {
    try {
      const token = await this.getAuthToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/patients`,
        patientData,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  }

  async getPatientIntakeData(id: string): Promise<IntakeFormData> {
    try {
      const token = await this.getAuthToken();
      const headers: any = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/v1/patients/${id}/intake`, {
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching intake data:', error);
      throw error;
    }
  }

  async updatePatientStatus(id: string, status: string): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.patch(
        `${API_BASE_URL}/api/v1/patients/${id}/status`,
        { status },
        { headers }
      );
      return response.data.success;
    } catch (error) {
      console.error('Error updating patient status:', error);
      throw error;
    }
  }
}

export const patientService = new PatientService(); 