export interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  height_inches?: number;
  weight_lbs?: number;
  bmi?: number;
  
  // Address fields
  address?: string; // Legacy full address
  address_house?: string;
  address_street?: string;
  apartment_number?: string;
  city?: string;
  state?: string;
  zip?: string;
  
  // Status and metadata
  status?: string;
  membership_status?: string;
  membership_hashtags?: string[];
  created_at: string;
  updated_at: string;
  
  // HeyFlow integration
  heyflow_submission_id?: string;
  form_type?: string;
  submitted_at?: string;
}

export interface PatientFormData extends Partial<Patient> {
  // Used for create/edit forms
}

export interface PatientListResponse {
  patients: Patient[];
  total: number;
  limit: number;
  offset: number;
} 