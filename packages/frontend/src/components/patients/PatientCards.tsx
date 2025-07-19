import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { CardIcon, CloseIcon } from '../common/Icons';
import { LoadingSpinner } from '../common/LoadingSpinner';
import './PatientCards.css';

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  created: number;
  is_default: boolean;
}

interface PatientCardsProps {
  patientId: string;
}

export const PatientCards: React.FC<PatientCardsProps> = ({ patientId }) => {
  const apiClient = useApi();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [formData, setFormData] = useState({
    card_number: '',
    exp_month: '',
    exp_year: '',
    cvc: '',
    set_as_default: false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, [patientId]);

  const loadCards = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/v1/payments/patients/${patientId}/cards`);
      setCards(response.data.cards || []);
    } catch (err) {
      console.error('Error loading cards:', err);
      setError('Failed to load saved cards');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Format card number with spaces
    if (name === 'card_number') {
      const formatted = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Remove spaces from card number before sending
      const cardData = {
        ...formData,
        card_number: formData.card_number.replace(/\s/g, ''),
        exp_month: parseInt(formData.exp_month),
        exp_year: parseInt(formData.exp_year)
      };

      await apiClient.post(`/api/v1/payments/patients/${patientId}/cards`, cardData);
      
      // Reset form and reload cards
      setFormData({
        card_number: '',
        exp_month: '',
        exp_year: '',
        cvc: '',
        set_as_default: false
      });
      setShowAddCard(false);
      await loadCards();
    } catch (err: any) {
      console.error('Error adding card:', err);
      setError(err.response?.data?.error || 'Failed to add card');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('Are you sure you want to remove this card?')) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/payments/cards/${cardId}`);
      await loadCards();
    } catch (err) {
      console.error('Error deleting card:', err);
      alert('Failed to remove card');
    }
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  if (loading) {
    return (
      <div className="cards-loading">
        <LoadingSpinner />
        <p>Loading saved cards...</p>
      </div>
    );
  }

  return (
    <div className="patient-cards-container">
      <div className="cards-header">
        <h3>Saved Payment Methods</h3>
        <button 
          className="add-card-btn"
          onClick={() => setShowAddCard(!showAddCard)}
        >
          + Add Card
        </button>
      </div>

      {showAddCard && (
        <div className="add-card-form">
          <h4>Add New Card</h4>
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label>Card Number</label>
              <input
                type="text"
                name="card_number"
                value={formData.card_number}
                onChange={handleInputChange}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Expiry Month</label>
                <input
                  type="number"
                  name="exp_month"
                  value={formData.exp_month}
                  onChange={handleInputChange}
                  placeholder="MM"
                  min="1"
                  max="12"
                  required
                />
              </div>
              <div className="form-group">
                <label>Expiry Year</label>
                <input
                  type="number"
                  name="exp_year"
                  value={formData.exp_year}
                  onChange={handleInputChange}
                  placeholder="YYYY"
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 20}
                  required
                />
              </div>
              <div className="form-group">
                <label>CVC</label>
                <input
                  type="text"
                  name="cvc"
                  value={formData.cvc}
                  onChange={handleInputChange}
                  placeholder="123"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="set_as_default"
                  checked={formData.set_as_default}
                  onChange={handleInputChange}
                />
                Set as default payment method
              </label>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => {
                  setShowAddCard(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="save-btn"
                disabled={saving}
              >
                {saving ? 'Adding...' : 'Add Card'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="cards-list">
        {cards.length === 0 ? (
          <div className="no-cards">
            <CardIcon className="no-cards-icon" />
            <p>No saved payment methods</p>
            <p className="text-muted">Add a card to enable quick payments</p>
          </div>
        ) : (
          cards.map(card => (
            <div key={card.id} className="card-item">
              <div className="card-details">
                <CardIcon className="card-icon" />
                <div className="card-info">
                  <div className="card-brand-number">
                    {formatCardBrand(card.brand)} •••• {card.last4}
                  </div>
                  <div className="card-expiry">
                    Expires {card.exp_month}/{card.exp_year}
                  </div>
                </div>
                {card.is_default && (
                  <span className="default-badge">Default</span>
                )}
              </div>
              <button
                className="delete-card-btn"
                onClick={() => handleDeleteCard(card.id)}
                title="Remove card"
              >
                <CloseIcon className="delete-icon" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}; 