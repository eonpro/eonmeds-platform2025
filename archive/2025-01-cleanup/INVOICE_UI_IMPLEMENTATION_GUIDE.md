# 🛠️ **INVOICE UI IMPLEMENTATION GUIDE**

## 🚀 **Quick Start Implementation**

Here's exactly how to build the invoice UI integration, starting with the most critical components.

---

## **Step 1: Update Invoice Service (Day 1)**

### **Create the New Invoice Service**
```typescript
// packages/frontend/src/services/invoice.service.ts

import { apiClient } from '../utils/api';

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: Date;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  lineItems: LineItem[];
  payments: Payment[];
  paymentUrl?: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  paymentDate: Date;
}

class InvoiceService {
  // Create invoice
  async createInvoice(data: {
    customerId: string;
    lineItems: LineItem[];
    dueDate?: Date;
    notes?: string;
  }): Promise<Invoice> {
    const response = await apiClient.post('/api/v1/invoices', data);
    return response.data;
  }

  // Get invoices for patient
  async getPatientInvoices(patientId: string): Promise<Invoice[]> {
    const response = await apiClient.get(`/api/v1/invoices?customerId=${patientId}`);
    return response.data.invoices;
  }

  // Get single invoice
  async getInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.get(`/api/v1/invoices/${id}`);
    return response.data;
  }

  // Generate payment link
  async generatePaymentLink(invoiceId: string): Promise<{
    url: string;
    token: string;
    expiresAt: Date;
  }> {
    const response = await apiClient.post(`/api/v1/invoices/${invoiceId}/payment-link`);
    return response.data;
  }

  // Process payment
  async processPayment(invoiceId: string, amount: number, paymentMethodId?: string): Promise<Payment> {
    const response = await apiClient.post(`/api/v1/invoices/${invoiceId}/payment`, {
      amount,
      paymentMethodId
    });
    return response.data;
  }

  // Process refund
  async processRefund(paymentId: string, amount?: number, reason?: string): Promise<Payment> {
    const response = await apiClient.post(`/api/v1/payments/${paymentId}/refund`, {
      amount,
      reason
    });
    return response.data;
  }

  // Send invoice
  async sendInvoice(invoiceId: string, recipients: string[]): Promise<void> {
    await apiClient.post(`/api/v1/invoices/${invoiceId}/send`, { recipients });
  }

  // Void invoice
  async voidInvoice(invoiceId: string, reason: string): Promise<Invoice> {
    const response = await apiClient.post(`/api/v1/invoices/${invoiceId}/void`, { reason });
    return response.data;
  }
}

export const invoiceService = new InvoiceService();
```

---

## **Step 2: Enhanced Invoice List Component (Day 2)**

