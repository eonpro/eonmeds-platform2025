/**
 * Public Invoice Payment Page
 * No authentication required - for patients to pay invoices online
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import axios from 'axios';
import './InvoicePayment.css';

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 
  'pk_test_51RPS5NGzKhM7cZeG...' // Replace with your key
);

interface Invoice {
  number: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountDue: number;
  currency: string;
  notes?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
  }>;
}

/**
 * Payment form component
 */
function PaymentForm({ invoice, clientSecret }: {
  invoice: Invoice;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/invoice/payment-success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded
      setMessage('Payment successful! Thank you.');
      // Redirect to success page
      setTimeout(() => {
        window.location.href = `/invoice/payment-success?invoice=${invoice.number}`;
      }, 2000);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <PaymentElement className="payment-element" />
      
      <button 
        type="submit" 
        disabled={isProcessing || !stripe || !elements}
        className="pay-button"
      >
        {isProcessing ? 'Processing...' : `Pay $${invoice.amountDue.toFixed(2)}`}
      </button>
      
      {message && (
        <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </form>
  );
}

/**
 * Main invoice payment page
 */
export default function InvoicePayment() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [useCheckout, setUseCheckout] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceNumber]);

  const fetchInvoice = async () => {
    try {
      // Get public invoice data
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/v1/public/invoice/${invoiceNumber}`
      );

      if (response.data.paid) {
        setError('This invoice has already been paid.');
        setLoading(false);
        return;
      }

      setInvoice(response.data.invoice);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching invoice:', err);
      setError('Invoice not found or invalid payment link.');
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!invoice) return;

    try {
      if (useCheckout) {
        // Use Stripe Checkout
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/v1/public/invoice/${invoiceNumber}/checkout`,
          { token }
        );

        if (response.data.checkoutUrl) {
          // Redirect to Stripe Checkout
          window.location.href = response.data.checkoutUrl;
        }
      } else {
        // Use Payment Element
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/v1/public/invoice/${invoiceNumber}/payment-intent`,
          { token }
        );

        setClientSecret(response.data.clientSecret);
      }
    } catch (err: any) {
      console.error('Error creating payment session:', err);
      setError('Failed to initialize payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="invoice-payment-page">
        <div className="loading">Loading invoice...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invoice-payment-page">
        <div className="error-container">
          <h2>Payment Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="invoice-payment-page">
        <div className="error-container">
          <h2>Invoice Not Found</h2>
          <p>The invoice you're looking for could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-payment-page">
      <div className="payment-container">
        <div className="header">
          <h1>Invoice Payment</h1>
          <div className="company-info">
            <h2>EonMeds</h2>
            <p>Healthcare Solutions</p>
          </div>
        </div>

        <div className="invoice-details">
          <div className="invoice-header">
            <div>
              <h3>Invoice #{invoice.number}</h3>
              <p className={`status ${invoice.status}`}>{invoice.status.toUpperCase()}</p>
            </div>
            <div className="dates">
              <p>Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</p>
              <p>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          {invoice.lineItems && invoice.lineItems.length > 0 && (
            <div className="line-items">
              <h4>Items</h4>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>${item.unitPrice.toFixed(2)}</td>
                      <td>${(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="totals">
            <div className="total-line">
              <span>Subtotal:</span>
              <span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.taxAmount > 0 && (
              <div className="total-line">
                <span>Tax:</span>
                <span>${invoice.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="total-line total">
              <span>Total:</span>
              <span>${invoice.totalAmount.toFixed(2)}</span>
            </div>
            <div className="total-line amount-due">
              <span>Amount Due:</span>
              <span className="amount">${invoice.amountDue.toFixed(2)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="notes">
              <h4>Notes</h4>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>

        {!clientSecret ? (
          <div className="payment-actions">
            <button 
              className="pay-now-button"
              onClick={handlePayNow}
            >
              Pay Now - ${invoice.amountDue.toFixed(2)}
            </button>
            
            <div className="payment-options">
              <label>
                <input
                  type="checkbox"
                  checked={useCheckout}
                  onChange={(e) => setUseCheckout(e.target.checked)}
                />
                Use Stripe Checkout (redirects to Stripe)
              </label>
            </div>
            
            <div className="security-info">
              <p>🔒 Secure payment powered by Stripe</p>
              <p>Your payment information is encrypted and secure</p>
            </div>
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm invoice={invoice} clientSecret={clientSecret} />
          </Elements>
        )}
      </div>
    </div>
  );
}
