import React, { useState, useEffect } from 'react';
import { US_STATES, getStateAbbreviation } from '../../utils/states';
import './EditPatientModal.css';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientData;
  onSave: (updatedPatient: Partial<PatientData>) => Promise<void>;
}

interface PatientData {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender?: string;
  height_inches?: number;
  weight_lbs?: number;
  address?: string;
  address_house?: string;
  address_street?: string;
  apartment_number?: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: string;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<PatientData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heightFeet, setHeightFeet] = useState<number>(0);
  const [heightInches, setHeightInches] = useState<number>(0);

  useEffect(() => {
    if (patient) {
      // Check if we have new format fields or need to parse legacy address
      let addressData = {
        address_house: patient.address_house || '',
        address_street: patient.address_street || '',
        apartment_number: patient.apartment_number || ''
      };
      
      // If new fields are empty but we have a legacy address, try to parse it
      if (!patient.address_house && !patient.address_street && patient.address) {
        // Try to extract house number and street from legacy address
        const addressMatch = patient.address.match(/^(\d+)\s+(.+)$/);
        if (addressMatch) {
          addressData.address_house = addressMatch[1];
          addressData.address_street = addressMatch[2];
        }
      }
      
      setFormData({
        first_name: patient.first_name,
        last_name: patient.last_name,
        email: patient.email,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        height_inches: patient.height_inches,
        weight_lbs: patient.weight_lbs,
        address: patient.address,
        address_house: addressData.address_house,
        address_street: addressData.address_street,
        apartment_number: addressData.apartment_number,
        city: patient.city,
        state: getStateAbbreviation(patient.state),
        zip: patient.zip,
        status: patient.status
      });
      
      // Convert height to feet and inches
      if (patient.height_inches) {
        setHeightFeet(Math.floor(patient.height_inches / 12));
        setHeightInches(patient.height_inches % 12);
      }
    }
  }, [patient]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHeightChange = (type: 'feet' | 'inches', value: string) => {
    const numValue = parseInt(value) || 0;
    if (type === 'feet') {
      setHeightFeet(numValue);
      const totalInches = (numValue * 12) + heightInches;
      setFormData(prev => ({ ...prev, height_inches: totalInches }));
    } else {
      setHeightInches(numValue);
      const totalInches = (heightFeet * 12) + numValue;
      setFormData(prev => ({ ...prev, height_inches: totalInches }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError('Failed to update patient. Please try again.');
      console.error('Error updating patient:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Patient Information</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name || ''}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="date_of_birth">Date of Birth</label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth ? formData.date_of_birth.split('T')[0] : ''}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender || ''}
                onChange={handleInputChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="form-group">
              <label>Height</label>
              <div className="height-input-group">
                <div className="height-field">
                  <input
                    type="number"
                    value={heightFeet}
                    onChange={(e) => handleHeightChange('feet', e.target.value)}
                    min="0"
                    max="8"
                    placeholder="0"
                  />
                  <span className="unit-label">ft</span>
                </div>
                <div className="height-field">
                  <input
                    type="number"
                    value={heightInches}
                    onChange={(e) => handleHeightChange('inches', e.target.value)}
                    min="0"
                    max="11"
                    placeholder="0"
                  />
                  <span className="unit-label">in</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="weight_lbs">Weight (lbs)</label>
              <input
                type="number"
                id="weight_lbs"
                name="weight_lbs"
                value={formData.weight_lbs || ''}
                onChange={handleInputChange}
                min="0"
                max="1000"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address_house">House Number</label>
              <input
                type="text"
                id="address_house"
                name="address_house"
                value={formData.address_house || ''}
                onChange={handleInputChange}
                placeholder=""
              />
            </div>

            <div className="form-group">
              <label htmlFor="address_street">Street Name</label>
              <input
                type="text"
                id="address_street"
                name="address_street"
                value={formData.address_street || ''}
                onChange={handleInputChange}
                placeholder=""
              />
            </div>

            <div className="form-group">
              <label htmlFor="apartment_number">Apartment/Unit Number</label>
              <input
                type="text"
                id="apartment_number"
                name="apartment_number"
                value={formData.apartment_number || ''}
                onChange={handleInputChange}
                placeholder=""
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city || ''}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="state">State</label>
              <select
                id="state"
                name="state"
                value={formData.state || ''}
                onChange={handleInputChange}
              >
                <option value="">Select State</option>
                {US_STATES.map(state => (
                  <option key={state.abbreviation} value={state.abbreviation}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="zip">Zip Code</label>
              <input
                type="text"
                id="zip"
                name="zip"
                value={formData.zip || ''}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status || ''}
                onChange={handleInputChange}
              >
                <option value="active">Active</option>
                <option value="qualified">Qualified</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 