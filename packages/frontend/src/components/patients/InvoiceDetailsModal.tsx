import React from 'react';
import './InvoiceDetailsModal.css';

interface InvoiceDetailsModalProps {
  invoice: any;
  onClose: () => void;
  onCharge: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  invoice,
  onClose,
  onCharge,
  onEdit,
  onDelete,
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
            <>
              <button className="action-btn" onClick={onEdit}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M11.013 2.513a1.75 1.75 0 0 1 2.475 0l.5.5a1.75 1.75 0 0 1 0 2.475L8.226 11.25a1.75 1.75 0 0 1-.823.458l-3.5 1a.75.75 0 0 1-.908-.908l1-3.5a1.75 1.75 0 0 1 .458-.823L11.013 2.513zm1.414 1.06a.25.25 0 0 0-.354 0L5.513 10.134a.25.25 0 0 0-.065.117l-.71 2.487 2.487-.71a.25.25 0 0 0 .117-.065l6.56-6.56a.25.25 0 0 0 0-.354l-.5-.5a.25.25 0 0 0-.354 0z"/>
                </svg>
                Edit
              </button>
              <button className="delete-btn" onClick={onDelete}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 1 0-1.492.15l.66 6.6A1.75 1.75 0 0 0 5.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 0 0-1.492-.149l-.66 6.6a.25.25 0 0 1-.249.225h-5.19a.25.25 0 0 1-.249-.225l-.66-6.6z"/>
                </svg>
                Delete
              </button>
              <button className="primary-btn charge" onClick={onCharge}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M2.5 2.75a.75.75 0 0 0 0 1.5h11a.75.75 0 0 0 0-1.5h-11zM2.5 5.25a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7zM2.5 8.25a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-4z"/>
                  <path d="M13.5 7.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm.5 2.5a.5.5 0 0 1-.5.5h-.5a.5.5 0 0 1 0-1h.5a.5.5 0 0 1 .5.5z"/>
                </svg>
                Pay Invoice
              </button>
            </>
          )}
          {invoice.status === 'draft' && (
            <>
              <button className="action-btn" onClick={onEdit}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M11.013 2.513a1.75 1.75 0 0 1 2.475 0l.5.5a1.75 1.75 0 0 1 0 2.475L8.226 11.25a1.75 1.75 0 0 1-.823.458l-3.5 1a.75.75 0 0 1-.908-.908l1-3.5a1.75 1.75 0 0 1 .458-.823L11.013 2.513zm1.414 1.06a.25.25 0 0 0-.354 0L5.513 10.134a.25.25 0 0 0-.065.117l-.71 2.487 2.487-.71a.25.25 0 0 0 .117-.065l6.56-6.56a.25.25 0 0 0 0-.354l-.5-.5a.25.25 0 0 0-.354 0z"/>
                </svg>
                Edit
              </button>
              <button className="delete-btn" onClick={onDelete}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 1 0-1.492.15l.66 6.6A1.75 1.75 0 0 0 5.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 0 0-1.492-.149l-.66 6.6a.25.25 0 0 1-.249.225h-5.19a.25.25 0 0 1-.249-.225l-.66-6.6z"/>
                </svg>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
