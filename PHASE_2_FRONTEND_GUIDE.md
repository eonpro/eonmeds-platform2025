# Phase 2: Payment Methods - Frontend Implementation Guide

## Overview
Phase 2 adds the ability to save credit cards and charge them later. Here's how to implement it in your React frontend.

## 1. Install Stripe React Components

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

## 2. Setup Stripe in Your App

```tsx
// App.tsx or index.tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Use your publishable key
const stripePromise = loadStripe('pk_test_51RPS5NGzKhM7cZeGhvbn5ouKAIk6yOmSSyOkh8L53Mw5KsGg49bVK9JDVaPP5DwGTmAp0KOACCu2qD9H2xfwBtx500cGaFWIzr');

function App() {
  return (
    <Elements stripe={stripePromise}>
      {/* Your app components */}
    </Elements>
  );
}
```

## 3. Add Payment Method Component

```tsx
// AddPaymentMethod.tsx
import { useState } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
} from '@stripe/react-stripe-js';
import { apiClient } from '../services/api';

export const AddPaymentMethod = ({ patientId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // 1. Create setup intent
      const { data } = await apiClient.post('/api/v1/payment-methods/setup-intent', {
        patient_id: patientId,
      });

      // 2. Confirm card setup
      const result = await stripe.confirmCardSetup(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        // 3. Attach payment method to patient
        await apiClient.post('/api/v1/payment-methods/attach', {
          payment_method_id: result.setupIntent.payment_method,
          patient_id: patientId,
          set_as_default: true,
        });

        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add Payment Method</h3>
      
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
          },
        }}
      />

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={!stripe || processing}>
        {processing ? 'Processing...' : 'Save Card'}
      </button>
    </form>
  );
};
```

## 4. List Payment Methods Component

```tsx
// PaymentMethodsList.tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

export const PaymentMethodsList = ({ patientId }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
  }, [patientId]);

  const fetchPaymentMethods = async () => {
    try {
      const { data } = await apiClient.get(`/api/v1/payment-methods/patient/${patientId}`);
      setPaymentMethods(data.payment_methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (paymentMethodId) => {
    if (!confirm('Remove this payment method?')) return;

    try {
      await apiClient.delete(`/api/v1/payment-methods/${paymentMethodId}`);
      fetchPaymentMethods();
    } catch (error) {
      alert('Failed to remove payment method');
    }
  };

  const handleSetDefault = async (paymentMethodId) => {
    try {
      await apiClient.put(`/api/v1/payment-methods/${paymentMethodId}/default`, {
        patient_id: patientId,
      });
      fetchPaymentMethods();
    } catch (error) {
      alert('Failed to set default payment method');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Saved Payment Methods</h3>
      
      {paymentMethods.length === 0 ? (
        <p>No payment methods on file</p>
      ) : (
        <ul>
          {paymentMethods.map((pm) => (
            <li key={pm.id}>
              <span>
                {pm.brand} •••• {pm.last4} - Exp: {pm.exp_month}/{pm.exp_year}
              </span>
              
              {pm.is_default && <span className="badge">Default</span>}
              
              {!pm.is_default && (
                <button onClick={() => handleSetDefault(pm.id)}>
                  Set as Default
                </button>
              )}
              
              <button onClick={() => handleRemove(pm.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

## 5. Charge an Invoice

```tsx
// ChargeInvoice.tsx
const chargeInvoice = async (invoiceId, paymentMethodId = null) => {
  try {
    const response = await apiClient.post('/api/v1/payments/charge-invoice', {
      invoiceId,
      paymentMethodId, // Optional - will use default if not provided
    });

    if (response.data.success) {
      alert('Invoice paid successfully!');
      // Refresh invoice list or redirect
    }
  } catch (error) {
    if (error.response?.data?.needs_payment_method) {
      // Prompt user to add a payment method
      alert('Please add a payment method first');
    } else if (error.response?.data?.error === 'Card was declined') {
      alert('Card declined. Please try a different payment method.');
    } else {
      alert('Payment failed: ' + error.response?.data?.message);
    }
  }
};
```

## API Endpoints Summary

### Payment Methods
- `POST /api/v1/payment-methods/setup-intent` - Create setup intent
- `POST /api/v1/payment-methods/attach` - Attach payment method after setup
- `GET /api/v1/payment-methods/patient/:patientId` - List all payment methods
- `DELETE /api/v1/payment-methods/:paymentMethodId` - Remove payment method
- `PUT /api/v1/payment-methods/:paymentMethodId/default` - Set as default

### Payments
- `POST /api/v1/payments/charge-invoice` - Charge an invoice with saved card

## Testing

Use these test cards in test mode:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

## Security Notes

1. Never store card details in your database
2. Always use Stripe Elements for card input
3. Use setup intents for saving cards without charging
4. Handle authentication required errors gracefully
