import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { Patient, PatientListResponse } from '../../services/patient.service';
import { debounce } from '../../utils/debounce';
import './PatientList.css';

export const PatientList: React.FC = () => {
  const navigate = useNavigate();
  const apiClient = useApi();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Membership filters
  const membershipFilters = [
    { 
      id: 'active',
      label: 'Plan',
      tag: '#activemember',
      color: '#00C851',
      icon: '✓'
    },
    { 
      id: 'paused',
      label: 'Pause',
      tag: '#paused',
      color: '#FFA500',
      icon: '⏸'
    },
    { 
      id: 'cancelled',
      label: 'Cancelled',
      tag: '#cancelled',
      color: '#FF4444',
      icon: '✕'
    }
  ];

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
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch patients');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
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

  // Filter patients by membership status
  const filteredPatients = patients.filter(patient => {
    if (selectedFilters.length === 0) return true;
    
    return selectedFilters.some(filter => {
      const filterConfig = membershipFilters.find(f => f.id === filter);
      if (!filterConfig) return false;
      
      return patient.membership_hashtags?.includes(filterConfig.tag) ||
             (filter === 'active' && patient.membership_status === 'active') ||
             (filter === 'paused' && patient.membership_status === 'paused') ||
             (filter === 'cancelled' && patient.membership_status === 'cancelled');
    });
  });

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  const handlePatientClick = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  // Check if API client is initialized (user is authenticated)
  if (!apiClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view patients</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading && patients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading patients...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="patient-list-container" style={{ padding: '20px', fontFamily: 'Poppins, sans-serif' }}>
      <div className="header-section" style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '20px', color: '#1a1a1a' }}>Patients</h1>
        
        {/* Search bar */}
        <div className="search-section" style={{ marginBottom: '20px' }}>
          <div style={{ 
            position: 'relative', 
            maxWidth: '400px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '10px 15px'
          }}>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 20 20" 
              fill="none" 
              style={{ marginRight: '10px', flexShrink: 0 }}
            >
              <path 
                d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" 
                stroke="#6B7280" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search patients by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '14px',
                width: '100%',
                color: '#1a1a1a'
              }}
            />
          </div>
        </div>

        {/* Filter buttons */}
        <div className="filter-section" style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '14px', 
            color: '#6B7280', 
            marginRight: '10px'
          }}>
            Filter by status:
          </span>
          {membershipFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => toggleFilter(filter.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                border: selectedFilters.includes(filter.id) 
                  ? `2px solid ${filter.color}` 
                  : '2px solid #e5e7eb',
                borderRadius: '6px',
                backgroundColor: selectedFilters.includes(filter.id) 
                  ? `${filter.color}15` 
                  : 'white',
                color: selectedFilters.includes(filter.id) 
                  ? filter.color 
                  : '#6B7280',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '16px' }}>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Patient table/list */}
      {loading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '300px',
          color: '#6B7280'
        }}>
          <div>Loading patients...</div>
        </div>
      ) : error ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#DC2626'
        }}>
          <p>Error: {error}</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Patient ID
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Name
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Email
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Phone
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Status
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ 
                    padding: '60px', 
                    textAlign: 'center',
                    color: '#6B7280',
                    fontSize: '14px'
                  }}>
                    <div style={{ marginBottom: '20px' }}>
                      <svg 
                        width="48" 
                        height="48" 
                        viewBox="0 0 48 48" 
                        fill="none" 
                        style={{ margin: '0 auto', marginBottom: '16px', display: 'block' }}
                      >
                        <circle cx="24" cy="24" r="20" stroke="#E5E7EB" strokeWidth="3"/>
                        <path d="M24 14V26M24 34H24.01" stroke="#6B7280" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    </div>
                    {searchTerm || selectedFilters.length > 0 
                      ? 'No patients found matching your criteria' 
                      : 'No patients yet'}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr 
                    key={patient.id} 
                    onClick={() => handlePatientClick(patient.id)}
                    style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>
                      {patient.id}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      {patient.first_name} {patient.last_name}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6B7280' }}>
                      {patient.email}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6B7280' }}>
                      {patient.phone || '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {renderPatientStatus(patient)}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6B7280' }}>
                      {new Date(patient.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Activity Section */}
      <div style={{ 
        marginTop: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Recent Activity
        </h2>
        <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}>
          <div style={{ marginBottom: '8px' }}>Logged in at 7/13/2025, 6:53:33 PM</div>
          <div style={{ marginBottom: '8px' }}>Profile synced with backend</div>
          <div>Language preference: English</div>
        </div>
      </div>
    </div>
  );

  function renderPatientStatus(patient: Patient) {
    const status = patient.membership_status || 'qualified';
    const statusConfig = {
      active: { color: '#00C851', bg: '#00C85115', label: 'Active' },
      qualified: { color: '#33B5E5', bg: '#33B5E515', label: 'Qualified' },
      paused: { color: '#FFA500', bg: '#FFA50015', label: 'Paused' },
      cancelled: { color: '#FF4444', bg: '#FF444415', label: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.qualified;

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        color: config.color,
        backgroundColor: config.bg,
        display: 'inline-block'
      }}>
        {config.label}
      </span>
    );
  }
}; 