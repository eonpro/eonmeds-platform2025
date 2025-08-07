import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { Patient, PatientListResponse } from '../services/patient.service';
import { debounce } from '../utils/debounce';
import './Qualifications.css';

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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Delete Patient</h2>
        <p>Are you sure you want to delete <strong>{patientName}</strong>?</p>
        <p style={{ color: '#dc3545', fontSize: '14px' }}>This action cannot be undone.</p>
        <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="cancel-btn" onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '5px', background: 'white', cursor: 'pointer' }}>
            Cancel
          </button>
          <button className="delete-btn" onClick={onConfirm} style={{ padding: '8px 16px', border: 'none', borderRadius: '5px', background: '#dc3545', color: 'white', cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export const Qualifications: React.FC = () => {
  const navigate = useNavigate();
  const apiClient = useApi();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; patientId: string; patientName: string }>({
    isOpen: false,
    patientId: '',
    patientName: ''
  });

  // Fetch patients that need qualification (pending_review status)
  const fetchPendingPatients = useCallback(async (search?: string, showLoading = true) => {
    if (!apiClient) return;

    try {
      if (showLoading) setLoading(true);
      const response = await apiClient.get<PatientListResponse>('/api/v1/patients', {
        params: {
          search,
          // Remove status filter to show all patients
          limit: 100,
          offset: 0
        }
      });
      const newPatients = response.data.patients || [];
      
      setPatients(newPatients);
    } catch (err: any) {
      console.error('Error fetching pending patients:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [apiClient]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      fetchPendingPatients(term);
    }, 300),
    [fetchPendingPatients]
  );

  // Set up polling for real-time updates
  useEffect(() => {
    fetchPendingPatients();

    pollingIntervalRef.current = setInterval(() => {
      fetchPendingPatients(searchTerm, false);
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchPendingPatients, searchTerm]);

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    } else {
      fetchPendingPatients();
    }
  }, [searchTerm, debouncedSearch, fetchPendingPatients]);

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

  const formatDate = (date: string | Date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: '2-digit' 
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

  const handleDelete = async (patientId: string, patientName: string) => {
    setDeleteModal({ isOpen: true, patientId, patientName });
  };

  const confirmDelete = async () => {
    if (!apiClient) return;
    
    try {
      await apiClient.delete(`/api/v1/patients/${deleteModal.patientId}`);
      
      // Remove the patient from the list
      setPatients(patients.filter(p => p.id !== deleteModal.patientId));
      
      // Close modal
      setDeleteModal({ isOpen: false, patientId: '', patientName: '' });
    } catch (error) {
      console.error('Failed to delete patient:', error);
      alert('Failed to delete patient. Please try again.');
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, patientId: '', patientName: '' });
  };

  const handlePatientClick = (patientId: string) => {
    navigate(`/clients/${patientId}`);
  };

  const handleQualifyPatient = async (patientId: string, newStatus: string) => {
    if (!apiClient) return;

    try {
      await apiClient.put(`/api/v1/patients/${patientId}`, { status: newStatus });
      
      // If qualified, remove from the list (they'll appear in Clients tab)
      if (newStatus === 'qualified') {
        setPatients(patients.filter(p => p.id !== patientId));
      } else {
        // Otherwise, update the status in the list
        setPatients(patients.map(p => 
          p.id === patientId ? { ...p, status: newStatus } : p
        ));
      }
    } catch (err) {
      console.error('Error updating patient status:', err);
    }
  };

  return (
    <div className="qualifications-container">
      <div className="qualifications-header">
        <h1>Qualifications</h1>
      </div>

      <div className="qualifications-controls">
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
          
          <button className="add-new-client-btn">
            Add New Client
          </button>
        </div>
      </div>

      <div className="qualifications-table-container">
        <table className="qualifications-table">
          <thead>
            <tr>
              <th>PATIENT ID</th>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>PHONE</th>
              <th>STATUS</th>
              <th>HASHTAGS</th>
              <th>CREATED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="loading-cell">Loading patients...</td>
              </tr>
            ) : displayedPatients.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  {searchTerm ? 'No patients found matching your search' : 'No patients yet'}
                </td>
              </tr>
            ) : (
              displayedPatients.map((patient) => (
                <tr key={patient.id} className="qualification-row" onClick={() => handlePatientClick(patient.id)}>
                  <td className="patient-id">
                    {patient.patient_id || '-'}
                  </td>
                  <td className="patient-name">
                    {patient.name || `${patient.first_name} ${patient.last_name}`}
                  </td>
                  <td className="patient-email">
                    {patient.email}
                  </td>
                  <td className="patient-phone">
                    {formatPhoneNumber(patient.phone)}
                  </td>
                  <td className="patient-status">
                    <span className="status-badge qualified">
                      Qualified
                    </span>
                  </td>
                  <td className="patient-hashtags">
                    {patient.membership_hashtags && patient.membership_hashtags.length > 0 ? (
                      <div className="tags-container">
                        {patient.membership_hashtags.map((tag, index) => (
                          <span 
                            key={index} 
                            className="tag"
                            data-tag-type={
                              tag.toLowerCase().includes('weight') ? 'weight' :
                              tag.toLowerCase().includes('rep') || tag.toLowerCase().includes('laura') || tag.toLowerCase().includes('ana') ? 'rep' :
                              'default'
                            }
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="patient-created">
                    {formatDate(patient.created_at)}
                  </td>
                  <td className="patient-actions">
                    <button 
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(patient.id, `${patient.first_name} ${patient.last_name}`);
                      }}
                      title="Delete patient"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        patientName={deleteModal.patientName}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}; 