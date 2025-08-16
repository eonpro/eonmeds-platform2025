import React, { useState, useEffect, useRef } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe, StripeCardElementChangeEvent, SetupIntent } from '@stripe/stripe-js';
import { useApi } from '../../hooks/useApi';
import './StripePaymentForm.css';

// Fix 1: Lazy load Stripe after confirming key exists
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  const key = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  if (!stripePromise && key) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

interface StripePaymentFormProps {
  patientId?: string;
  patientEmail?: string;
  patientName?: string;
  onPaymentMethodCreated: (paymentMethodId: string) => void;
  onCancel: () => void;
  saveCard?: boolean;
  processing?: boolean;
}

interface SetupIntentData {
  clientSecret: string;
  id: string;
}

const PaymentForm: React.FC<StripePaymentFormProps> = ({
  patientId,
  patientEmail,
  patientName,
  onPaymentMethodCreated,
  onCancel,
  saveCard = false,
  processing = false,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const apiClient = useApi();
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [setupIntent, setSetupIntent] = useState<SetupIntentData | null>(null);
  const [cardFocused, setCardFocused] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Create setup intent when component mounts and we're saving a card
  useEffect(() => {
    if (saveCard && patientId && !setupIntent) {
      createSetupIntent();
    }
  }, [saveCard, patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const createSetupIntent = async () => {
    try {
      setError(null);
      const response = await apiClient.post('/api/v1/payment-methods/setup-intent', {
        patient_id: patientId,
        email: patientEmail,
        name: patientName,
      });

      if (response.data.success && response.data.client_secret) {
        setSetupIntent({
          clientSecret: response.data.client_secret,
          id: response.data.setup_intent_id,
        });
      } else {
        throw new Error('Failed to create setup intent');
      }
    } catch (err: any) {
      console.error('Error creating setup intent:', err);
      setError(err.response?.data?.message || 'Failed to prepare card setup');
    }
  };

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
      if (saveCard && setupIntent?.clientSecret) {
        // Fix 3: Pass billing details for better fraud signals
        const billingDetails = {
          name: patientName,
          email: patientEmail,
        };

        // Confirm the setup intent with the card element
        const { error: confirmError, setupIntent: confirmedSetupIntent } = await stripe.confirmCardSetup(
          setupIntent.clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: billingDetails,
            },
          }
        );

        if (confirmError) {
          setError(confirmError.message || 'Failed to save card');
          setProcessingPayment(false);
          return;
        }

        // Fix 2: Handle SCA/3DS status
        // Stripe's SetupIntent status can be: 'requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'canceled', 'succeeded'
        if (confirmedSetupIntent?.status === 'requires_action') {
          setError('Additional authentication required. Please complete the verification.');
          setProcessingPayment(false);
          return;
        }

        if (confirmedSetupIntent?.status !== 'succeeded') {
          setError(`Card setup failed with status: ${confirmedSetupIntent?.status}`);
          setProcessingPayment(false);
          return;
        }

        if (confirmedSetupIntent?.payment_method) {
          onPaymentMethodCreated(confirmedSetupIntent.payment_method as string);
        }
      } else {
        // Just create payment method without setup intent (for immediate payment)
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: patientName,
            email: patientEmail,
          },
        });

        if (pmError) {
          setError(pmError.message || 'An error occurred');
          setProcessingPayment(false);
          return;
        }

        if (paymentMethod) {
          onPaymentMethodCreated(paymentMethod.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setProcessingPayment(false);
    }
  };

  const handleCardChange = (event: StripeCardElementChangeEvent) => {
    setError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
    
    // Fix 4: Wire focus/error styles
    if (cardRef.current) {
      if (event.error) {
        cardRef.current.classList.add('error');
      } else {
        cardRef.current.classList.remove('error');
      }
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

  // Show loading state while creating setup intent
  if (saveCard && patientId && !setupIntent && !error) {
    return (
      <div className="stripe-payment-form">
        <div className="loading-message">
          Preparing secure card setup...
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <div className="form-group">
        <label className="form-label">Card Details</label>
        <div 
          ref={cardRef}
          className={`card-element-container ${cardFocused ? 'focused' : ''}`}
          onFocus={() => setCardFocused(true)}
          onBlur={() => setCardFocused(false)}
        >
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={handleCardChange}
            onFocus={() => setCardFocused(true)}
            onBlur={() => setCardFocused(false)}
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
          {/* Fix 6: Better button copy */}
          {processingPayment || processing ? 'Processing...' : saveCard ? 'Add Card' : 'Use Card'}
        </button>
      </div>
    </form>
  );
};

export const StripePaymentForm: React.FC<StripePaymentFormProps> = (props) => {
  const [stripeLoaded, setStripeLoaded] = useState(false);

  useEffect(() => {
    // Fix 1: Check for key before loading Stripe
    const key = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
    if (key) {
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
    <Elements stripe={getStripe()}>
      <PaymentForm {...props} />
    </Elements>
  );
};