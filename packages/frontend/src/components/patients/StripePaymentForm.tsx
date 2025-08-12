import React, { useState, useEffect } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import './StripePaymentForm.css';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

interface StripePaymentFormProps {
  onPaymentMethodCreated: (paymentMethodId: string) => void;
  onCancel: () => void;
  saveCard?: boolean;
  processing?: boolean;
}

const PaymentForm: React.FC<StripePaymentFormProps> = ({
  onPaymentMethodCreated,
  onCancel,
  saveCard = false,
  processing = false,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        setError(pmError.message || 'An error occurred');
        setProcessingPayment(false);
        return;
      }

      if (paymentMethod) {
        onPaymentMethodCreated(paymentMethod.id);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setProcessingPayment(false);
    }
  };

  const CARD_ELEMENT_OPTIONS = {
    style: {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <div className="form-group">
        <label className="form-label">Card Details</label>
        <div className="card-element-container">
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={(e) => {
              setError(e.error ? e.error.message : null);
              setCardComplete(e.complete);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={onCancel}
          disabled={processingPayment || processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="submit-btn"
          disabled={!stripe || !cardComplete || processingPayment || processing}
        >
          {processingPayment || processing ? 'Processing...' : 'Add Card'}
        </button>
      </div>
    </form>
  );
};

export const StripePaymentForm: React.FC<StripePaymentFormProps> = (props) => {
  const [stripeLoaded, setStripeLoaded] = useState(false);

  useEffect(() => {
    if (process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
      setStripeLoaded(true);
    }
  }, []);

  if (!stripeLoaded) {
    return (
      <div className="stripe-payment-form">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          Stripe is not configured. Please check your environment settings.
        </div>
        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={props.onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};
