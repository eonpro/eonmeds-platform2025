import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientService } from '../services/patient.service';
import { EditPatientModal } from '../components/patients/EditPatientModal';
import { CreatePatientModal } from '../components/patients/CreatePatientModal';
import { 
  ArrowBackIcon, 
  UserIcon, 
  ChartIcon, 
  InvoiceIcon, 
  DocumentIcon, 
  FormIcon, 
  PrescriptionIcon,
  PlusIcon,
  PinIcon,
  TagIcon,
  EditIcon,
  MoreOptionsIcon,
  CloseIcon,
  MapIcon
} from '../components/common/Icons';
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
  address_house?: string;
  address_street?: string;
  apartment_number?: string;
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
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [timelineNotes, setTimelineNotes] = useState<TimelineNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [newHashtag, setNewHashtag] = useState('');
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientDetails[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Add intake form as a pinned note when component loads
  useEffect(() => {
    if (patient && !timelineNotes.some(note => note.id === 'intake-form')) {
      const intakeNote: TimelineNote = {
        id: 'intake-form',
        content: `Intake Form - ${patient.patient_id}\nSubmitted on ${new Date(patient.created_at).toLocaleDateString()}`,
        createdAt: new Date(patient.created_at),
        isPinned: true
      };
      setTimelineNotes(prev => [intakeNote, ...prev]);
    }
  }, [patient]);

  // Search patients
  useEffect(() => {
    const searchPatients = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setShowSearchDropdown(false);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await patientService.getPatients({ 
          search: searchQuery, 
          limit: 10 
        });
        setSearchResults(response.patients as PatientDetails[]);
        setShowSearchDropdown(true);
      } catch (error) {
        console.error('Error searching patients:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPatients, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handlePatientSelect = (selectedPatient: PatientDetails) => {
    navigate(`/patients/${selectedPatient.id}`);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const handleCreatePatient = async (patientData: any) => {
    try {
      const newPatient = await patientService.createPatient(patientData);
      navigate(`/patients/${newPatient.id}`);
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  };

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

  const formatAddress = () => {
    if (!patient) return { addressLine1: '', addressLine2: '', fullAddress: '' };
    
    // Check if we have the new structured address fields
    if ((patient.address_house || patient.address_street) && patient.city && patient.state) {
      // New format with separate fields
      let addressLine1 = '';
      if (patient.address_house && patient.address_street) {
        addressLine1 = `${patient.address_house} ${patient.address_street}`;
      } else if (patient.address_street) {
        addressLine1 = patient.address_street;
      }
      
      // Add apartment number if it exists
      if (patient.apartment_number) {
        addressLine1 += `, Apt ${patient.apartment_number}`;
      }
      
      const parts = [];
      if (patient.city) parts.push(patient.city);
      if (patient.state) parts.push(patient.state);
      if (patient.zip) parts.push(patient.zip);
      const addressLine2 = parts.join(', ');
      
      return { 
        addressLine1, 
        addressLine2, 
        fullAddress: addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1 
      };
    } else if (patient.address && patient.city && patient.state) {
      // Legacy format - address already contains house and street
      let addressLine1 = patient.address;
      
      // Add apartment number if it exists and not already in address
      if (patient.apartment_number && !addressLine1.toLowerCase().includes('apt')) {
        addressLine1 += `, Apt ${patient.apartment_number}`;
      }
      
      // Only show city, state, zip on second line if they're not already in the address
      const addressLower = addressLine1.toLowerCase();
      const cityInAddress = patient.city && addressLower.includes(patient.city.toLowerCase());
      const stateInAddress = patient.state && addressLower.includes(patient.state.toLowerCase());
      
      if (cityInAddress || stateInAddress) {
        // Address already contains city/state, don't duplicate
        return { 
          addressLine1, 
          addressLine2: '', 
          fullAddress: addressLine1 
        };
      } else {
        // Address doesn't contain city/state, show them separately
        const parts = [];
        if (patient.city) parts.push(patient.city);
        if (patient.state) parts.push(patient.state);
        if (patient.zip) parts.push(patient.zip);
        const addressLine2 = parts.join(', ');
        
        return { 
          addressLine1, 
          addressLine2, 
          fullAddress: `${addressLine1}, ${addressLine2}` 
        };
      }
    } else if (patient.address) {
      // Only address field available
      let addressLine1 = patient.address;
      
      // Add apartment number if it exists and not already in address
      if (patient.apartment_number && !addressLine1.toLowerCase().includes('apt')) {
        addressLine1 += `, Apt ${patient.apartment_number}`;
      }
      
      return { 
        addressLine1, 
        addressLine2: '', 
        fullAddress: addressLine1 
      };
    } else {
      // No address data
      return { addressLine1: '', addressLine2: '', fullAddress: '' };
    }
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
    // Don't allow deleting the intake form note
    if (noteId === 'intake-form') return;
    
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
        <div className="header-center-section">
          <div className="search-bar-wrapper">
            <input
              type="text"
              className="client-search-input"
              placeholder="Search for Client"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            />
            {showSearchDropdown && (
              <div className="search-dropdown">
                {searchLoading ? (
                  <div className="search-loading">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="search-result-item"
                      onClick={() => handlePatientSelect(result)}
                    >
                      <div className="search-result-name">
                        {result.first_name} {result.last_name}
                      </div>
                      <div className="search-result-id">{result.patient_id}</div>
                    </div>
                  ))
                ) : (
                  <div className="search-no-results">No clients found</div>
                )}
              </div>
            )}
          </div>
          <button className="add-client-btn" onClick={() => setIsCreateModalOpen(true)}>
            + Client
          </button>
        </div>
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
                <div key={note.id} className={`timeline-note ${note.isPinned ? 'pinned' : ''} ${note.id === 'intake-form' ? 'intake-form-note' : ''}`}>
                  {note.id === 'intake-form' ? (
                    <>
                      <div className="intake-form-note-content">
                        <div className="intake-form-info">
                          <p className="note-title">{patient.patient_id} - Intake Form</p>
                          <p className="note-subtitle">Weight Loss Program</p>
                          <button 
                            className="view-form-btn"
                            onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app'}/api/v1/patients/${id}/intake-pdf`, '_blank')}
                          >
                            View Form
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="note-header">
                        <span className="note-date">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                        <div className="note-actions">
                          <button 
                            className="pin-btn"
                            onClick={() => togglePinNote(note.id)}
                            title={note.isPinned ? 'Unpin' : 'Pin'}
                          >
                            <PinIcon className="pin-icon" filled={note.isPinned} />
                          </button>
                          <button 
                            className="delete-note-btn"
                            onClick={() => deleteNote(note.id)}
                          >
                            <CloseIcon />
                          </button>
                        </div>
                      </div>
                      <p className="note-content">{note.content}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="profile-content-wrapper">
          <div className="profile-content-section">
            <div className="patient-header">
              <div className="patient-avatar">
                {patient.first_name[0]}{patient.last_name[0]}
              </div>
              
              <div className="patient-header-info">
                <h1>{patient.first_name} {patient.last_name}</h1>
                <div className="patient-tags">
                  {hashtags.map(tag => (
                    <span 
                      key={tag}
                      className="header-tag"
                      style={{ 
                        backgroundColor: tag.includes('weight') ? getStatusColor(patient.status) : 
                                       tag.includes('rep') ? '#a855f7' : '#3b82f6'
                      }}
                    >
                      {tag}
                      <button 
                        className="remove-tag-btn"
                        onClick={() => removeHashtag(tag)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {patient.status === 'pending' && (
                    <span className="pending-tag">PENDING REVIEW</span>
                  )}
                </div>
              </div>

              <div className="profile-actions">
                <button className="profile-settings-btn">Profile settings</button>
                <button className="more-options-btn"><MoreOptionsIcon className="more-options-icon" /></button>
                <div className="tag-btn-wrapper">
                  <button 
                    className="tag-btn"
                    onClick={() => setShowHashtagInput(!showHashtagInput)}
                  >
                    <TagIcon className="tag-icon" />
                  </button>
                  {showHashtagInput && (
                    <div className="header-tag-input-wrapper">
                      <input
                        type="text"
                        className="header-tag-input"
                        placeholder="Add tag (e.g. #weightloss, #rep:laura)..."
                        value={newHashtag}
                        onChange={(e) => setNewHashtag(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addHashtag();
                          }
                        }}
                      />
                      <button className="add-tag-confirm-btn" onClick={addHashtag}>
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="profile-info-section">
            <div className="profile-tabs">
              <button 
                className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <UserIcon className="tab-icon" />
                Overview
              </button>
              <button 
                className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
                onClick={() => setActiveTab('progress')}
              >
                <ChartIcon className="tab-icon" />
                Progress
              </button>
              <button 
                className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
              >
                <InvoiceIcon className="tab-icon" />
                Invoices
              </button>
              <button 
                className={`tab ${activeTab === 'soap' ? 'active' : ''}`}
                onClick={() => setActiveTab('soap')}
              >
                <DocumentIcon className="tab-icon" />
                SOAP Notes
              </button>
              <button 
                className={`tab ${activeTab === 'intake' ? 'active' : ''}`}
                onClick={() => setActiveTab('intake')}
              >
                <FormIcon className="tab-icon" />
                Intake Form
              </button>
              <button 
                className={`tab ${activeTab === 'prescriptions' ? 'active' : ''}`}
                onClick={() => setActiveTab('prescriptions')}
              >
                <PrescriptionIcon className="tab-icon" />
                Prescriptions
              </button>
              <button className="tab plus-tab">+</button>
            </div>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-section">
                  <div className="section-header">
                    <div>
                      <span className="client-id">CLIENT ID</span>
                      <span className="patient-id">{patient.patient_id}</span>
                    </div>
                    <button className="edit-btn" onClick={() => setIsEditModalOpen(true)}>
                      <EditIcon className="edit-icon" /> Edit
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
                            {(() => {
                              const { addressLine1, addressLine2, fullAddress } = formatAddress();
                              return addressLine1 ? (
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="address-link"
                                >
                                  {addressLine1}
                                  {addressLine2 && (
                                    <>
                                      <br />
                                      {addressLine2}
                                    </>
                                  )}
                                  <MapIcon className="map-icon" />
                                </a>
                              ) : (
                                'Not provided'
                              );
                            })()}
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
                </div>
              )}

              {activeTab === 'intake' && (
                <div className="intake-form-tab">
                  <h2>Intake Form</h2>
                  <div className="intake-form-content">
                    <div className="intake-form-card">
                      <div className="form-icon"><FormIcon className="form-icon-large" /></div>
                      <div className="form-details">
                        <h3>Weight Loss Intake Form</h3>
                        <p>Submitted on {new Date(patient.created_at).toLocaleDateString()}</p>
                        <p className="form-id">Form ID: {patient.patient_id}</p>
                      </div>
                      <div className="form-actions">
                        <button 
                          className="view-pdf-btn"
                          onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app'}/api/v1/patients/${id}/intake-pdf`, '_blank')}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
                            <path d="M8.5 1v7.5H15m-6.5 0L15 2M1 9v5a1 1 0 001 1h12a1 1 0 001-1V9M8 11.5v3m0 0l-2.5-2.5M8 14.5l2.5-2.5"/>
                          </svg>
                          View Intake Form PDF
                        </button>
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
            </div>
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
      {isCreateModalOpen && (
        <CreatePatientModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreatePatient}
        />
      )}
    </div>
  );
}; 