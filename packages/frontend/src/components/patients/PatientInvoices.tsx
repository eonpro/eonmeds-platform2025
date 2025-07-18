import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { PaymentModal } from './PaymentModal';
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

  // Fetch invoices
  useEffect(() => {
    fetchInvoices();
  }, [patientId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/v1/payments/invoices/patient/${patientId}`);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
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
      <div className="invoices-header">
        <h3>Invoices & Billing</h3>
        <button 
          className="create-invoice-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <span className="plus-icon">+</span>
          Create Invoice
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading invoices...</div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h4>No invoices yet</h4>
          <p>Create the first invoice for {patientName}</p>
          <button 
            className="create-first-btn"
            onClick={() => setShowCreateModal(true)}
          >
            Create Invoice
          </button>
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
    </div>
  );
}; 