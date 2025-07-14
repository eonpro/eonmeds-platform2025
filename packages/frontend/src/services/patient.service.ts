import axios from 'axios';

// Patient service for API calls
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

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
  private async getAuthToken(): Promise<string> {
    // This will be implemented to get the Auth0 token
    const auth0Token = localStorage.getItem('auth0Token');
    if (!auth0Token) {
      throw new Error('No authentication token found');
    }
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
      const response = await axios.get(`${API_BASE_URL}/api/v1/patients`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  }

  async getPatientById(id: string): Promise<Patient> {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/v1/patients/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching patient:', error);
      throw error;
    }
  }

  async getPatientIntakeData(id: string): Promise<IntakeFormData> {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/api/v1/patients/${id}/intake`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
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
      const response = await axios.patch(
        `${API_BASE_URL}/api/v1/patients/${id}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data.success;
    } catch (error) {
      console.error('Error updating patient status:', error);
      throw error;
    }
  }
}

export const patientService = new PatientService(); 