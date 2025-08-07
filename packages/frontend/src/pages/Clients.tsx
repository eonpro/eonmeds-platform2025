import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useApi } from '../hooks/useApi';
import { Patient, PatientListResponse } from '../services/patient.service';
import { debounce } from '../utils/debounce';
import { getHashtagType } from '../utils/hashtag-utils';
import { AddNewClientModal } from '../components/AddNewClientModal';
import './Clients.css';

// Delete Confirmation Modal Component
interface DeleteModalProps {
  isOpen: boolean;
  patientName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({ isOpen, patientName, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Delete Patient</h2>
        <p>Are you sure you want to delete <strong>{patientName}</strong>?</p>
        <p className="warning-text">This action cannot be undone.</p>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="confirm-delete-btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export const Clients: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth0();
  const apiClient = useApi();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousPatientCountRef = useRef<number>(0);
  const [newPatientNotification, setNewPatientNotification] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; patientId: string; patientName: string }>({
    isOpen: false,
    patientId: '',
    patientName: ''
  });

  // Fetch patients
  const fetchPatients = useCallback(async (search?: string, showLoading = true) => {
    if (!apiClient) return;

    try {
      if (showLoading) setLoading(true);
      const response = await apiClient.get<PatientListResponse>('/api/v1/patients', {
        params: {
          search,
          status: 'qualified', // Only fetch qualified patients (paying customers)
          limit: 100,
          offset: 0
        }
      });
      const newPatients = response.data.patients || [];
      
      // Log the fetch results
      console.log(`Fetched ${newPatients.length} patients at ${new Date().toLocaleTimeString()}`);
      
      // Check for new patients (only when not loading initially)
      if (!showLoading && newPatients.length > previousPatientCountRef.current) {
        const diff = newPatients.length - previousPatientCountRef.current;
        setNewPatientNotification(`${diff} new patient${diff > 1 ? 's' : ''} added!`);
        setTimeout(() => setNewPatientNotification(null), 5000);
      }
      
      previousPatientCountRef.current = newPatients.length;
      setPatients(newPatients);
    } catch (err: any) {
      console.error('Error fetching patients:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [apiClient]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      fetchPatients(term);
    }, 300),
    [fetchPatients]
  );

  // Set up polling for real-time updates
  useEffect(() => {
    // Initial fetch
    fetchPatients();

    // Set up polling every 5 seconds for more real-time updates
    pollingIntervalRef.current = setInterval(() => {
      console.log('Polling for new patients...', new Date().toLocaleTimeString());
      fetchPatients(searchTerm, false); // Don't show loading indicator for background updates
    }, 5000); // Reduced from 10000ms to 5000ms for faster updates

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchPatients, searchTerm]);

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    } else {
      fetchPatients();
    }
  }, [searchTerm, debouncedSearch, fetchPatients]);

  // Extract unique tags from all patients
  useEffect(() => {
    const tags = new Set<string>();
    patients.forEach(patient => {
      if (patient.membership_hashtags && Array.isArray(patient.membership_hashtags)) {
        patient.membership_hashtags.forEach(tag => tags.add(tag));
      }
    });
    setAvailableTags(Array.from(tags).sort());
  }, [patients]);

  // Filter patients based on selected tag
  const displayedPatients = useMemo(() => {
    if (!selectedTag) return patients;
    
    return patients.filter(patient => 
      patient.membership_hashtags && 
      patient.membership_hashtags.includes(selectedTag)
    );
  }, [patients, selectedTag]);

  // Format date for display
  const formatDate = (date: string | Date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: '2-digit' 
    });
  };

  // Determine status based on BMI
  const getPatientStatus = (patient: Patient) => {
    if (!patient.bmi || patient.bmi === 0) {
      return { status: 'processing', label: 'Processing' };
    }
    
    if (patient.bmi < 22) {
      return { status: 'not-qualified', label: 'Not Qualified' };
    }
    
    return { status: 'qualified', label: 'Qualified' };
  };

  const handlePatientClick = (patientId: string) => {
    navigate(`/clients/${patientId}`);
  };

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handleAddNewClient = () => {
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
  };

  const handleAddSuccess = () => {
    fetchPatients(); // Refresh the list
  };

  const handleDelete = async (patientId: string, patientName: string) => {
    setDeleteModal({ isOpen: true, patientId, patientName });
  };

  const confirmDelete = async () => {
    const { patientId } = deleteModal;
    
    try {
      const response = await apiClient.delete(`/api/v1/patients/${patientId}`);
      
      if (response.data.success) {
        // Remove the patient from the list
        setPatients(prev => prev.filter(p => p.id !== patientId));
        // Close modal
        setDeleteModal({ isOpen: false, patientId: '', patientName: '' });
        // Show success notification
        setNewPatientNotification('Patient deleted successfully');
        setTimeout(() => setNewPatientNotification(null), 3000);
      } else {
        alert('Failed to delete patient. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient. Please try again.');
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, patientId: '', patientName: '' });
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

  return (
    <div className="clients-page">
      {/* New Patient Notification */}
      {newPatientNotification && (
        <div className="new-patient-notification">
          <span>{newPatientNotification}</span>
          <button onClick={() => setNewPatientNotification(null)}>×</button>
        </div>
      )}
      
      <div className="clients-header">
        <h1>Clients</h1>
      </div>
      
      <div className="clients-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search for Client"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-section">
          <select 
            className="tag-filter-dropdown"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="">Filter by Hashtag</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>#{tag}</option>
            ))}
          </select>
          
          <button 
            className="add-new-client-btn"
            onClick={handleAddNewClient}
          >
            Add New Client
          </button>
        </div>
      </div>

      <div className="clients-table-container">
        {loading ? (
          <div className="loading-state">
            <p>Loading clients...</p>
          </div>
        ) : displayedPatients.length === 0 ? (
          <div className="empty-state">
            <h2>No clients yet</h2>
          </div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Date Joined</th>
                <th>BMI</th>
                <th>Status</th>
                <th>Hashtags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedPatients.map((patient) => {
                const statusInfo = getPatientStatus(patient);
                return (
                  <tr key={patient.id} onClick={() => handlePatientClick(patient.id)} className="clickable-row">
                    <td>{patient.patient_id || '-'}</td>
                    <td>{patient.first_name} {patient.last_name}</td>
                    <td>{patient.email}</td>
                    <td>{formatPhoneNumber(patient.phone)}</td>
                    <td>{formatDate(patient.created_at)}</td>
                    <td>{patient.bmi || '-'}</td>
                    <td>
                      <span className={`status-badge status-${statusInfo.status}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td>
                      {patient.membership_hashtags && patient.membership_hashtags.length > 0 ? (
                        <div className="tag-list">
                          {patient.membership_hashtags.map(tag => (
                            <span 
                              key={tag} 
                              className="tag"
                              data-tag-type={getHashtagType(tag)}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDelete(patient.id, `${patient.first_name} ${patient.last_name}`)}
                        title="Delete patient"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AddNewClientModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        onSuccess={handleAddSuccess}
      />

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        patientName={deleteModal.patientName}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}; 