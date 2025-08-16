import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useApi } from '../../hooks/useApi';
import config from '../../config';
import './InvoicePaymentModal.css';

// Initialize Stripe
const stripePromise = loadStripe(config.STRIPE_PUBLISHABLE_KEY);

interface InvoicePaymentModalProps {
  invoice: any;
  onClose: () => void;
  onPaymentSuccess: () => void;
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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  useEffect(() => {
    // Create payment intent when component mounts
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      setError(null);
      const response = await apiClient.post(`/api/v1/payments/invoice/${invoice.id}/payment-intent`, {
        save_payment_method: saveCard
      });

      if (response.data.success && response.data.client_secret) {
        setClientSecret(response.data.client_secret);
      } else {
        throw new Error('Failed to create payment intent');
      }
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setError(err.response?.data?.message || 'Failed to initialize payment');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Record the payment in the backend
        await apiClient.post(`/api/v1/payments/invoice/${invoice.id}/payment`, {
          payment_intent_id: paymentIntent.id,
          payment_method_id: paymentIntent.payment_method
        });

        onSuccess();
      } else {
        setError('Payment was not successful');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const CARD_ELEMENT_OPTIONS = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  if (!clientSecret && !error) {
    return (
      <div className="payment-loading">
        <div className="spinner"></div>
        <p>Preparing payment...</p>
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

      <div className="card-input-section">
        <label>Card Information</label>
        <div className="card-element-wrapper">
          <CardElement 
            options={CARD_ELEMENT_OPTIONS} 
            onChange={(e) => setCardComplete(e.complete)}
          />
        </div>
      </div>

      <div className="save-card-option">
        <label>
          <input
            type="checkbox"
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
          />
          Save this card for future payments
        </label>
      </div>

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
          disabled={!stripe || processing || !cardComplete}
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

export const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  invoice,
  onClose,
  onPaymentSuccess,
}) => {
  const [showManualPayment, setShowManualPayment] = useState(false);
  const apiClient = useApi();
  const [manualPayment, setManualPayment] = useState({
    amount: invoice.total_amount,
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });

  const handleManualPayment = async () => {
    try {
      await apiClient.post(`/api/v1/payments/invoice/${invoice.id}/manual-payment`, manualPayment);
      onPaymentSuccess();
    } catch (error) {
      console.error('Error processing manual payment:', error);
      alert('Failed to process manual payment');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content invoice-payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Process Payment</h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="payment-options">
          <div className="payment-tabs">
            <button 
              className={!showManualPayment ? 'active' : ''}
              onClick={() => setShowManualPayment(false)}
            >
              Card Payment
            </button>
            <button 
              className={showManualPayment ? 'active' : ''}
              onClick={() => setShowManualPayment(true)}
            >
              Manual Payment
            </button>
          </div>

          {!showManualPayment ? (
            <Elements stripe={stripePromise}>
              <PaymentForm 
                invoice={invoice}
                onSuccess={onPaymentSuccess}
                onCancel={onClose}
              />
            </Elements>
          ) : (
            <div className="manual-payment-form">
              <div className="form-group">
                <label>Payment Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={manualPayment.amount}
                  onChange={(e) => setManualPayment({...manualPayment, amount: parseFloat(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={manualPayment.payment_method}
                  onChange={(e) => setManualPayment({...manualPayment, payment_method: e.target.value})}
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reference Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Check number, transaction ID, etc."
                  value={manualPayment.reference_number}
                  onChange={(e) => setManualPayment({...manualPayment, reference_number: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={manualPayment.notes}
                  onChange={(e) => setManualPayment({...manualPayment, notes: e.target.value})}
                />
              </div>

              <div className="form-actions">
                <button onClick={onClose} className="cancel-btn">Cancel</button>
                <button onClick={handleManualPayment} className="pay-btn">
                  Record Payment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
