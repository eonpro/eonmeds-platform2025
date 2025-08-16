import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientService } from '../services/patient.service';
import { EditPatientModal } from '../components/patients/EditPatientModal';
import { CreatePatientModal } from '../components/patients/CreatePatientModal';
import { useApi } from '../hooks/useApi';
import { getHashtagColor } from '../utils/hashtag-utils';
import { formatHashtagDisplay } from '../utils/hashtag-display';
import {
  UserIcon,
  ChartIcon,
  InvoiceIcon,
  DocumentIcon,
  FormIcon,
  PrescriptionIcon,
  PinIcon,
  EditIcon,
  MoreOptionsIcon,
  CloseIcon,
  MapIcon,
  CardIcon,
} from '../components/common/Icons';
import './PatientProfile.css';
import { PatientInvoices } from '../components/patients/PatientInvoices';
import { SOAPNotes } from '../components/patients/SOAPNotes';
import { PatientCards } from '../components/patients/PatientCards';

interface PatientDetails {
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
  status?: string;
  membership_status?: string;
  membership_hashtags?: string[];
  created_at: string;
  updated_at?: string;

  // Address fields
  address?: string; // Legacy full address
  address_house?: string;
  address_street?: string;
  apartment_number?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Additional info
  additional_info?: string;

  // Payment integration
  stripe_customer_id?: string;

  // HeyFlow integration
  heyflow_submission_id?: string;
  form_type?: string;
  submitted_at?: string;
}

interface TimelineNote {
  id: string;
  content: string;
  createdAt: Date;
  isPinned: boolean;
}

interface IntakeFormData {
  [key: string]: any;
}

