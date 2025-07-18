import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientService } from '../services/patient.service';
import { EditPatientModal } from '../components/patients/EditPatientModal';
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
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  membership_status?: string;
  membership_hashtags?: string[];
  tracking_number?: string;
  additional_info?: string;
}

interface TimelineNote {
  id: string;
  content: string;
  createdAt: Date;
  isPinned: boolean;
}

export const PatientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('intake');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [timelineNotes, setTimelineNotes] = useState<TimelineNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [newHashtag, setNewHashtag] = useState('');

  const loadPatient = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await patientService.getPatientById(id);
      console.log('Patient data received:', data);
      setPatient(data);
      // Initialize hashtags from patient data
      if (data.membership_hashtags) {
        setHashtags(data.membership_hashtags);
      }
    } catch (err) {
      console.error('Error loading patient:', err);
      setError('Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatient();
    // Load saved timeline notes from localStorage for now
    const savedNotes = localStorage.getItem(`patient-notes-${id}`);
    if (savedNotes) {
      setTimelineNotes(JSON.parse(savedNotes));
    }
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

  const handleSavePatient = async (updatedData: Partial<PatientDetails>) => {
    if (!patient) return;
    
    try {
      const updatedPatient = await patientService.updatePatient(patient.id, updatedData);
      setPatient({
        ...patient,
        ...updatedPatient
      });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating patient:', err);
      throw err;
    }
  };

  const addTimelineNote = () => {
    if (!newNote.trim()) return;
    
    const note: TimelineNote = {
      id: Date.now().toString(),
      content: newNote,
      createdAt: new Date(),
      isPinned: false
    };
    
    const updatedNotes = [note, ...timelineNotes];
    setTimelineNotes(updatedNotes);
    localStorage.setItem(`patient-notes-${id}`, JSON.stringify(updatedNotes));
    setNewNote('');
  };

  const togglePinNote = (noteId: string) => {
    const updatedNotes = timelineNotes.map(note => 
      note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
    );
    // Sort to put pinned notes first
    updatedNotes.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    setTimelineNotes(updatedNotes);
    localStorage.setItem(`patient-notes-${id}`, JSON.stringify(updatedNotes));
  };

  const deleteNote = (noteId: string) => {
    const updatedNotes = timelineNotes.filter(note => note.id !== noteId);
    setTimelineNotes(updatedNotes);
    localStorage.setItem(`patient-notes-${id}`, JSON.stringify(updatedNotes));
  };

  const addHashtag = () => {
    if (!newHashtag.trim()) return;
    
    const tag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`;
    if (!hashtags.includes(tag)) {
      const updatedTags = [...hashtags, tag];
      setHashtags(updatedTags);
      // Save to backend here
    }
    setNewHashtag('');
    setShowHashtagInput(false);
  };

  const removeHashtag = (tag: string) => {
    const updatedTags = hashtags.filter(t => t !== tag);
    setHashtags(updatedTags);
    // Update backend here
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

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'qualified': '#10b981',
      'not-qualified': '#ef4444',
      'processing': '#f59e0b',
      'pending': '#f59e0b',
      'active': '#10b981'
    };
    return statusColors[status.toLowerCase().replace(/ /g, '-')] || '#6b7280';
  };

  return (
    <div className="patient-profile-container">
      <div className="profile-header-bar">
        <button className="back-button" onClick={() => navigate('/clients')}>
          ← Back to Clients
        </button>
      </div>

      <div className="profile-main-content">
        <div className="timeline-section">
          <div className="timeline-header">
            <h3>Timeline</h3>
            <button className="add-note-btn">+</button>
          </div>
          
          <div className="timeline-content">
            <div className="note-input-wrapper">
              <textarea
                className="note-input"
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <button 
                className="save-note-btn"
                onClick={addTimelineNote}
                disabled={!newNote.trim()}
              >
                Save Note
              </button>
            </div>

            <div className="timeline-notes">
              {timelineNotes.map(note => (
                <div key={note.id} className={`timeline-note ${note.isPinned ? 'pinned' : ''}`}>
                  <div className="note-header">
                    <span className="note-date">
                      {note.createdAt.toLocaleDateString()}
                    </span>
                    <div className="note-actions">
                      <button 
                        className="pin-btn"
                        onClick={() => togglePinNote(note.id)}
                        title={note.isPinned ? 'Unpin' : 'Pin'}
                      >
                        📌
                      </button>
                      <button 
                        className="delete-note-btn"
                        onClick={() => deleteNote(note.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <p className="note-content">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="profile-content-section">
          <div className="patient-header">
            <div className="patient-avatar">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            
            <div className="patient-header-info">
              <h1>{patient.first_name} {patient.last_name}</h1>
              <div className="patient-tags">
                <span 
                  className="weight-loss-tag"
                  style={{ backgroundColor: getStatusColor(patient.status) }}
                >
                  WEIGHT LOSS ✕
                </span>
                <span className="rep-tag">REP: LAURA</span>
                {patient.status === 'pending' && (
                  <span className="pending-tag">PENDING REVIEW</span>
                )}
              </div>
            </div>

            <div className="profile-actions">
              <button className="profile-settings-btn">Profile settings</button>
              <button className="more-options-btn">⋮</button>
              <button className="tag-btn">🏷</button>
            </div>
          </div>

          <div className="profile-tabs">
            <button 
              className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              Timeline
            </button>
            <button 
              className={`tab plus-tab`}
              onClick={() => console.log('Add new tab')}
            >
              +
            </button>
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
              className={`tab ${activeTab === 'soap' ? 'active' : ''}`}
              onClick={() => setActiveTab('soap')}
            >
              📝 SOAP Notes
            </button>
            <button 
              className={`tab ${activeTab === 'intake' ? 'active' : ''}`}
              onClick={() => setActiveTab('intake')}
            >
              📄 Intake Form
            </button>
            <button 
              className={`tab ${activeTab === 'prescriptions' ? 'active' : ''}`}
              onClick={() => setActiveTab('prescriptions')}
            >
              💊 Prescriptions
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'intake' && (
              <div className="intake-form-section">
                <div className="section-header">
                  <span className="client-id">CLIENT ID</span>
                  <span className="patient-id">{patient.patient_id}</span>
                  <button className="edit-btn" onClick={() => setIsEditModalOpen(true)}>
                    Edit ✏️
                  </button>
                </div>

                <div className="basic-info-section">
                  <h3>Basic Information</h3>
                  <div className="info-grid">
                    <div className="info-row">
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
                          })} ({calculateAge(patient.date_of_birth)} y/o)
                        </p>
                      </div>
                      <div className="info-item">
                        <label>SEX</label>
                        <p>{patient.gender === 'female' ? 'Female' : patient.gender || 'Not specified'}</p>
                      </div>
                    </div>

                    <div className="info-row">
                      <div className="info-item">
                        <label>ADDRESS</label>
                        <p>
                          {patient.address ? (
                            <>
                              {patient.address}<br />
                              {patient.city && patient.state && patient.zip && 
                                `${patient.city} ${patient.state} ${patient.zip}`
                              }
                            </>
                          ) : (
                            'Not provided'
                          )}
                        </p>
                      </div>
                      <div className="info-item">
                        <label>EMAIL</label>
                        <p>{patient.email}</p>
                      </div>
                      <div className="info-item">
                        <label>PHONE #</label>
                        <p>{patient.phone ? formatPhone(patient.phone) : 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="info-row">
                      <div className="info-item">
                        <label>HEIGHT</label>
                        <p>{patient.height_inches ? `${Math.floor(patient.height_inches / 12)}' ${patient.height_inches % 12}"` : 'Not provided'}</p>
                      </div>
                      <div className="info-item">
                        <label>WEIGHT</label>
                        <p>{patient.weight_lbs ? `${patient.weight_lbs} lbs` : 'Not provided'}</p>
                      </div>
                      <div className="info-item">
                        <label>BMI</label>
                        <p>{patient.bmi || 'Not calculated'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="additional-info">
                    <div className="info-item">
                      <label>TRACKING #</label>
                      <p>{patient.tracking_number || 'Not available'}</p>
                    </div>
                    <div className="info-item">
                      <label>CLIENT CONSENTS TO DOWNLOAD MEDICATION HISTORY.</label>
                      <p>Yes</p>
                    </div>
                  </div>

                  <div className="additional-info-section">
                    <label>ADDITIONAL INFORMATION</label>
                    <div className="additional-info-box">
                      <p>{patient.additional_info || 'No additional information provided.'}</p>
                    </div>
                  </div>
                </div>

                <div className="hashtags-section">
                  <h3>Tags</h3>
                  <div className="hashtags-container">
                    {hashtags.map(tag => (
                      <span key={tag} className="hashtag">
                        {tag}
                        <button 
                          className="remove-hashtag"
                          onClick={() => removeHashtag(tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {showHashtagInput ? (
                      <div className="hashtag-input-wrapper">
                        <input
                          type="text"
                          className="hashtag-input"
                          placeholder="Add tag..."
                          value={newHashtag}
                          onChange={(e) => setNewHashtag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
                          onBlur={() => !newHashtag && setShowHashtagInput(false)}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <button 
                        className="add-hashtag-btn"
                        onClick={() => setShowHashtagInput(true)}
                      >
                        + Add Tag
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-actions-section">
                  <button 
                    className="view-pdf-btn"
                    onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app'}/api/v1/patients/${id}/intake-pdf`, '_blank')}
                  >
                    View Intake Form PDF
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="overview-tab">
                <h2>Patient Overview</h2>
                <p className="coming-soon">Detailed overview coming soon!</p>
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

            {activeTab === 'soap' && (
              <div className="soap-tab">
                <h2>SOAP Notes</h2>
                <p className="coming-soon">SOAP notes feature coming soon!</p>
              </div>
            )}

            {activeTab === 'prescriptions' && (
              <div className="prescriptions-tab">
                <h2>Prescriptions</h2>
                <p className="coming-soon">Prescription tracking coming soon!</p>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="timeline-tab">
                <h2>Timeline</h2>
                <p className="coming-soon">Timeline view coming soon!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {patient && (
        <EditPatientModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          patient={patient}
          onSave={handleSavePatient}
        />
      )}
    </div>
  );
}; 