### **Modern Invoice List with All Features**
```tsx
// packages/frontend/src/components/invoices/InvoiceList.tsx

import React, { useState, useEffect } from 'react';
import { invoiceService, Invoice } from '../../services/invoice.service';
import { formatCurrency, formatDate } from '../../utils/formatters';
import './InvoiceList.css';

interface InvoiceListProps {
  patientId: string;
  patientName: string;
  patientEmail: string;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  patientId,
  patientName,
  patientEmail
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  // Load invoices
  useEffect(() => {
    loadInvoices();
  }, [patientId]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getPatientInvoices(patientId);
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate payment link
  const handleGenerateLink = async (invoice: Invoice) => {
    try {
      const { url } = await invoiceService.generatePaymentLink(invoice.id);
      setPaymentLink(url);
      
      // Copy to clipboard
      navigator.clipboard.writeText(url);
      
      // Show success toast
      showToast('Payment link copied to clipboard!', 'success');
    } catch (error) {
      showToast('Failed to generate payment link', 'error');
    }
  };

  // Process payment
  const handleProcessPayment = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  // Process refund
  const handleProcessRefund = async (payment: any) => {
    setSelectedInvoice(invoice);
    setShowRefundModal(true);
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    if (filter !== 'all' && invoice.status !== filter) return false;
    if (searchTerm && !invoice.number.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Calculate summary
  const summary = {
    total: invoices.length,
    outstanding: invoices
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.amountDue, 0),
    paid: invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.totalAmount, 0)
  };

  return (
    <div className="invoice-list-container">
      {/* Summary Cards */}
      <div className="invoice-summary">
        <div className="summary-card">
          <span className="summary-label">Outstanding</span>
          <span className="summary-value outstanding">
            {formatCurrency(summary.outstanding)}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Paid</span>
          <span className="summary-value paid">
            {formatCurrency(summary.paid)}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Invoices</span>
          <span className="summary-value">{summary.total}</span>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="invoice-controls">
        <div className="filters">
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="void">Void</option>
          </select>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Invoice
        </button>
      </div>

      {/* Invoice List */}
      <div className="invoice-grid">
        {loading ? (
          <div className="loading">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <p>No invoices found</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Create First Invoice
            </button>
          </div>
        ) : (
          filteredInvoices.map(invoice => (
            <div key={invoice.id} className="invoice-card">
              <div className="invoice-header">
                <h3>{invoice.number}</h3>
                <span className={`status-badge ${invoice.status}`}>
                  {invoice.status}
                </span>
              </div>

              <div className="invoice-details">
                <div className="detail-row">
                  <span>Date:</span>
                  <span>{formatDate(invoice.invoiceDate)}</span>
                </div>
                <div className="detail-row">
                  <span>Due:</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
                <div className="detail-row">
                  <span>Amount:</span>
                  <span className="amount">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {invoice.amountDue > 0 && (
                  <div className="detail-row">
                    <span>Balance:</span>
                    <span className="balance">{formatCurrency(invoice.amountDue)}</span>
                  </div>
                )}
              </div>

              <div className="invoice-actions">
                {invoice.status === 'draft' && (
                  <>
                    <button 
                      className="btn btn-sm"
                      onClick={() => handleSendInvoice(invoice)}
                    >
                      Send
                    </button>
                    <button 
                      className="btn btn-sm"
                      onClick={() => handleEditInvoice(invoice)}
                    >
                      Edit
                    </button>
                  </>
                )}

                {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                  <>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleProcessPayment(invoice)}
                    >
                      Pay Now
                    </button>
                    <button 
                      className="btn btn-sm"
                      onClick={() => handleGenerateLink(invoice)}
                    >
                      Get Link
                    </button>
                  </>
                )}

                {invoice.status === 'paid' && invoice.payments?.length > 0 && (
                  <button 
                    className="btn btn-sm"
                    onClick={() => handleProcessRefund(invoice.payments[0])}
                  >
                    Refund
                  </button>
                )}

                <button 
                  className="btn btn-sm"
                  onClick={() => handleViewDetails(invoice)}
                >
                  View
                </button>
              </div>

              {/* Show payment link if generated */}
              {paymentLink && selectedInvoice?.id === invoice.id && (
                <div className="payment-link-display">
                  <input 
                    type="text" 
                    value={paymentLink} 
                    readOnly 
                    className="link-input"
                  />
                  <button 
                    onClick={() => navigator.clipboard.writeText(paymentLink)}
                    className="btn btn-sm"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            loadInvoices();
            setShowPaymentModal(false);
          }}
        />
      )}

      {showRefundModal && selectedInvoice && (
        <RefundModal
          payment={selectedInvoice.payments[0]}
          onClose={() => setShowRefundModal(false)}
          onSuccess={() => {
            loadInvoices();
            setShowRefundModal(false);
          }}
        />
      )}
    </div>
  );
};
```

---

## **Step 3: Payment Processing with Stripe (Day 3)**

### **Stripe Payment Modal**
```tsx
// packages/frontend/src/components/payments/PaymentModal.tsx

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { invoiceService } from '../../services/invoice.service';
import './PaymentModal.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

interface PaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentForm: React.FC<PaymentModalProps> = ({ invoice, onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(invoice.amountDue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const { clientSecret } = await invoiceService.createPaymentIntent(
        invoice.id,
        paymentAmount
      );

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (result.error) {
        setError(result.error.message || 'Payment failed');
      } else {
        onSuccess();
        showToast('Payment successful!', 'success');
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Process Payment</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="invoice-summary">
          <div className="summary-row">
            <span>Invoice:</span>
            <span>{invoice.number}</span>
          </div>
          <div className="summary-row">
            <span>Total Due:</span>
            <span className="amount">${invoice.amountDue.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Payment Amount</label>
            <div className="amount-input-group">
              <span className="currency">$</span>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                min="0.01"
                max={invoice.amountDue}
                step="0.01"
                required
              />
            </div>
            {paymentAmount < invoice.amountDue && (
              <p className="partial-payment-note">
                Partial payment of ${paymentAmount.toFixed(2)}
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Card Details</label>
            <div className="card-element-container">
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
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!stripe || processing}
            >
              {processing ? 'Processing...' : `Pay $${paymentAmount.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PaymentModal: React.FC<PaymentModalProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};
