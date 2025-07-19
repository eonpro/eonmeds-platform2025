import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { StripePaymentForm } from './StripePaymentForm';
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
  const [paymentMethod, setPaymentMethod] = useState<'saved' | 'new'>('saved');
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stripeCustomerId) {
      loadSavedCards();
    } else {
      setPaymentMethod('new');
    }
  }, [stripeCustomerId]);

  const loadSavedCards = async () => {
    try {
      setLoadingCards(true);
      const response = await apiClient.get(`/api/v1/payments/patients/${invoice.patient_id}/cards`);
      setSavedCards(response.data.cards || []);
      if (response.data.cards.length > 0) {
        setSelectedCardId(response.data.cards[0].id);
      } else {
        setPaymentMethod('new');
      }
    } catch (err) {
      console.error('Error loading saved cards:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleChargeWithNewCard = async (paymentMethodId: string) => {
    setError(null);
    
    try {
      setProcessing(true);
      
      const response = await apiClient.post(`/api/v1/payments/invoices/${invoice.id}/charge-manual`, {
        payment_method_id: paymentMethodId
      });

      if (response.data.success) {
        alert('Invoice charged successfully!');
        onSuccess();
      } else {
        setError(response.data.error || 'Failed to charge invoice');
      }
    } catch (error: any) {
      console.error('Error charging invoice:', error);
      setError(error.response?.data?.error || 'Failed to charge invoice. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleChargeInvoice = async () => {
    if (paymentMethod === 'saved' && selectedCardId) {
      setError(null);
      
      try {
        setProcessing(true);
        
        // Charge with saved card
        const response = await apiClient.post(`/api/v1/payments/invoices/${invoice.id}/charge`, {
          payment_method_id: selectedCardId
        });

        if (response.data.success) {
          alert('Invoice charged successfully!');
          onSuccess();
        } else {
          setError(response.data.error || 'Failed to charge invoice');
        }
      } catch (error: any) {
        console.error('Error charging invoice:', error);
        
        // Check if this is a 500 error that might indicate the payment succeeded on Stripe
        // but failed to update the database
        if (error.response?.status === 500 && error.response?.data?.error === 'Failed to process payment') {
          setError('Payment may have been processed. Please refresh the page to check the invoice status. If the invoice is still unpaid, please contact support.');
          
          // Wait a moment then refresh the invoice data
          setTimeout(() => {
            onClose();
            window.location.reload(); // Force refresh to get updated data
          }, 3000);
        } else {
          setError(error.response?.data?.error || 'Failed to process payment');
        }
      } finally {
        setProcessing(false);
      }
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
          
          {error && (
            <div className="error-message">
              {error.includes('pm_card_visa') || error.includes('testmode') ? (
                <>
                  <strong>Test Mode Active</strong>
                  <p>This is a test environment. No real payments will be processed.</p>
                  <p>If you need to process real payments, please configure Stripe API keys.</p>
                </>
              ) : (
                error
              )}
            </div>
          )}
          
          {loadingCards ? (
            <div className="loading-cards">Loading payment methods...</div>
          ) : (
            <>
              {savedCards.length > 0 && (
                <div className="payment-method-options">
                  <div className="method-option">
                    <input 
                      type="radio" 
                      id="saved-card" 
                      name="payment-method"
                      value="saved"
                      checked={paymentMethod === 'saved'}
                      onChange={() => setPaymentMethod('saved')}
                    />
                    <label htmlFor="saved-card">Use saved card</label>
                  </div>
                  
                  {paymentMethod === 'saved' && (
                    <div className="saved-cards-list">
                      {savedCards.map(card => (
                        <div key={card.id} className="saved-card-option">
                          <input
                            type="radio"
                            id={`card-${card.id}`}
                            name="selected-card"
                            value={card.id}
                            checked={selectedCardId === card.id}
                            onChange={() => setSelectedCardId(card.id)}
                          />
                          <label htmlFor={`card-${card.id}`}>
                            <span className="card-icon">💳</span>
                            {card.brand} •••• {card.last4} (Exp: {card.exp_month}/{card.exp_year})
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="method-option">
                    <input 
                      type="radio" 
                      id="new-card" 
                      name="payment-method"
                      value="new"
                      checked={paymentMethod === 'new'}
                      onChange={() => setPaymentMethod('new')}
                    />
                    <label htmlFor="new-card">Enter new card</label>
                  </div>
                </div>
              )}
              
              {(paymentMethod === 'new' || savedCards.length === 0) && (
                <StripePaymentForm
                  onPaymentMethodCreated={handleChargeWithNewCard}
                  onCancel={() => setPaymentMethod('saved')}
                  processing={processing}
                />
              )}
            </>
          )}
        </div>

        {paymentMethod === 'saved' && (
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
              disabled={processing || !selectedCardId}
            >
              {processing ? 'Processing...' : `Charge ${formatCurrency(invoice.amount_due)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 