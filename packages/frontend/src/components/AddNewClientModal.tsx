import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import './AddNewClientModal.css';

interface AddNewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ClientFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
}

export const AddNewClientModal: React.FC<AddNewClientModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const apiClient = useApi();
  const [formData, setFormData] = useState<ClientFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteClient, setInviteClient] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError('First name, last name, and email are required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create the patient/client
      const response = await apiClient.post('/api/v1/patients', {
        ...formData,
        form_type: 'manual_entry',
        status: 'qualified',
        consent_treatment: true,
        consent_telehealth: true,
        consent_date: new Date().toISOString()
      });

      // If invite checkbox is checked, send invite email
      if (inviteClient) {
        await apiClient.post(`/api/v1/patients/${response.data.id}/invite`, {
          email: formData.email
        });
      }

      // Success - close modal and refresh list
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: ''
      });
      setInviteClient(false);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add a new Client</h2>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <input
              type="text"
              name="first_name"
              placeholder="First Name"
              value={formData.first_name}
              onChange={handleChange}
              className="form-input"
            />
            <input
              type="text"
              name="last_name"
              placeholder="Last Name"
              value={formData.last_name}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <input
              type="date"
              name="date_of_birth"
              placeholder="Date of Birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className="form-input date-input"
            />
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="form-input"
            >
              <option value="">Sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="invite-section">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={inviteClient}
                onChange={(e) => setInviteClient(e.target.checked)}
              />
              <span className="checkbox-label">
                Invite Client to download the eonmeds app.
              </span>
            </label>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn-cancel" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="btn-save" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}; 