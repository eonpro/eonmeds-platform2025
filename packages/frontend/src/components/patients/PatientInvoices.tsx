import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import { PaymentModal } from './PaymentModal';
import { MarkAsPaidModal } from './MarkAsPaidModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AlertDialog } from '../common/AlertDialog';
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
  stripeCustomerId,
}) => {
  const apiClient = useApi();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [summaryData, setSummaryData] = useState({
    outstanding: 0,
    uninvoiced: 0,
    totalPaid: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
  });

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/v1/payments/invoices/patient/${patientId}`);
      setInvoices(response.data.invoices || []);
      calculateSummary(response.data.invoices || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, apiClient]);

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (invoice.status === 'paid') {
      setAlertDialog({
        isOpen: true,
        type: 'error',
        title: 'Cannot Delete',
        message: 'Cannot delete paid invoices',
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/api/v1/payments/invoices/${invoice.id}`);
          setAlertDialog({
            isOpen: true,
            type: 'success',
            title: 'Success',
            message: 'Invoice deleted successfully',
          });
          loadInvoices(); // Reload the list
        } catch (error: any) {
          console.error('Error deleting invoice:', error);
          setAlertDialog({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: error.response?.data?.error || 'Failed to delete invoice',
          });
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const calculateSummary = (invoices: Invoice[]) => {
    const outstanding = invoices
      .filter((inv: Invoice) => inv.status === 'open')
      .reduce((sum: number, inv: Invoice) => sum + inv.amount_due, 0);

    const totalPaid = invoices
      .filter((inv: Invoice) => inv.status === 'paid')
      .reduce((sum: number, inv: Invoice) => sum + inv.amount_paid, 0);

    setSummaryData({
      outstanding,
      uninvoiced: 0, // This would come from a separate API call for unbilled services
      totalPaid,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCreateInvoice = () => {
    setShowCreateModal(true);
  };

  return (
    <div className="patient-invoices">
      {/* Header Section */}
      <div className="invoice-header">
        <h3>Invoices</h3>
        <button onClick={handleCreateInvoice} className="create-invoice-btn">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 5V19M5 12H19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Create Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="invoice-summary-cards">
        <div className="summary-card outstanding">
          <h4>Outstanding</h4>
          <p className="amount">{formatCurrency(summaryData.outstanding)}</p>
        </div>
        <div className="summary-card uninvoiced">
          <h4>Uninvoiced</h4>
          <p className="amount">{formatCurrency(summaryData.uninvoiced)}</p>
        </div>
        <div className="summary-card paid">
          <h4>Paid</h4>
          <p className="amount">{formatCurrency(summaryData.totalPaid)}</p>
        </div>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="loading-state">Loading invoices...</div>
      ) : error ? (
        <div
          className="error-message"
          style={{ color: 'red', padding: '20px', textAlign: 'center' }}
        >
          <p>{error}</p>
          {error.includes('session has expired') && (
            <button
              onClick={() => (window.location.href = '/')}
              style={{ marginTop: '10px', padding: '10px 20px', cursor: 'pointer' }}
            >
              Go to Login
            </button>
          )}
        </div>
      ) : invoices.length === 0 ? (
        <div className="no-invoices">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ margin: '0 auto 16px', opacity: 0.3 }}
          >
            <path
              d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 3V9H19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p>No Invoices for this client yet</p>
        </div>
      ) : (
        <div className="invoices-table-container">
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
                    <td>{invoice.invoice_number}</td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td>
                      {formatCurrency(invoice.total_amount)}
                      {invoice.amount_paid > 0 && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            color: '#6b7280',
                            marginTop: '4px',
                          }}
                        >
                          ({formatCurrency(invoice.amount_paid)} paid)
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${invoice.status.toLowerCase()}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="action-btn"
                          title="View Invoice"
                        >
                          View
                        </button>
                        {invoice.status === 'open' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowPaymentModal(true);
                              }}
                              className="action-btn"
                              title="Charge Invoice"
                            >
                              Charge
                            </button>
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowMarkPaidModal(true);
                              }}
                              className="action-btn"
                              title="Mark as Paid"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="delete-invoice-btn"
                              title="Delete Invoice"
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            loadInvoices();
          }}
        />
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && !showPaymentModal && !showEditModal && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onCharge={() => setShowPaymentModal(true)}
          onEdit={() => setShowEditModal(true)}
          onDelete={() => handleDeleteInvoice(selectedInvoice)}
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
            loadInvoices();
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
            loadInvoices();
          }}
        />
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && selectedInvoice && (
        <EditInvoiceModal
          invoice={selectedInvoice}
          patientId={patientId}
          onClose={() => {
            setShowEditModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            loadInvoices();
            setShowEditModal(false);
            setSelectedInvoice(null);
            setAlertDialog({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: 'Invoice updated successfully',
            });
          }}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Invoice"
        message={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        type="danger"
      />

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        type={alertDialog.type}
        title={alertDialog.title}
        message={alertDialog.message}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
      />
    </div>
  );
};
