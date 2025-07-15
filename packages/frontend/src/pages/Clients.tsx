import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useApi } from '../hooks/useApi';
import { Patient, PatientListResponse } from '../services/patient.service';
import { debounce } from '../utils/debounce';
import './Clients.css';

export const Clients: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth0();
  const apiClient = useApi();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: '2-digit' 
    });
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return '';
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
    return phone;
  };

  return (
    <div className="clients-page">
      <div className="clients-header">
        <div className="header-top">
          <div className="search-container">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" 
                stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search for Clients"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="header-actions">
            <button className="language-toggle">En</button>
            <button className="language-toggle inactive">Es</button>
            <button className="logout-btn" onClick={handleLogout}>Log out</button>
          </div>
        </div>
        <div className="header-content">
          <h1 className="page-title">Welcome, Italo</h1>
          <button className="add-client-btn">Add New Client</button>
        </div>
      </div>

      <div className="clients-table-container">
        <table className="clients-table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Created</th>
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
    </div>
  );
}; 