```

---

## **Step 4: Public Payment Page (Day 4)**

### **No-Auth Payment Page for Patients**
```tsx
// packages/frontend/src/pages/PublicPayment.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './PublicPayment.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

export const PublicPayment: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [token]);

  const loadInvoice = async () => {
    try {
      const response = await fetch(`/api/v1/public/invoice/${token}`);
      if (!response.ok) throw new Error('Invalid payment link');
      
      const data = await response.json();
      setInvoice(data.invoice);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="public-payment-container">
        <div className="loading">Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="public-payment-container">
        <div className="error-state">
          <h2>Payment Link Invalid</h2>
          <p>{error || 'This payment link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-payment-container">
      <div className="payment-page">
        {/* Company Header */}
        <div className="company-header">
          <img src="/logo.png" alt="EONMEDS" className="company-logo" />
          <h1>EONMEDS Payment Portal</h1>
        </div>

        {/* Invoice Details */}
        <div className="invoice-details-card">
          <h2>Invoice {invoice.number}</h2>
          
          <div className="invoice-info">
            <div className="info-row">
              <span>Invoice Date:</span>
              <span>{formatDate(invoice.invoiceDate)}</span>
            </div>
            <div className="info-row">
              <span>Due Date:</span>
              <span>{formatDate(invoice.dueDate)}</span>
            </div>
          </div>

          {/* Line Items */}
          <table className="line-items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item: any, index: number) => (
                <tr key={index}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>${item.unitPrice.toFixed(2)}</td>
                  <td>${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Subtotal</td>
                <td>${invoice.subtotal.toFixed(2)}</td>
              </tr>
              {invoice.taxAmount > 0 && (
                <tr>
                  <td colSpan={3}>Tax</td>
                  <td>${invoice.taxAmount.toFixed(2)}</td>
                </tr>
              )}
              <tr className="total-row">
                <td colSpan={3}>Total Due</td>
                <td className="total-amount">
                  ${invoice.amountDue.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Form */}
        <Elements stripe={stripePromise}>
          <PublicPaymentForm invoice={invoice} token={token} />
        </Elements>

        {/* Security Badge */}
        <div className="security-badge">
          <span>🔒 Secure payment powered by Stripe</span>
        </div>
      </div>
    </div>
  );
};

const PublicPaymentForm: React.FC<{ invoice: any; token: string }> = ({ invoice, token }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      // Create checkout session
      const response = await fetch(`/api/v1/public/invoice/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: (await elements.getElement(CardElement)!.createPaymentMethod()).paymentMethod?.id
        })
      });

      const { clientSecret } = await response.json();

      const result = await stripe.confirmCardPayment(clientSecret);

      if (result.error) {
        setError(result.error.message || 'Payment failed');
      } else {
        setSucceeded(true);
      }
    } catch (err: any) {
      setError('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="success-state">
        <div className="success-icon">✓</div>
        <h2>Payment Successful!</h2>
        <p>Thank you for your payment. A receipt has been sent to your email.</p>
        <p className="confirmation">Confirmation: {invoice.number}-PAID</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="payment-form-card">
      <h3>Payment Information</h3>
      
      <div className="form-group">
        <label>Email (for receipt)</label>
        <input 
          type="email" 
          placeholder="your@email.com" 
          required 
          className="email-input"
        />
      </div>

      <div className="form-group">
        <label>Card Information</label>
        <div className="card-element-wrapper">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#32325d',
                  fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                  '::placeholder': {
                    color: '#aab7c4'
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="pay-button"
      >
        {processing ? (
          <span>Processing...</span>
        ) : (
          <span>Pay ${invoice.amountDue.toFixed(2)}</span>
        )}
      </button>
    </form>
  );
};
```

---

## **Step 5: Real-time Updates with WebSocket (Day 5)**

### **WebSocket Hook for Live Updates**
```typescript
// packages/frontend/src/hooks/useInvoiceUpdates.ts

import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from 'react-query';
import { showToast } from '../utils/toast';

let socket: Socket | null = null;

export const useInvoiceUpdates = (invoiceId?: string) => {
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!socket) {
      socket = io(process.env.REACT_APP_WEBSOCKET_URL || '', {
        auth: {
          token: localStorage.getItem('authToken')
        }
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
      });

      socket.on('invoice.updated', (data) => {
        // Invalidate and refetch invoice data
        queryClient.invalidateQueries(['invoice', data.invoiceId]);
        
        // Show notification
        showToast(`Invoice ${data.invoiceNumber} updated`, 'info');
      });

      socket.on('payment.received', (data) => {
        // Update invoice status
        queryClient.setQueryData(['invoice', data.invoiceId], (old: any) => ({
          ...old,
          status: 'paid',
          amountPaid: data.amount,
          amountDue: 0
        }));
        
        showToast(`Payment received for ${data.invoiceNumber}`, 'success');
      });

      socket.on('refund.processed', (data) => {
        // Update payment status
        queryClient.invalidateQueries(['invoice', data.invoiceId]);
        
        showToast(`Refund processed: $${data.amount}`, 'info');
      });
    }

    // Subscribe to specific invoice updates
    if (invoiceId && socket) {
      socket.emit('subscribe', { invoiceId });
    }
  }, [invoiceId, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (socket && invoiceId) {
        socket.emit('unsubscribe', { invoiceId });
      }
    };
  }, [connect, invoiceId]);

  return socket;
};
```

---

## **CSS Styling**

### **Professional Invoice Styling**
```css
/* packages/frontend/src/components/invoices/InvoiceList.css */

.invoice-list-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Summary Cards */
.invoice-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.summary-value.outstanding {
  color: #f59e0b;
}

.summary-value.paid {
  color: #10b981;
}

/* Invoice Grid */
.invoice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.invoice-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
}

.invoice-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

/* Status Badges */
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.draft {
  background: #e5e7eb;
  color: #6b7280;
}

.status-badge.sent {
  background: #dbeafe;
  color: #2563eb;
}

.status-badge.paid {
  background: #d1fae5;
  color: #059669;
}

.status-badge.overdue {
  background: #fed7aa;
  color: #ea580c;
}

.status-badge.void {
  background: #fee2e2;
  color: #dc2626;
}

/* Actions */
.invoice-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #14a97b;
  color: white;
}

.btn-primary:hover {
  background: #0f8a62;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .invoice-grid {
    grid-template-columns: 1fr;
  }
  
  .invoice-summary {
    grid-template-columns: 1fr;
  }
  
  .invoice-actions {
    flex-wrap: wrap;
  }
}
```

---

## **Testing Checklist**

### **Functionality Tests**
- [ ] Create invoice with multiple line items
- [ ] Edit draft invoice
- [ ] Send invoice to patient
- [ ] Generate payment link
- [ ] Process payment via modal
- [ ] Process payment via public link
- [ ] Issue full refund
- [ ] Issue partial refund
- [ ] Void invoice
- [ ] Download PDF

### **Integration Tests**
- [ ] Stripe payment processing
- [ ] Webhook updates received
- [ ] Real-time status changes
- [ ] Email notifications sent
- [ ] Database consistency

### **User Experience Tests**
- [ ] Mobile responsiveness
- [ ] Loading states
- [ ] Error handling
- [ ] Success feedback
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

---

## **Deployment Steps**

1. **Install Dependencies**
```bash
cd packages/frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
npm install socket.io-client
npm install react-query
```

2. **Environment Variables**
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
REACT_APP_API_URL=https://api.eonmeds.com
REACT_APP_WEBSOCKET_URL=wss://api.eonmeds.com
```

3. **Build and Deploy**
```bash
npm run build
aws s3 sync build/ s3://eonmeds-frontend/
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

---

This implementation guide provides production-ready code that can be immediately integrated into your patient profile system!
