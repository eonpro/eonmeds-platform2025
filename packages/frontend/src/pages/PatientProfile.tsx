import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientService } from '../services/patient.service';
import './PatientProfile.css';

interface PatientDetails {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender?: string;
  status: string;
  created_at: string;
  height_inches?: number;
  weight_lbs?: number;
  bmi?: number;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  membership_status?: string;
  membership_hashtags?: string[];
}

export const PatientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadPatient = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await patientService.getPatientById(id);
      setPatient(data);
    } catch (err) {
      console.error('Error loading patient:', err);
      setError('Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="patient-profile-loading">
        <div className="spinner"></div>
        <p>Loading patient details...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="patient-profile-error">
        <p>{error || 'Patient not found'}</p>
        <button onClick={() => navigate('/clients')}>Back to Clients</button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      'qualified': { color: '#00C851', text: 'Qualified' },
      'pending_review': { color: '#FFBB33', text: 'Pending Review' },
      'active': { color: '#33B5E5', text: 'Active' },
      'paused': { color: '#FFA500', text: 'Paused' },
      'cancelled': { color: '#FF4444', text: 'Cancelled' }
    };
    
    const config = statusMap[status] || { color: '#666', text: status };
    return (
      <span className="status-badge" style={{ backgroundColor: config.color }}>
        {config.text}
      </span>
    );
  };

  const getHashtagBadge = (tag: string) => {
    const hashtagMap: { [key: string]: { color: string; icon: string } } = {
      '#activemember': { color: '#00C851', icon: '✓' },
      '#qualified': { color: '#33B5E5', icon: '👤' },
      '#paused': { color: '#FFA500', icon: '⏸' },
      '#cancelled': { color: '#FF4444', icon: '✕' }
    };
    
    const config = hashtagMap[tag] || { color: '#666', icon: '#' };
    return (
      <span key={tag} className="hashtag-badge" style={{ backgroundColor: config.color }}>
        <span className="hashtag-icon">{config.icon}</span>
        {tag}
      </span>
    );
  };

  return (
    <div className="patient-profile">
      <div className="profile-header">
        <button className="back-button" onClick={() => navigate('/clients')}>
          ← Back to Clients
        </button>
        
        <div className="header-content">
          <div className="patient-avatar">
            {patient.first_name[0]}{patient.last_name[0]}
          </div>
          
          <div className="header-info">
            <h1>{patient.first_name} {patient.last_name}</h1>
            <div className="header-badges">
              {getStatusBadge(patient.status)}
              {patient.membership_hashtags?.map(tag => getHashtagBadge(tag))}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          👤 Overview
        </button>
        <button 
          className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          📊 Progress
        </button>
        <button 
          className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          💳 Invoices
        </button>
        <button 
          className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          💬 Comments
        </button>
        <button 
          className={`tab ${activeTab === 'fullscript' ? 'active' : ''}`}
          onClick={() => setActiveTab('fullscript')}
        >
          💊 Fullscript
        </button>
        <button 
          className={`tab ${activeTab === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          📋 Prescriptions
        </button>
        <button 
          className={`tab ${activeTab === 'intake' ? 'active' : ''}`}
          onClick={() => setActiveTab('intake')}
        >
          📄 Intake Forms
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <section className="info-section">
              <h2>Basic Information</h2>
              <button className="edit-button">✏️ Edit</button>
              
              <div className="info-grid">
                <div className="info-item">
                  <label>NAME</label>
                  <p>{patient.first_name} {patient.last_name}</p>
                </div>
                
                <div className="info-item">
                  <label>DATE OF BIRTH</label>
                  <p>
                    {new Date(patient.date_of_birth).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })} (age {calculateAge(patient.date_of_birth)})
                  </p>
                </div>
                
                <div className="info-item">
                  <label>EMAIL ADDRESS</label>
                  <p>{patient.email}</p>
                </div>
                
                <div className="info-item">
                  <label>CLIENT ID</label>
                  <p>{patient.patient_id}</p>
                </div>
                
                <div className="info-item">
                  <label>GENDER</label>
                  <p>{patient.gender || 'Not specified'}</p>
                </div>
                
                <div className="info-item">
                  <label>SEX</label>
                  <p>{patient.gender || 'Not specified'}</p>
                </div>
                
                <div className="info-item">
                  <label>MOBILE PHONE</label>
                  <p>{patient.phone ? formatPhone(patient.phone) : 'Not provided'}</p>
                </div>
                
                <div className="info-item">
                  <label>ADDRESS</label>
                  <p>
                    {patient.address_line1 || 'Not provided'}
                    {patient.address_line2 && <><br />{patient.address_line2}</>}
                    {patient.city && patient.state && patient.zip_code && (
                      <><br />{patient.city}, {patient.state} {patient.zip_code}</>
                    )}
                  </p>
                </div>
                
                {patient.height_inches && patient.weight_lbs && (
                  <>
                    <div className="info-item">
                      <label>HEIGHT</label>
                      <p>{Math.floor(patient.height_inches / 12)}' {patient.height_inches % 12}"</p>
                    </div>
                    
                    <div className="info-item">
                      <label>WEIGHT</label>
                      <p>{patient.weight_lbs} lbs</p>
                    </div>
                    
                    {patient.bmi && (
                      <div className="info-item">
                        <label>BMI</label>
                        <p>{patient.bmi}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'intake' && (
          <div className="intake-tab">
            <h2>Intake Forms</h2>
            <div className="intake-forms-list">
              <div className="intake-form-item">
                <div className="form-icon">📄</div>
                <div className="form-details">
                  <h3>Weight Loss Intake Form</h3>
                  <p>Submitted on {new Date(patient.created_at).toLocaleDateString()}</p>
                </div>
                <div className="form-actions">
                  <button 
                    className="view-button"
                    onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app'}/api/v1/patients/${id}/intake-pdf`, '_blank')}
                  >
                    View PDF
                  </button>
                  <a 
                    href={`${process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app'}/api/v1/patients/${id}/intake-pdf`}
                    download={`${patient.patient_id || 'patient'}_intake_form.pdf`}
                    className="download-button"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="progress-tab">
            <h2>Progress Tracking</h2>
            <p className="coming-soon">Progress tracking features coming soon!</p>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="invoices-tab">
            <h2>Invoices</h2>
            <p className="coming-soon">Invoice management coming soon!</p>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="comments-tab">
            <h2>Comments & Notes</h2>
            <p className="coming-soon">Comments feature coming soon!</p>
          </div>
        )}

        {activeTab === 'fullscript' && (
          <div className="fullscript-tab">
            <h2>Fullscript Orders</h2>
            <p className="coming-soon">Fullscript integration coming soon!</p>
          </div>
        )}

        {activeTab === 'prescriptions' && (
          <div className="prescriptions-tab">
            <h2>Prescriptions</h2>
            <p className="coming-soon">Prescription tracking coming soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}; 