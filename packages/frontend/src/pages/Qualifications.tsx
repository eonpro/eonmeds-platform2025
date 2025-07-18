import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { Patient, PatientListResponse } from '../services/patient.service';
import { debounce } from '../utils/debounce';
import './Qualifications.css';

export const Qualifications: React.FC = () => {
  const navigate = useNavigate();
  const apiClient = useApi();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch patients that need qualification (pending_review status)
  const fetchPendingPatients = useCallback(async (search?: string, showLoading = true) => {
    if (!apiClient) return;

    try {
      if (showLoading) setLoading(true);
      const response = await apiClient.get<PatientListResponse>('/api/v1/patients', {
        params: {
          search,
          status: 'pending', // Only fetch patients with pending status
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
        <p className="subtitle">Review and qualify new patient submissions from HeyFlow</p>
      </div>

      <div className="qualifications-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
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
              <th>BMI</th>
              <th>SUBMITTED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="loading-cell">Loading submissions...</td>
              </tr>
            ) : displayedPatients.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  {searchTerm ? 'No submissions found matching your search' : 'No pending qualifications'}
                </td>
              </tr>
            ) : (
              displayedPatients.map((patient) => (
                <tr key={patient.id} className="qualification-row">
                  <td className="patient-id" onClick={() => handlePatientClick(patient.id)}>
                    {patient.patient_id || '-'}
                  </td>
                  <td className="patient-name" onClick={() => handlePatientClick(patient.id)}>
                    {patient.name || `${patient.first_name} ${patient.last_name}`}
                  </td>
                  <td className="patient-email" onClick={() => handlePatientClick(patient.id)}>
                    {patient.email}
                  </td>
                  <td className="patient-phone" onClick={() => handlePatientClick(patient.id)}>
                    {formatPhoneNumber(patient.phone)}
                  </td>
                  <td className="patient-bmi" onClick={() => handlePatientClick(patient.id)}>
                    <span className={`bmi-badge ${patient.bmi && patient.bmi >= 27 ? 'qualified' : 'not-qualified'}`}>
                      {patient.bmi || '-'}
                    </span>
                  </td>
                  <td className="patient-submitted" onClick={() => handlePatientClick(patient.id)}>
                    {formatDate(patient.created_at)}
                  </td>
                  <td className="patient-actions">
                    <button 
                      className="qualify-btn"
                      onClick={() => handleQualifyPatient(patient.id, 'qualified')}
                      title="Qualify as client"
                    >
                      ✓ Qualify
                    </button>
                    <button 
                      className="disqualify-btn"
                      onClick={() => handleQualifyPatient(patient.id, 'not_qualified')}
                      title="Disqualify"
                    >
                      ✗ Disqualify
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 