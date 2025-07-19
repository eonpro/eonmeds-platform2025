import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { PaymentModal } from './PaymentModal';
import { MarkAsPaidModal } from './MarkAsPaidModal';
import './PatientInvoices.css';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface PatientInvoicesProps {
  patientId: string;
  patientName: string;
  stripeCustomerId?: string;
}

export const PatientInvoices: React.FC<PatientInvoicesProps> = ({ 
  patientId, 
  patientName,
  stripeCustomerId 
}) => {
  const apiClient = useApi();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [summaryData, setSummaryData] = useState({
    outstanding: 0,
    uninvoiced: 0,
    totalPaid: 0
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch invoices
  useEffect(() => {
    fetchInvoices();
  }, [patientId]);

  const fetchInvoices = async () => {
    try {
      const response = await apiClient.get(`/api/v1/payments/invoices/patient/${patientId}`);
      setInvoices(response.data.invoices || []);
      setError(null);
      
      // Calculate summary data
      const outstanding = response.data.invoices
        .filter((inv: Invoice) => inv.status === 'open')
        .reduce((sum: number, inv: Invoice) => sum + inv.amount_due, 0);
      
      const totalPaid = response.data.invoices
        .filter((inv: Invoice) => inv.status === 'paid')
        .reduce((sum: number, inv: Invoice) => sum + inv.amount_paid, 0);
      
      setSummaryData({
        outstanding,
        uninvoiced: 0, // This would come from a separate API call for unbilled services
        totalPaid
      });
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      
      // If it's an auth error, suggest re-login
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log out and log back in.');
      } else {
        setError('Failed to load invoices');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'open': return '#f59e0b';
      case 'overdue': return '#ef4444';
      case 'draft': return '#6b7280';
      default: return '#6b7280';
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

  return (
    <div className="patient-invoices">
      {/* Summary Cards */}
      <div className="invoice-summary-cards">
        <div className="summary-card outstanding">
          <h4>OUTSTANDING</h4>
          <p className="amount">{formatCurrency(summaryData.outstanding)}</p>
        </div>
        <div className="summary-card uninvoiced">
          <h4>UNINVOICED</h4>
          <p className="amount">{formatCurrency(summaryData.uninvoiced)}</p>
        </div>
        <div className="summary-card paid">
          <h4>TOTAL PAID</h4>
          <p className="amount">{formatCurrency(summaryData.totalPaid)}</p>
        </div>
      </div>

      {/* Create Invoice Button */}
      <div className="invoice-actions">
        <button 
          className="create-invoice-btn"
          onClick={() => setShowCreateModal(true)}
        >
          CREATE INVOICE
        </button>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="loading-state">Loading invoices...</div>
      ) : error ? (
        <div className="error-message" style={{ color: 'red', padding: '20px', textAlign: 'center' }}>
          <p>{error}</p>
          {error.includes('session has expired') && (
            <button 
              onClick={() => window.location.href = '/'}
              style={{ marginTop: '10px', padding: '10px 20px', cursor: 'pointer' }}
            >
              Go to Login
            </button>
          )}
        </div>
      ) : invoices.length === 0 ? (
        <div className="no-invoices">
          <p>No Invoices for this client yet</p>
        </div>
      ) : (
        <div className="invoices-table">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="invoice-number">{invoice.invoice_number}</td>
                  <td>{formatDate(invoice.invoice_date)}</td>
                  <td>{formatDate(invoice.due_date)}</td>
                  <td className="amount">
                    {formatCurrency(invoice.total_amount)}
                    {invoice.amount_paid > 0 && (
                      <span className="amount-paid">
                        ({formatCurrency(invoice.amount_paid)} paid)
                      </span>
                    )}
                  </td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(invoice.status) }}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="action-btn view"
                      onClick={() => setSelectedInvoice(invoice)}
                      title="View Invoice"
                    >
                      👁️
                    </button>
                    {invoice.status === 'open' && (
                      <>
                        <button 
                          className="action-btn charge"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowPaymentModal(true);
                          }}
                          title="Charge Invoice"
                        >
                          💳
                        </button>
                        <button 
                          className="action-btn mark-paid"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowMarkPaidModal(true);
                          }}
                          title="Mark as Paid (Offline)"
                        >
                          ✓
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <CreateInvoiceModal
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchInvoices();
          }}
        />
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && !showPaymentModal && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onCharge={() => setShowPaymentModal(true)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          stripeCustomerId={stripeCustomerId}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
            fetchInvoices();
          }}
        />
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && selectedInvoice && (
        <MarkAsPaidModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowMarkPaidModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            setShowMarkPaidModal(false);
            setSelectedInvoice(null);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}; 