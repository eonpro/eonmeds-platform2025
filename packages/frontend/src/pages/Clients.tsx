import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useApi } from '../hooks/useApi';
import { Patient, PatientListResponse } from '../services/patient.service';
import { debounce } from '../utils/debounce';
import { AddNewClientModal } from '../components/AddNewClientModal';
import './Clients.css';

export const Clients: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth0();
  const apiClient = useApi();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch patients
  const fetchPatients = useCallback(async (search?: string) => {
    if (!apiClient) return;

    try {
      setLoading(true);
      const response = await apiClient.get<PatientListResponse>('/api/v1/patients', {
        params: {
          search,
          limit: 100,
          offset: 0
        }
      });
      setPatients(response.data.patients || []);
    } catch (err: any) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      fetchPatients(term);
    }, 300),
    [fetchPatients]
  );

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    } else {
      fetchPatients();
    }
  }, [searchTerm, debouncedSearch, fetchPatients]);

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
    // Refresh the patient list
    fetchPatients();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
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

  return (
    <div className="clients-page">
      <div className="page-header">
        <h1>Welcome, Italo</h1>
        <div className="header-actions">
          <button 
            className="add-new-client-btn"
            onClick={handleAddNewClient}
          >
            Add New Client
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for Clients"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="clients-table-container">
        <table className="clients-table">
          <thead>
            <tr>
              <th>PATIENT ID</th>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>PHONE</th>
              <th>STATUS</th>
              <th>CREATED</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="loading-cell">Loading clients...</td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-cell">
                  {searchTerm ? 'No clients found matching your search' : 'No clients yet'}
                </td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr 
                  key={patient.id} 
                  onClick={() => handlePatientClick(patient.id)}
                  className="client-row"
                >
                  <td className="patient-id">{patient.patient_id || 'E7007'}</td>
                  <td className="patient-name">{patient.name || `${patient.first_name} ${patient.last_name}`}</td>
                  <td className="patient-email">{patient.email}</td>
                  <td className="patient-phone">{formatPhoneNumber(patient.phone)}</td>
                  <td className="patient-status">
                    <span className="status-badge qualified">Qualified</span>
                  </td>
                  <td className="patient-created">{formatDate(patient.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddNewClientModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}; 