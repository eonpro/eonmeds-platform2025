import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import './PatientDetail.css';

interface PatientDetailData {
  // Basic Info
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  
  // Physical Info
  height_inches?: number;
  weight_lbs?: number;
  bmi?: number;
  
  // Medical Info
  medical_conditions?: string[];
  current_medications?: string[];
  allergies?: string[];
  
  // Form Submission Info
  form_type: string;
  submitted_at: string;
  heyflow_submission_id?: string;
  
  // Status
  status: string;
  membership_status?: string;
  membership_hashtags?: string[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Raw webhook data
  raw_webhook_data?: any;
}

interface IntakeFormData {
  // All possible intake form fields
  target_weight_lbs?: number;
  weight_loss_timeline?: string;
  previous_weight_loss_attempts?: string;
  exercise_frequency?: string;
  diet_restrictions?: string[];
  diabetes_type?: string;
  thyroid_condition?: boolean;
  heart_conditions?: string[];
  
  // Additional fields from webhook
  [key: string]: any;
}

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apiClient = useApi();
  
  const [patient, setPatient] = useState<PatientDetailData | null>(null);
  const [intakeData, setIntakeData] = useState<IntakeFormData | null>(null);
  const [rawWebhookData, setRawWebhookData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'intake' | 'raw'>('overview');

  useEffect(() => {
    if (id && apiClient) {
      fetchPatientData();
    }
  }, [id, apiClient]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      // Fetch patient details
      const patientResponse = await apiClient.get<PatientDetailData>(`/api/v1/patients/${id}`);
      setPatient(patientResponse.data);
      
      // Fetch intake form data
      try {
        const intakeResponse = await apiClient.get<IntakeFormData>(`/api/v1/patients/${id}/intake`);
        setIntakeData(intakeResponse.data);
      } catch (intakeError) {
        console.log('No intake data available');
      }
      
      // Fetch raw webhook data
      try {
        const webhookResponse = await apiClient.get(`/api/v1/patients/${id}/webhook-data`);
        setRawWebhookData(webhookResponse.data);
      } catch (webhookError) {
        console.log('No raw webhook data available');
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch patient data');
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '-';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const renderStatus = (status: string) => {
    const statusConfig: { [key: string]: { color: string; bg: string; label: string } } = {
      active: { color: '#00C851', bg: '#00C85115', label: 'Active' },
      qualified: { color: '#33B5E5', bg: '#33B5E515', label: 'Qualified' },
      paused: { color: '#FFA500', bg: '#FFA50015', label: 'Paused' },
      cancelled: { color: '#FF4444', bg: '#FF444415', label: 'Cancelled' },
      pending_review: { color: '#FFBB33', bg: '#FFBB3315', label: 'Pending Review' }
    };

    const config = statusConfig[status] || statusConfig.qualified;

    return (
      <span style={{
        padding: '6px 16px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: '500',
        color: config.color,
        backgroundColor: config.bg
      }}>
        {config.label}
      </span>
    );
  };

  if (!apiClient) {
    return <div>Please log in to view patient details</div>;
  }

  if (loading) {
    return (
      <div className="patient-detail-loading">
        <div className="spinner"></div>
        <p>Loading patient data...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="patient-detail-error">
        <h2>Error</h2>
        <p>{error || 'Patient not found'}</p>
        <button onClick={() => navigate('/clients')}>Back to Patients</button>
      </div>
    );
  }

  return (
    <div className="patient-detail-container">
      {/* Header */}
      <div className="patient-header">
        <button className="back-button" onClick={() => navigate('/clients')}>
          ← Back to Patients
        </button>
        
        <div className="patient-header-info">
          <h1>{patient.first_name} {patient.last_name}</h1>
          <div className="patient-header-meta">
            <span>ID: {patient.patient_id}</span>
            <span>•</span>
            <span>{renderStatus(patient.membership_status || patient.status)}</span>
            {patient.membership_hashtags?.map(tag => (
              <span key={tag} className="hashtag">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="patient-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'intake' ? 'active' : ''}
          onClick={() => setActiveTab('intake')}
        >
          Intake Form
        </button>
        <button
          className={activeTab === 'raw' ? 'active' : ''}
          onClick={() => setActiveTab('raw')}
        >
          Raw Data
        </button>
      </div>

      {/* Tab Content */}
      <div className="patient-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Personal Information */}
            <div className="info-section">
              <h2>Personal Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Full Name</label>
                  <value>{patient.first_name} {patient.last_name}</value>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <value>{patient.email}</value>
                </div>
                <div className="info-item">
                  <label>Phone</label>
                  <value>{formatPhoneNumber(patient.phone)}</value>
                </div>
                <div className="info-item">
                  <label>Date of Birth</label>
                  <value>{formatDate(patient.date_of_birth)} (Age: {calculateAge(patient.date_of_birth)})</value>
                </div>
                <div className="info-item">
                  <label>Gender</label>
                  <value>{patient.gender || '-'}</value>
                </div>
                <div className="info-item">
                  <label>Form Type</label>
                  <value>{patient.form_type?.replace('_', ' ').toUpperCase()}</value>
                </div>
              </div>
            </div>

            {/* Physical Information */}
            {(patient.height_inches || patient.weight_lbs) && (
              <div className="info-section">
                <h2>Physical Information</h2>
                <div className="info-grid">
                  {patient.height_inches && (
                    <div className="info-item">
                      <label>Height</label>
                      <value>{Math.floor(patient.height_inches / 12)}' {patient.height_inches % 12}"</value>
                    </div>
                  )}
                  {patient.weight_lbs && (
                    <div className="info-item">
                      <label>Weight</label>
                      <value>{patient.weight_lbs} lbs</value>
                    </div>
                  )}
                  {patient.bmi && (
                    <div className="info-item">
                      <label>BMI</label>
                      <value>{patient.bmi}</value>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Medical Information */}
            {(patient.medical_conditions || patient.current_medications || patient.allergies) && (
              <div className="info-section">
                <h2>Medical Information</h2>
                <div className="info-grid full-width">
                  {patient.medical_conditions && patient.medical_conditions.length > 0 && (
                    <div className="info-item">
                      <label>Medical Conditions</label>
                      <value>{patient.medical_conditions.join(', ')}</value>
                    </div>
                  )}
                  {patient.current_medications && patient.current_medications.length > 0 && (
                    <div className="info-item">
                      <label>Current Medications</label>
                      <value>{patient.current_medications.join(', ')}</value>
                    </div>
                  )}
                  {patient.allergies && patient.allergies.length > 0 && (
                    <div className="info-item">
                      <label>Allergies</label>
                      <value>{patient.allergies.join(', ')}</value>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submission Information */}
            <div className="info-section">
              <h2>Submission Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Submitted At</label>
                  <value>{formatDate(patient.submitted_at)}</value>
                </div>
                <div className="info-item">
                  <label>Created in System</label>
                  <value>{formatDate(patient.created_at)}</value>
                </div>
                <div className="info-item">
                  <label>Last Updated</label>
                  <value>{formatDate(patient.updated_at)}</value>
                </div>
                {patient.heyflow_submission_id && (
                  <div className="info-item">
                    <label>HeyFlow Submission ID</label>
                    <value>{patient.heyflow_submission_id}</value>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'intake' && (
          <div className="intake-tab">
            <h2>Intake Form Data</h2>
            {intakeData ? (
              <div className="intake-data">
                {Object.entries(intakeData).map(([key, value]) => (
                  <div key={key} className="intake-item">
                    <label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                    <value>
                      {Array.isArray(value) 
                        ? value.join(', ') 
                        : typeof value === 'boolean' 
                        ? value ? 'Yes' : 'No'
                        : value?.toString() || '-'
                      }
                    </value>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No intake form data available</p>
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="raw-tab">
            <h2>Raw Webhook Data</h2>
            <p className="raw-description">
              This is the original data received from HeyFlow. Useful for debugging and understanding the complete submission.
            </p>
            {rawWebhookData ? (
              <pre className="raw-data">
                {JSON.stringify(rawWebhookData, null, 2)}
              </pre>
            ) : (
              <p className="no-data">No raw webhook data available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 