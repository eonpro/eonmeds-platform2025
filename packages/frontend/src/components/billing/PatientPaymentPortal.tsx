import React, { useState, useEffect } from 'react';
import './PatientPaymentPortal.css';
import { useApi } from '../../hooks/useApi';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  description: string;
  insuranceCovered: number;
  patientResponsibility: number;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  isDefault: boolean;
}

export const PatientPaymentPortal: React.FC = () => {
  const api = useApi();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // In production, these would be real API calls
      // For demo, using sample data
      setInvoices([
        {
          id: '1',
          invoiceNumber: 'INV-2025-01824',
          date: '2025-08-01',
          dueDate: '2025-08-31',
          amount: 2500.00,
          status: 'pending',
          description: 'Annual Physical Exam & Lab Work',
          insuranceCovered: 2000.00,
          patientResponsibility: 500.00
        },
        {
          id: '2',
          invoiceNumber: 'INV-2025-01792',
          date: '2025-07-15',
          dueDate: '2025-08-15',
          amount: 350.00,
          status: 'overdue',
          description: 'Specialist Consultation',
          insuranceCovered: 250.00,
          patientResponsibility: 100.00
        },
        {
          id: '3',
          invoiceNumber: 'INV-2025-01756',
          date: '2025-07-01',
          dueDate: '2025-07-31',
          amount: 1200.00,
          status: 'paid',
          description: 'MRI Scan',
          insuranceCovered: 960.00,
          patientResponsibility: 240.00
        }
      ]);

      setPaymentMethods([
        { id: '1', type: 'card', last4: '4242', brand: 'Visa', isDefault: true },
        { id: '2', type: 'card', last4: '5555', brand: 'Mastercard', isDefault: false }
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      default: return '';
    }
  };

  const handlePayInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async () => {
    // In production, this would process the payment
    alert(`Payment of ${formatCurrency(selectedInvoice!.patientResponsibility)} processed successfully!`);
    setShowPaymentForm(false);
    setSelectedInvoice(null);
    // Reload data to show updated status
    loadData();
  };

  if (loading) {
    return (
      <div className="patient-payment-portal loading">
        <div className="loading-spinner"></div>
        <p>Loading your billing information...</p>
      </div>
    );
  }

  const totalDue = invoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.patientResponsibility, 0);

  return (
    <div className="patient-payment-portal">
      <div className="portal-header">
        <div className="header-content">
          <h1>💳 Patient Payment Portal</h1>
          <p className="subtitle">Manage your medical bills and payments</p>
        </div>
        <div className="header-summary">
          <div className="summary-item">
            <span className="label">Total Due</span>
            <span className="value">{formatCurrency(totalDue)}</span>
          </div>
          <button className="btn-pay-all" disabled={totalDue === 0}>
            Pay All Outstanding ({formatCurrency(totalDue)})
          </button>
        </div>
      </div>

      <div className="portal-content">
        <div className="invoices-section">
          <h2>Your Invoices</h2>
          <div className="invoices-list">
            {invoices.map(invoice => (
              <div key={invoice.id} className={`invoice-card ${getStatusClass(invoice.status)}`}>
                <div className="invoice-header">
                  <div className="invoice-info">
                    <h3>{invoice.invoiceNumber}</h3>
                    <p className="invoice-description">{invoice.description}</p>
                    <p className="invoice-date">Date: {formatDate(invoice.date)}</p>
                  </div>
                  <div className="invoice-status">
                    <span className={`status-badge ${getStatusClass(invoice.status)}`}>
                      {invoice.status === 'paid' && '✓ '}
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                    {invoice.status === 'overdue' && (
                      <span className="due-date overdue">Due: {formatDate(invoice.dueDate)}</span>
                    )}
                  </div>
                </div>

                <div className="invoice-breakdown">
                  <div className="breakdown-row">
                    <span>Total Charges</span>
                    <span>{formatCurrency(invoice.amount)}</span>
                  </div>
                  <div className="breakdown-row insurance">
                    <span>Insurance Paid</span>
                    <span>-{formatCurrency(invoice.insuranceCovered)}</span>
                  </div>
                  <div className="breakdown-row total">
                    <span>Your Responsibility</span>
                    <span>{formatCurrency(invoice.patientResponsibility)}</span>
                  </div>
                </div>

                {invoice.status !== 'paid' && (
                  <div className="invoice-actions">
                    <button 
                      className="btn-pay"
                      onClick={() => handlePayInvoice(invoice)}
                    >
                      Pay {formatCurrency(invoice.patientResponsibility)}
                    </button>
                    <button className="btn-payment-plan">
                      Setup Payment Plan
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="payment-methods-section">
          <h2>Payment Methods</h2>
          <div className="payment-methods-list">
            {paymentMethods.map(method => (
              <div key={method.id} className={`payment-method ${method.isDefault ? 'default' : ''}`}>
                <div className="method-icon">
                  {method.type === 'card' ? '💳' : '🏦'}
                </div>
                <div className="method-info">
                  <p className="method-brand">{method.brand || 'Bank Account'}</p>
                  <p className="method-number">•••• {method.last4}</p>
                </div>
                {method.isDefault && <span className="default-badge">Default</span>}
              </div>
            ))}
            <button className="btn-add-method">
              + Add Payment Method
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentForm && selectedInvoice && (
        <div className="payment-modal-overlay" onClick={() => setShowPaymentForm(false)}>
          <div className="payment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Complete Payment</h2>
              <button className="btn-close" onClick={() => setShowPaymentForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="payment-summary">
                <h3>{selectedInvoice.invoiceNumber}</h3>
                <p>{selectedInvoice.description}</p>
                <div className="amount-due">
                  <span>Amount Due:</span>
                  <span className="amount">{formatCurrency(selectedInvoice.patientResponsibility)}</span>
                </div>
              </div>
              <div className="payment-form">
                <h4>Select Payment Method</h4>
                {paymentMethods.map(method => (
                  <label key={method.id} className="payment-option">
                    <input type="radio" name="payment-method" defaultChecked={method.isDefault} />
                    <span className="method-label">
                      {method.brand || 'Bank'} •••• {method.last4}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowPaymentForm(false)}>Cancel</button>
              <button className="btn-submit" onClick={handlePaymentSubmit}>
                Pay {formatCurrency(selectedInvoice.patientResponsibility)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};