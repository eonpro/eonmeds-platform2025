import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { CardIcon, CloseIcon } from '../common/Icons';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { StripePaymentForm } from './StripePaymentForm';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/v1/payment-methods/patient/${patientId}`);
      setCards(response.data.payment_methods || response.data.cards || []);
    } catch (err) {
      console.error('Error loading cards:', err);
      setError('Failed to load saved cards');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleAddCard = async (paymentMethodId: string) => {
    setError(null);
    setSaving(true);

    try {
      await apiClient.post(`/api/v1/payment-methods/attach`, {
        payment_method_id: paymentMethodId,
        patient_id: patientId,
        set_as_default: cards.length === 0, // Set as default if it's the first card
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
      await apiClient.delete(`/api/v1/payment-methods/${cardId}`);
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
        <button className="add-card-btn" onClick={() => setShowAddCard(!showAddCard)}>
          + Add Card
        </button>
      </div>

      {showAddCard && (
        <div className="add-card-form">
          <h4>Add New Card</h4>
          {error && <div className="error-message">{error}</div>}

          <StripePaymentForm
            onPaymentMethodCreated={handleAddCard}
            onCancel={() => {
              setShowAddCard(false);
              setError(null);
            }}
            saveCard={true}
            processing={saving}
          />
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
          cards.map((card) => (
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
                {card.is_default && <span className="default-badge">Default</span>}
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
