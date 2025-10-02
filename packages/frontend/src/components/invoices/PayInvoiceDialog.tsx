import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useApi } from '../../hooks/useApi';
import config from '../../config';
import './PayInvoiceDialog.css';

// Initialize Stripe
const stripePromise = loadStripe(config.STRIPE_PUBLISHABLE_KEY);

interface PayInvoiceDialogProps {
  invoice: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface PaymentFormProps {
  invoice: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ invoice, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const apiClient = useApi();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'saved' | 'new'>('saved');
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingCards, setLoadingCards] = useState(true);

  useEffect(() => {
    loadSavedCards();
  }, []);

  useEffect(() => {
    if (paymentMethod === 'new' && !clientSecret) {
      createSetupIntent();
    }
  }, [paymentMethod]);

  const loadSavedCards = async () => {
    try {
      setLoadingCards(true);
      const response = await apiClient.get(`/api/v1/billing/payment-methods/list?patientId=${invoice.patient_id}`);
      const cards = response.data.payment_methods || [];
      setSavedCards(cards);
      
      // Select default card if available
      const defaultCard = cards.find((card: any) => card.is_default);
      if (defaultCard) {
        setSelectedCard(defaultCard.id);
      } else if (cards.length > 0) {
        setSelectedCard(cards[0].id);
      }
      
      // If no saved cards, switch to new card mode
      if (cards.length === 0) {
        setPaymentMethod('new');
      }
    } catch (err) {
      console.error('Error loading saved cards:', err);
      setPaymentMethod('new');
    } finally {
      setLoadingCards(false);
    }
  };

  const createSetupIntent = async () => {
    try {
      setError(null);
      const response = await apiClient.post('/api/v1/billing/payment-methods/setup-intent', {
        patientId: invoice.patient_id
      });
      
      if (response.data.client_secret) {
        setClientSecret(response.data.client_secret);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize payment');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      if (paymentMethod === 'saved') {
        // Pay with saved card
        const response = await apiClient.post('/api/v1/billing/invoices/pay', {
          invoice_id: invoice.stripe_invoice_id || invoice.id,
          use_saved_pm: true
        });

        if (response.data.paid) {
          showSuccessToast(`Invoice paid • $${invoice.total_amount} • ${getSavedCardDisplay()}`);
          onSuccess();
        }
      } else {
        // Pay with new card
        if (!stripe || !elements || !clientSecret) {
          setError('Payment system not ready. Please try again.');
          return;
        }

        // Confirm the setup
        const { error: setupError, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: window.location.href,
          },
          redirect: 'if_required',
        });

        if (setupError) {
          setError(setupError.message || 'Payment failed');
          return;
        }

        if (setupIntent?.payment_method) {
          // Attach payment method and make it default
          await apiClient.post('/api/v1/billing/payment-methods/attach', {
            patientId: invoice.patient_id,
            payment_method_id: setupIntent.payment_method,
            make_default: true
          });

          // Now pay the invoice
          const payResponse = await apiClient.post('/api/v1/billing/invoices/pay', {
            invoice_id: invoice.stripe_invoice_id || invoice.id,
            payment_method_id: setupIntent.payment_method
          });

          if (payResponse.data.paid) {
            showSuccessToast(`Invoice paid • $${invoice.total_amount}`);
            onSuccess();
          }
        }
      }
    } catch (err: any) {
      if (err.response?.status === 402 && err.response?.data?.need_payment_method) {
        // No default payment method, switch to new card
        setPaymentMethod('new');
        setError('Please add a payment method to continue');
      } else {
        setError(err.response?.data?.error || 'Payment failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const getSavedCardDisplay = () => {
    const card = savedCards.find(c => c.id === selectedCard);
    return card ? `****${card.last4}` : '';
  };

  const showSuccessToast = (message: string) => {
    // Use a toast library if available, otherwise alert
    if (window.showToast) {
      window.showToast(message, 'success');
    } else {
      alert(message);
    }
  };

  if (loadingCards) {
    return (
      <div className="payment-loading">
        <div className="spinner"></div>
        <p>Loading payment methods...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="invoice-summary">
        <h3>Invoice Summary</h3>
        <div className="summary-item">
          <span>Invoice Number:</span>
          <span>{invoice.invoice_number}</span>
        </div>
        <div className="summary-item">
          <span>Patient:</span>
          <span>{invoice.patient_name}</span>
        </div>
        <div className="summary-item total">
          <span>Total Amount:</span>
          <span>${invoice.total_amount}</span>
        </div>
      </div>

      <div className="payment-method-selector">
        {savedCards.length > 0 && (
          <label className="payment-option">
            <input
              type="radio"
              value="saved"
              checked={paymentMethod === 'saved'}
              onChange={(e) => setPaymentMethod(e.target.value as 'saved' | 'new')}
            />
            <span>Use saved card</span>
          </label>
        )}
        <label className="payment-option">
          <input
            type="radio"
            value="new"
            checked={paymentMethod === 'new'}
            onChange={(e) => setPaymentMethod(e.target.value as 'saved' | 'new')}
          />
          <span>Use new card</span>
        </label>
      </div>

      {paymentMethod === 'saved' && savedCards.length > 0 && (
        <div className="saved-cards-list">
          {savedCards.map((card) => (
            <label key={card.id} className="saved-card-option">
              <input
                type="radio"
                name="savedCard"
                value={card.id}
                checked={selectedCard === card.id}
                onChange={(e) => setSelectedCard(e.target.value)}
              />
              <span className="card-details">
                <span className="card-brand">{card.brand}</span>
                <span className="card-last4">****{card.last4}</span>
                <span className="card-exp">{card.exp_month}/{card.exp_year}</span>
                {card.is_default && <span className="default-badge">Default</span>}
              </span>
            </label>
          ))}
        </div>
      )}

      {paymentMethod === 'new' && clientSecret && (
        <div className="new-card-section">
          <PaymentElement />
        </div>
      )}

      {error && (
        <div className="error-message">
          <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="cancel-btn"
          disabled={processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="pay-btn"
          disabled={!stripe || processing || (paymentMethod === 'saved' && !selectedCard)}
        >
          {processing ? (
            <>
              <span className="spinner-small"></span>
              Processing...
            </>
          ) : (
            `Pay $${invoice.total_amount}`
          )}
        </button>
      </div>
    </form>
  );
};

export const PayInvoiceDialog: React.FC<PayInvoiceDialogProps> = ({
  invoice,
  onClose,
  onSuccess,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pay-invoice-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Pay Invoice</h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret: '' }}>
          <PaymentForm 
            invoice={invoice}
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </Elements>
      </div>
    </div>
  );
};