export const PatientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apiClient = useApi();
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
  const [patientStatus, setPatientStatus] = useState<string>('pending');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [intakeFormData, setIntakeFormData] = useState<IntakeFormData | null>(null);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const intakeLoadedRef = useRef(false);

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

  const loadIntakeData = useCallback(async () => {
    if (!id) return;

    try {
      setIntakeLoading(true);
      const response = await apiClient.get(`/api/v1/patients/${id}/webhook-data`);

      if (response.data) {
        setIntakeFormData(response.data);
      }
    } catch (err: any) {
      // 404 is expected when no webhook data exists yet - this is not an error
      if (err?.response?.status === 404) {
        console.log('No webhook data found for patient - this is normal for new patients');
      } else {
        // Only log actual errors
        console.error('Error loading intake data:', err);
        if (err?.response?.data) {
          console.error('Error details:', err.response.data);
        }
      }
      // If webhook data fails, we'll just show the simple form
    } finally {
      setIntakeLoading(false);
    }
  }, [id, apiClient]);

  // Load intake data when intake tab is selected
  useEffect(() => {
    if (activeTab === 'intake' && id && !intakeLoadedRef.current) {
      intakeLoadedRef.current = true;
      loadIntakeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id, loadIntakeData]);

  // Reset intake data when patient changes
  useEffect(() => {
    setIntakeFormData(null);
    intakeLoadedRef.current = false;
  }, [id]);

  useEffect(() => {
    loadPatient();
    // Load saved timeline notes from localStorage for now
    const savedNotes = localStorage.getItem(`patient-notes-${id}`);
    if (savedNotes) {
      const notes = JSON.parse(savedNotes);
      // Clean up any old SOAP note format
      const cleanedNotes = notes.map((note: TimelineNote) => {
        if (note.id.startsWith('soap-') && note.content.includes('SOAP Note created -')) {
          return { ...note, content: 'SOAP Note Attached' };
        }
        return note;
      });
      setTimelineNotes(cleanedNotes);
      // Save cleaned notes back to localStorage
      localStorage.setItem(`patient-notes-${id}`, JSON.stringify(cleanedNotes));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (patient) {
      setPatientStatus(patient.status || 'pending');
      setAdditionalInfo(patient.additional_info || '');
    }
  }, [patient]);

  // Add intake form as a pinned note when component loads
  useEffect(() => {
    if (patient && !timelineNotes.some((note) => note.id === 'intake-form')) {
      const intakeNote: TimelineNote = {
        id: 'intake-form',
        content: `Intake Form - ${patient.patient_id}\nSubmitted on ${new Date(patient.created_at).toLocaleDateString()}`,
        createdAt: new Date(patient.created_at),
        isPinned: true,
      };
      setTimelineNotes((prev) => [intakeNote, ...prev]);
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
          limit: 10,
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

  // Add download PDF function
  const downloadPDF = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app'}/api/v1/patients/${id}/intake-pdf`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/pdf',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intake-form-${patient?.patient_id || 'patient'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
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
        fullAddress: addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1,
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
          fullAddress: addressLine1,
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
          fullAddress: `${addressLine1}, ${addressLine2}`,
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
        fullAddress: addressLine1,
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
        ...updatedPatient,
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
      isPinned: false,
    };

    const updatedNotes = [note, ...timelineNotes];
    setTimelineNotes(updatedNotes);
    localStorage.setItem(`patient-notes-${id}`, JSON.stringify(updatedNotes));
    setNewNote('');
  };

  const togglePinNote = (noteId: string) => {
    const updatedNotes = timelineNotes.map((note) =>
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

    const updatedNotes = timelineNotes.filter((note) => note.id !== noteId);
    setTimelineNotes(updatedNotes);
    localStorage.setItem(`patient-notes-${id}`, JSON.stringify(updatedNotes));
  };

  const addHashtag = async () => {
    if (!newHashtag.trim() || !patient) return;

    const tag = newHashtag.startsWith('#') ? newHashtag.substring(1) : newHashtag;
    if (!hashtags.includes(tag)) {
      const updatedTags = [...hashtags, tag];
      setHashtags(updatedTags);

      // Save to backend
      try {
        const updatedPatient = await patientService.updatePatient(patient.id, {
          membership_hashtags: updatedTags,
        });
        setPatient({
          ...patient,
          membership_hashtags: updatedTags,
        });
      } catch (err) {
        console.error('Error updating hashtags:', err);
        // Revert on error
        setHashtags(hashtags);
      }
    }
    setNewHashtag('');
    setShowHashtagInput(false);
  };

  const removeHashtag = async (tag: string) => {
    if (!patient) return;

    const updatedTags = hashtags.filter((t) => t !== tag);
    setHashtags(updatedTags);

    // Update backend
    try {
      const updatedPatient = await patientService.updatePatient(patient.id, {
        membership_hashtags: updatedTags,
      });
      setPatient({
        ...patient,
        membership_hashtags: updatedTags,
      });
    } catch (err) {
      console.error('Error removing hashtag:', err);
      // Revert on error
      setHashtags(hashtags);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!patient) return;

    try {
      setPatientStatus(newStatus);
      const updatedPatient = await patientService.updatePatient(patient.id, { status: newStatus });
      setPatient({
        ...patient,
        ...updatedPatient,
      });
    } catch (err) {
      console.error('Error updating status:', err);
      // Revert on error
      setPatientStatus(patient.status || 'pending');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'qualified':
        return '#14a97b';
      case 'not_qualified':
      case 'not qualified':
        return '#dc3545';
      case 'pending':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const handleSaveAdditionalInfo = async () => {
    if (!patient) return;

    try {
      const updatedPatient = await patientService.updatePatient(patient.id, {
        additional_info: additionalInfo,
      });
      setPatient({
        ...patient,
        additional_info: additionalInfo,
      });
    } catch (err) {
      console.error('Error updating additional info:', err);
      // Revert on error
      setAdditionalInfo(patient.additional_info || '');
    }
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
            {/* All Timeline Notes - sorted by date, newest first */}
            <div className="timeline-notes">
              {/* First show SOAP notes (newest first) */}
              {timelineNotes
                .filter((note) => note.id.startsWith('soap-'))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((note) => (
                  <div key={note.id} className={`timeline-note soap-note-timeline`}>
                    <div className="note-header">
                      <span className="note-date">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="soap-note-content">
                      <div className="soap-note-info">
                        <p className="soap-note-title">SOAP Note Attached</p>
                        <button className="view-soap-note-btn" onClick={() => setActiveTab('soap')}>
                          View SOAP Note
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Then show intake form */}
              {timelineNotes
                .filter((note) => note.id === 'intake-form')
                .map((note) => (
                  <div key={note.id} className="timeline-note intake-form-note">
                    <div className="intake-form-note-content">
                      <div className="intake-form-info">
                        <p className="note-title">{patient.patient_id} - Intake Form</p>
                        <p className="note-subtitle">Weight Loss Program</p>
                        <div className="form-action-buttons">
                          <button
                            className="view-form-btn"
                            onClick={() =>
                              window.open(
                                `${process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app'}/api/v1/patients/${id}/intake-pdf`,
                                '_blank'
                              )
                            }
                          >
                            View Form
                          </button>
                          <button className="download-form-btn" onClick={downloadPDF}>
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Status Dropdown */}
              <div className="status-dropdown-section">
                <select
                  className="status-dropdown"
                  value={patientStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{ backgroundColor: getStatusColor(patientStatus) }}
                >
                  <option value="pending">PENDING REVIEW</option>
                  <option value="qualified">QUALIFIED</option>
                  <option value="not_qualified">NOT QUALIFIED</option>
                  <option value="follow_up">FOLLOW UP</option>
                  <option value="enrolled">ENROLLED</option>
                </select>
              </div>

              {/* Then show other notes (newest first) */}
              {timelineNotes
                .filter((note) => note.id !== 'intake-form' && !note.id.startsWith('soap-'))
                .sort((a, b) => {
                  // Sort by date, newest first
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((note) => (
                  <div key={note.id} className={`timeline-note ${note.isPinned ? 'pinned' : ''}`}>
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
                        <button className="delete-note-btn" onClick={() => deleteNote(note.id)}>
                          <CloseIcon />
                        </button>
                      </div>
                    </div>
                    <p className="note-content">{note.content}</p>
                  </div>
                ))}
            </div>

            {/* Add Note Section */}
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
          </div>
        </div>

        <div className="profile-content-wrapper">
          <div className="profile-content-section">
            <div className="patient-header">
              <div className="patient-avatar">
                {patient.first_name[0]}
                {patient.last_name[0]}
              </div>

              <div className="patient-header-info">
                <h1>
                  {patient.first_name} {patient.last_name}
                </h1>
                <div className="patient-tags">
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="header-tag"
                      style={{
                        backgroundColor: getHashtagColor(tag),
                      }}
                    >
                      {formatHashtagDisplay(tag)}
                      <button className="remove-tag-btn" onClick={() => removeHashtag(tag)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="profile-actions">
                <div className="tag-btn-wrapper">
                  <button
                    className="tag-btn"
                    onClick={() => setShowHashtagInput(!showHashtagInput)}
                    title="Add hashtag"
                  >
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>#</span>
                  </button>
                  {showHashtagInput && (
                    <div className="header-tag-input-wrapper">
                      <input
                        type="text"
                        className="header-tag-input"
                        placeholder="Add hashtag (e.g. weightloss, rep:laura)..."
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
                <button
                  className="profile-settings-btn"
                  title="Edit Profile"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <button className="more-options-btn">
                  <MoreOptionsIcon className="more-options-icon" />
                </button>
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
              <button
                className={`tab ${activeTab === 'cards' ? 'active' : ''}`}
                onClick={() => setActiveTab('cards')}
              >
                <CardIcon className="tab-icon" />
                Cards
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-section">
                  <div className="section-header">
                    <div>
                      <span className="client-id">CLIENT ID</span>
                      <span className="patient-id">{patient.patient_id}</span>
                    </div>
                  </div>

                  <div className="basic-info-section">
                    <h3>Basic Information</h3>
                    <div className="info-grid">
                      <div className="info-row">
                        <div className="info-item">
                          <label>NAME</label>
                          <p>
                            {patient.first_name} {patient.last_name}
                          </p>
                        </div>
                        <div className="info-item">
                          <label>DATE OF BIRTH</label>
                          <p>
                            {patient.date_of_birth
                              ? new Date(patient.date_of_birth).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'N/A'}{' '}
                            ({patient.date_of_birth ? calculateAge(patient.date_of_birth) : 'N/A'}{' '}
                            y/o)
                          </p>
                        </div>
                        <div className="info-item">
                          <label>SEX</label>
                          <p>
                            {patient.gender === 'female'
                              ? 'Female'
                              : patient.gender || 'Not specified'}
                          </p>
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
                                  <MapIcon className="map-icon" />
                                  {addressLine1}
                                  {addressLine2 && (
                                    <>
                                      <br />
                                      {addressLine2}
                                    </>
                                  )}
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
                          <p>
                            {patient.height_inches
                              ? `${Math.floor(patient.height_inches / 12)}' ${patient.height_inches % 12}"`
                              : 'Not provided'}
                          </p>
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
                        <p>{'Not available'}</p>
                      </div>
                      <div className="info-item">
                        <label>CLIENT CONSENTS TO DOWNLOAD MEDICATION HISTORY.</label>
                        <p>Yes</p>
                      </div>
                    </div>

                    <div className="additional-info-section">
                      <label>ADDITIONAL INFORMATION</label>
                      <div className="additional-info-box">
                        <textarea
                          className="additional-info-textarea"
                          value={additionalInfo}
                          onChange={(e) => setAdditionalInfo(e.target.value)}
                          rows={4}
                          placeholder="Enter additional information..."
                        />
                        <button
                          className="save-additional-info-btn"
                          onClick={handleSaveAdditionalInfo}
                          disabled={additionalInfo === patient.additional_info}
                        >
                          {additionalInfo === patient.additional_info
                            ? 'No changes'
                            : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'intake' && (
                <div className="overview-section">
                  {intakeLoading ? (
                    <div className="loading-container">
                      <p>Loading intake form data...</p>
                    </div>
                  ) : intakeFormData ? (
                    <>
                      {/* Header Section - Like Overview */}
                      <div className="section-header">
                        <div>
                          <span className="client-id">CLIENT ID</span>
                          <span className="patient-id">{patient?.patient_id}</span>
                        </div>
                      </div>

                      <div className="intake-form-content">
                        {/* Demographics Section */}
                        <div className="basic-info-section">
                          <h3>Demographics</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item">
                                <label>FIRST NAME</label>
                                <p>
                                  {intakeFormData.firstname ||
                                    intakeFormData.first_name ||
                                    patient?.first_name ||
                                    '-'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>LAST NAME</label>
                                <p>
                                  {intakeFormData.lastname ||
                                    intakeFormData.last_name ||
                                    patient?.last_name ||
                                    '-'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>DATE OF BIRTH</label>
                                <p>
                                  {intakeFormData.dob || patient?.date_of_birth
                                    ? new Date(
                                        intakeFormData.dob || patient?.date_of_birth
                                      ).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })
                                    : '-'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item">
                                <label>EMAIL</label>
                                <p>{intakeFormData.email || patient?.email || '-'}</p>
                              </div>
                              <div className="info-item">
                                <label>PHONE NUMBER</label>
                                <p>
                                  {intakeFormData['Phone Number'] ||
                                    intakeFormData.phone ||
                                    patient?.phone ||
                                    '-'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>GENDER</label>
                                <p>{intakeFormData.gender || patient?.gender || '-'}</p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item">
                                <label>I AM 18 YEARS OR OLDER</label>
                                <p>
                                  <span
                                    style={{
                                      color:
                                        intakeFormData['I am 18 years or older'] === 'yes' ||
                                        intakeFormData['I am 18 years or older'] === true
                                          ? '#14a97b'
                                          : '#ef4444',
                                      fontSize: '20px',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {intakeFormData['I am 18 years or older'] === 'yes' ||
                                    intakeFormData['I am 18 years or older'] === true
                                      ? '✓'
                                      : '✗'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Physical Information Section */}
                        <div className="basic-info-section">
                          <h3>Physical Information</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item">
                                <label>WHAT IS YOUR HEIGHT?</label>
                                <p>
                                  {intakeFormData.feet || '-'} ft {intakeFormData.inches || '-'} in
                                </p>
                              </div>
                              <div className="info-item">
                                <label>WHAT IS YOUR CURRENT WEIGHT?</label>
                                <p>
                                  {intakeFormData.starting_weight || intakeFormData.weight || '-'}{' '}
                                  lbs
                                </p>
                              </div>
                              <div className="info-item">
                                <label>BMI</label>
                                <p>
                                  {intakeFormData.BMI || intakeFormData.bmi || patient?.bmi || '-'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item">
                                <label>WHAT IS YOUR IDEAL/TARGET WEIGHT?</label>
                                <p>
                                  {intakeFormData.idealweight ||
                                    intakeFormData.target_weight ||
                                    '-'}{' '}
                                  lbs
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Current Address Section */}
                        <div className="basic-info-section">
                          <h3>Current Address</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>ADDRESS</label>
                                <p>
                                  {intakeFormData['address [house]'] || ''}{' '}
                                  {intakeFormData['address [street]'] || ''}
                                  {intakeFormData['apartment#'] &&
                                    `, Apt ${intakeFormData['apartment#']}`}
                                  <br />
                                  {intakeFormData['address [city]'] || ''}
                                  {intakeFormData['address [city]'] &&
                                  intakeFormData['address [state]']
                                    ? ', '
                                    : ''}
                                  {intakeFormData['address [state]'] || ''}{' '}
                                  {intakeFormData['address [zip]'] || ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Medical History Section */}
                        <div className="basic-info-section">
                          <h3>Medical History</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>
                                  DO YOU HAVE A HISTORY OF ANY OF THE FOLLOWING CHRONIC CONDITIONS?
                                </label>
                                <p>
                                  {intakeFormData[
                                    'Do you have a history of any of the following chronic conditions?'
                                  ] ||
                                    intakeFormData.chronic_conditions ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>HAVE YOU HAD ANY SURGERIES? IF SO, PLEASE LIST THEM.</label>
                                <p>
                                  {intakeFormData[
                                    'Have you had any surgeries? If so, please list them.'
                                  ] ||
                                    intakeFormData.surgeries ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>
                                  ARE YOU CURRENTLY TAKING ANY PRESCRIPTION MEDICATIONS? IF SO,
                                  PLEASE LIST THEM.
                                </label>
                                <p>
                                  {intakeFormData[
                                    'Are you currently taking any prescription medications? If so, please list them.'
                                  ] ||
                                    intakeFormData.medications ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>
                                  DO YOU HAVE ANY ALLERGIES (MEDICATIONS, FOODS, OR OTHER)?
                                </label>
                                <p>
                                  {intakeFormData[
                                    'Do you have any allergies (medications, foods, or other)?'
                                  ] ||
                                    intakeFormData.allergies ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lifestyle & Activity Section */}
                        <div className="basic-info-section">
                          <h3>Lifestyle & Activity</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>HOW OFTEN DO YOU EXERCISE PER WEEK?</label>
                                <p>
                                  {intakeFormData['How often do you exercise per week?'] ||
                                    intakeFormData.exercise_frequency ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>HOW WOULD YOU DESCRIBE YOUR CURRENT DIET?</label>
                                <p>
                                  {intakeFormData['How would you describe your current diet?'] ||
                                    intakeFormData.diet_description ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* GLP-1 History Section - Keep Yellow Background */}
                        <div className="basic-info-section glp1-section">
                          <h3>GLP-1 History</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>
                                  HAVE YOU PREVIOUSLY TAKEN ANY GLP-1 MEDICATIONS (OZEMPIC, WEGOVY,
                                  MOUNJARO, ETC.)?
                                </label>
                                <p>
                                  {intakeFormData[
                                    'Have you previously taken any GLP-1 medications (Ozempic, Wegovy, Mounjaro, etc.)?'
                                  ] ||
                                    intakeFormData.glp1_history ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>IF YES, WHICH MEDICATION(S) AND FOR HOW LONG?</label>
                                <p>
                                  {intakeFormData[
                                    'If yes, which medication(s) and for how long?'
                                  ] ||
                                    intakeFormData.glp1_details ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Consent Forms Section */}
                        <div className="basic-info-section">
                          <h3>Consent Forms</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item">
                                <label>CONSENT TO TREATMENT</label>
                                <p>
                                  <span
                                    style={{
                                      color:
                                        intakeFormData.consent_treatment === 'yes' ||
                                        intakeFormData.consent_treatment === true
                                          ? '#14a97b'
                                          : '#ef4444',
                                      fontSize: '20px',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {intakeFormData.consent_treatment === 'yes' ||
                                    intakeFormData.consent_treatment === true
                                      ? '✓'
                                      : '✗'}
                                  </span>
                                </p>
                              </div>
                              <div className="info-item">
                                <label>CONSENT TO TELEHEALTH</label>
                                <p>
                                  <span
                                    style={{
                                      color:
                                        intakeFormData.consent_telehealth === 'yes' ||
                                        intakeFormData.consent_telehealth === true
                                          ? '#14a97b'
                                          : '#ef4444',
                                      fontSize: '20px',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {intakeFormData.consent_telehealth === 'yes' ||
                                    intakeFormData.consent_telehealth === true
                                      ? '✓'
                                      : '✗'}
                                  </span>
                                </p>
                              </div>
                              <div className="info-item">
                                <label>MARKETING CONSENT</label>
                                <p>
                                  <span
                                    style={{
                                      color:
                                        intakeFormData.marketing_consent === 'yes' ||
                                        intakeFormData.marketing_consent === true
                                          ? '#14a97b'
                                          : '#ef4444',
                                      fontSize: '20px',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {intakeFormData.marketing_consent === 'yes' ||
                                    intakeFormData.marketing_consent === true
                                      ? '✓'
                                      : '✗'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Medical History Questions Section */}
                        <div className="basic-info-section">
                          <h3>Medical History Questions</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item">
                                <label>BLOOD PRESSURE</label>
                                <p>
                                  {intakeFormData['Blood Pressure'] ||
                                    intakeFormData.blood_pressure ||
                                    'I havent done it recently.'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>MEDICAL CONDITIONS</label>
                                <p>
                                  {intakeFormData['Medical Conditions'] ||
                                    intakeFormData.medical_conditions ||
                                    'No'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>MENTAL HEALTH CONDITIONS</label>
                                <p>
                                  {intakeFormData['Mental Health Conditions'] ||
                                    intakeFormData.mental_health_conditions ||
                                    'No'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item">
                                <label>SURGERIES/PROCEDURES</label>
                                <p>
                                  {intakeFormData['Surgeries/Procedures'] ||
                                    intakeFormData.surgeries_procedures ||
                                    'No'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>TYPE 2 DIABETES</label>
                                <p>
                                  {intakeFormData['Type 2 Diabetes'] ||
                                    intakeFormData.type2_diabetes ||
                                    'No'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>THYROID CANCER</label>
                                <p>
                                  {intakeFormData['Thyroid Cancer'] ||
                                    intakeFormData.thyroid_cancer ||
                                    'No'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item">
                                <label>MULTIPLE ENDOCRINE NEOPLASIA</label>
                                <p>
                                  {intakeFormData['Multiple Endocrine Neoplasia'] ||
                                    intakeFormData.multiple_endocrine_neoplasia ||
                                    'No'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>GASTROPARESIS</label>
                                <p>
                                  {intakeFormData['Gastroparesis'] ||
                                    intakeFormData.gastroparesis ||
                                    'No'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>PREGNANT/BREASTFEEDING</label>
                                <p>
                                  {intakeFormData['Pregnant/Breastfeeding'] ||
                                    intakeFormData.pregnant_breastfeeding ||
                                    'No'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Chronic Conditions Section */}
                        <div className="basic-info-section">
                          <h3>Chronic Conditions</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>DIAGNOSED CONDITIONS</label>
                                <p>
                                  {intakeFormData['Diagnosed Conditions'] ||
                                    intakeFormData.diagnosed_conditions ||
                                    'No, none of these apply to me'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>CHRONIC DISEASES</label>
                                <p>
                                  {intakeFormData['Chronic Diseases'] ||
                                    intakeFormData.chronic_diseases ||
                                    'No, none of these'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>FAMILY HISTORY</label>
                                <p>
                                  {intakeFormData['Family History'] ||
                                    intakeFormData.family_history ||
                                    'No, none of these.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Medication History Section */}
                        <div className="basic-info-section">
                          <h3>Medication History</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>GLP-1 MEDICATION HISTORY</label>
                                <p>
                                  {intakeFormData['GLP-1 Medication History'] ||
                                    intakeFormData.glp1_medication_history ||
                                    'I have never taken a GLP-1 medication'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>SIDE EFFECTS</label>
                                <p>
                                  {intakeFormData['Side Effects'] ||
                                    intakeFormData.side_effects ||
                                    'I dont experience side effects'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item full-width">
                                <label>PERSONALIZED TREATMENT INTEREST</label>
                                <p>
                                  {intakeFormData['Personalized Treatment Interest'] ||
                                    intakeFormData.personalized_treatment_interest ||
                                    'No'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Marketing & Consent Section */}
                        <div className="basic-info-section">
                          <h3>Marketing & Consent</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item">
                                <label>HOW DID YOU HEAR ABOUT US?</label>
                                <p>
                                  {intakeFormData['How did you hear about us?'] ||
                                    intakeFormData.referral_source ||
                                    'Instagram'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>STATE OF RESIDENCE</label>
                                <p>
                                  {intakeFormData['State of Residence'] ||
                                    intakeFormData.state_of_residence ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item">
                                <label>MARKETING CONSENT</label>
                                <p>
                                  {intakeFormData['Marketing Consent'] ||
                                    intakeFormData.marketing_consent_text ||
                                    'Yes'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>TERMS AGREEMENT</label>
                                <p>
                                  {intakeFormData['Terms Agreement'] ||
                                    intakeFormData.terms_agreement ||
                                    'Yes'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Marketing Attribution Section */}
                        <div className="basic-info-section">
                          <h3>Marketing Attribution</h3>
                          <div className="info-grid">
                            <div className="info-row">
                              <div className="info-item">
                                <label>UTM SOURCE</label>
                                <p>
                                  {intakeFormData['UTM Source'] || intakeFormData.utm_source || '-'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>UTM MEDIUM</label>
                                <p>
                                  {intakeFormData['UTM Medium'] || intakeFormData.utm_medium || '-'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>UTM CAMPAIGN</label>
                                <p>
                                  {intakeFormData['UTM Campaign'] ||
                                    intakeFormData.utm_campaign ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                            <div className="info-row">
                              <div className="info-item">
                                <label>UTM CONTENT</label>
                                <p>
                                  {intakeFormData['UTM Content'] ||
                                    intakeFormData.utm_content ||
                                    '-'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>UTM TERM</label>
                                <p>
                                  {intakeFormData['UTM Term'] || intakeFormData.utm_term || '-'}
                                </p>
                              </div>
                              <div className="info-item">
                                <label>UTM ID</label>
                                <p>{intakeFormData['UTM ID'] || intakeFormData.utm_id || '-'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PDF Download Button */}
                        <div className="form-actions-container">
                          <button
                            className="view-pdf-btn"
                            onClick={() =>
                              window.open(
                                `${process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app'}/api/v1/patients/${id}/intake-pdf`,
                                '_blank'
                              )
                            }
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                              style={{ marginRight: '8px' }}
                            >
                              <path d="M2 2a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V2zm2 0v12h8V2H4zm2 3h4v2H6V5zm0 3h4v2H6V8z" />
                            </svg>
                            View Intake Form PDF
                          </button>
                          <button className="download-pdf-btn" onClick={downloadPDF}>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                              style={{ marginRight: '8px' }}
                            >
                              <path d="M8.5 1v7.5H15m-6.5 0L15 2M1 9v5a1 1 0 001 1h12a1 1 0 001-1V9M8 11.5v3m0 0l-2.5-2.5M8 14.5l2.5-2.5" />
                            </svg>
                            Download Intake Form PDF
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="intake-form-card">
                      <div className="form-icon">
                        <FormIcon className="form-icon-large" />
                      </div>
                      <div className="form-details">
                        <h3>Weight Loss Intake Form</h3>
                        <p>
                          Submitted on{' '}
                          {patient && new Date(patient.created_at).toLocaleDateString()}
                        </p>
                        <p className="form-id">Form ID: {patient?.patient_id}</p>
                      </div>
                      <div className="form-actions">
                        <button
                          className="view-pdf-btn"
                          onClick={() =>
                            window.open(
                              `${process.env.REACT_APP_API_URL || 'https://eonmeds-platform2025-production.up.railway.app'}/api/v1/patients/${id}/intake-pdf`,
                              '_blank'
                            )
                          }
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            style={{ marginRight: '8px' }}
                          >
                            <path d="M2 2a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V2zm2 0v12h8V2H4zm2 3h4v2H6V5zm0 3h4v2H6V8z" />
                          </svg>
                          View Intake Form PDF
                        </button>
                        <button className="download-pdf-btn" onClick={downloadPDF}>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            style={{ marginRight: '8px' }}
                          >
                            <path d="M8.5 1v7.5H15m-6.5 0L15 2M1 9v5a1 1 0 001 1h12a1 1 0 001-1V9M8 11.5v3m0 0l-2.5-2.5M8 14.5l2.5-2.5" />
                          </svg>
                          Download Intake Form PDF
                        </button>
                      </div>
                    </div>
                  )}
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
                  <PatientInvoices
                    patientId={patient.patient_id}
                    patientName={`${patient.first_name} ${patient.last_name}`}
                    patientEmail={patient.email}
                    stripeCustomerId={patient.stripe_customer_id}
                  />
                </div>
              )}

              {activeTab === 'soap' && (
                <div className="soap-tab">
                  <SOAPNotes
                    patientId={patient.patient_id}
                    patientName={`${patient.first_name} ${patient.last_name}`}
                    onSOAPCreated={(noteDate) => {
                      // Add SOAP note creation to timeline
                      const soapNote: TimelineNote = {
                        id: `soap-${Date.now()}`,
                        content: `SOAP Note Attached`,
                        createdAt: new Date(),
                        isPinned: false,
                      };
                      const updatedNotes = [soapNote, ...timelineNotes];
                      setTimelineNotes(updatedNotes);
                      localStorage.setItem(`patient-notes-${id}`, JSON.stringify(updatedNotes));
                    }}
                  />
                </div>
              )}

              {activeTab === 'prescriptions' && (
                <div className="prescriptions-tab">
                  <h2>Prescriptions</h2>
                  <p className="coming-soon">Prescription tracking coming soon!</p>
                </div>
              )}

              {activeTab === 'cards' && (
                <div className="cards-tab">
                  <PatientCards 
                    patientId={patient.patient_id} 
                    patientEmail={patient.email}
                    patientName={`${patient.first_name} ${patient.last_name}`}
                  />
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
