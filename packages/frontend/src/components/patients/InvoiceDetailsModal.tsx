import React from 'react';
import './InvoiceDetailsModal.css';

interface InvoiceDetailsModalProps {
  invoice: any;
  onClose: () => void;
  onCharge: () => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  invoice,
  onClose,
  onCharge,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#10b981';
      case 'open':
        return '#f59e0b';
      case 'overdue':
        return '#ef4444';
      case 'draft':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="invoice-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invoice Details</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="invoice-header-info">
          <div className="invoice-number-section">
            <h3>Invoice #{invoice.invoice_number}</h3>
            <span
              className="status-badge"
              style={{ backgroundColor: getStatusColor(invoice.status) }}
            >
              {invoice.status}
            </span>
          </div>

          <div className="invoice-dates">
            <div className="date-item">
              <label>Invoice Date</label>
              <p>{formatDate(invoice.invoice_date)}</p>
            </div>
            <div className="date-item">
              <label>Due Date</label>
              <p>{formatDate(invoice.due_date)}</p>
            </div>
          </div>
        </div>

        <div className="invoice-body">
          <div className="invoice-items-section">
            <h4>Line Items</h4>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item: any, index: number) => (
                  <tr key={index}>
                    <td>{item.description}</td>
                    <td className="center">{item.quantity}</td>
                    <td className="right">{formatCurrency(item.unit_price)}</td>
                    <td className="right amount">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="invoice-totals-section">
            <div className="totals-container">
              <div className="total-line">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <div className="total-line">
                  <span>Amount Paid</span>
                  <span className="paid">-{formatCurrency(invoice.amount_paid)}</span>
                </div>
              )}
              <div className="total-line final">
                <span>Amount Due</span>
                <span className="amount-due">{formatCurrency(invoice.amount_due)}</span>
              </div>
            </div>
          </div>

          {invoice.description && (
            <div className="invoice-notes">
              <h4>Notes</h4>
              <p>{invoice.description}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>
            Close
          </button>
          {invoice.status === 'open' && (
            <button className="primary-btn charge" onClick={onCharge}>
              💳 Charge Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
