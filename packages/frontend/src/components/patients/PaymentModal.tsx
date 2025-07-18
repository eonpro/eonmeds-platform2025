import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import './PaymentModal.css';

interface PaymentModalProps {
  invoice: any;
  stripeCustomerId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  stripeCustomerId,
  onClose,
  onSuccess
}) => {
  const apiClient = useApi();
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardLast4, setCardLast4] = useState('');

  const handleChargeInvoice = async () => {
    if (!stripeCustomerId) {
      alert('Customer does not have a payment method on file. Please add a payment method first.');
      return;
    }

    try {
      setProcessing(true);
      
      // For now, we'll use a test payment method ID
      // In production, you'd collect this via Stripe Elements
      const testPaymentMethodId = 'pm_card_visa'; // Stripe test card
      
      const response = await apiClient.post(`/api/v1/payments/invoices/${invoice.id}/charge`, {
        payment_method_id: testPaymentMethodId
      });

      if (response.data.success) {
        alert('Invoice charged successfully!');
        onSuccess();
      } else {
        alert(response.data.error || 'Failed to charge invoice');
      }
    } catch (error: any) {
      console.error('Error charging invoice:', error);
      alert(error.response?.data?.error || 'Failed to charge invoice. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payment-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Charge Invoice</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="invoice-summary">
          <div className="summary-header">
            <h3>Invoice #{invoice.invoice_number}</h3>
            <span className="amount-due">{formatCurrency(invoice.amount_due)}</span>
          </div>
          
          <div className="invoice-items">
            <h4>Items</h4>
            {invoice.items?.map((item: any, index: number) => (
              <div key={index} className="invoice-item">
                <span>{item.description}</span>
                <span>{item.quantity} × {formatCurrency(item.unit_price)}</span>
                <span className="item-total">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>

          <div className="invoice-totals">
            <div className="total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <div className="total-row">
                <span>Amount Paid</span>
                <span>-{formatCurrency(invoice.amount_paid)}</span>
              </div>
            )}
            <div className="total-row final">
              <span>Amount Due</span>
              <span>{formatCurrency(invoice.amount_due)}</span>
            </div>
          </div>
        </div>

        <div className="payment-section">
          <h4>Payment Method</h4>
          
          {stripeCustomerId ? (
            <div className="payment-method-info">
              <div className="method-option selected">
                <input 
                  type="radio" 
                  id="saved-card" 
                  checked 
                  readOnly
                />
                <label htmlFor="saved-card">
                  <span className="card-icon">💳</span>
                  Card on file {cardLast4 && `ending in ${cardLast4}`}
                </label>
              </div>
              <p className="payment-note">
                The customer's default payment method will be charged.
              </p>
            </div>
          ) : (
            <div className="no-payment-method">
              <p>No payment method on file for this customer.</p>
              <p>Please add a payment method before charging invoices.</p>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="charge-btn" 
            onClick={handleChargeInvoice}
            disabled={processing || !stripeCustomerId}
          >
            {processing ? 'Processing...' : `Charge ${formatCurrency(invoice.amount_due)}`}
          </button>
        </div>
      </div>
    </div>
  );
}; 