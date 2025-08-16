import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { getServiceOptions, getServicePrice } from '../../config/services';
import './CreateInvoiceModal.css';

interface CreateInvoiceModalProps {
  patientId: string;
  patientName: string;
  patientEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  service_type: string;
  service_id?: string;
  billing_type?: string;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  patientId,
  patientName,
  patientEmail,
  onClose,
  onSuccess,
}) => {
  const apiClient = useApi();
  const serviceOptions = getServiceOptions();
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: '',
      quantity: 1,
      unit_price: 0,
      service_type: '',
      service_id: '',
      billing_type: '',
    },
  ]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleServiceChange = (index: number, serviceId: string) => {
    const newItems = [...items];
    const selectedService = serviceOptions.find((s) => s.value === serviceId);

    if (serviceId === 'custom') {
      newItems[index] = {
        ...newItems[index],
        service_id: 'custom',
        service_type: 'custom',
        billing_type: 'one-time',
        description: '',
        unit_price: 0,
        quantity: 1,
      };
    } else if (selectedService) {
      newItems[index] = {
        ...newItems[index],
        service_id: serviceId,
        service_type: selectedService.billingType,
        billing_type: selectedService.billingType,
        description: selectedService.label,
        unit_price: selectedService.price,
        quantity: 1,
      };
    }

    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        service_type: '',
        service_id: '',
        billing_type: '',
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.unit_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate items
    const validItems = items.filter((item) => item.description && item.unit_price > 0);
    if (validItems.length === 0) {
      setError('Please add at least one item with a description and price');
      return;
    }

    setCreating(true);
    try {
      // Prepare items with billing information for recurring services
      const invoiceItems = validItems.map((item) => ({
        description: item.description,
        quantity: 1, // Always 1 since we removed quantity field
        unit_price: item.unit_price,
        service_type: item.service_type,
        billing_type: item.billing_type,
        is_recurring: item.billing_type === 'recurring',
      }));

      // Create invoice using the payments API with 'open' status
      console.log('Creating invoice with data:', {
        patient_id: patientId,
        due_date: dueDate,
        description,
        items: invoiceItems,
        total_amount: calculateTotal(),
        status: 'open'
      });
      
      await apiClient.post('/api/v1/payments/invoices/create', {
        patient_id: patientId,
        due_date: dueDate,
        description,
        items: invoiceItems,
        total_amount: calculateTotal(),
        status: 'open', // Create as open so it can be paid immediately
        is_recurring: invoiceItems.some((item) => item.is_recurring),
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.data?.need_payment_method) {
        setError('This customer has no default payment method. Add a card or choose "Email invoice".');
      } else {
        setError(error.response?.data?.error || error.response?.data?.message || 'Failed to create invoice');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create Invoice</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-section">
              <h3>Patient</h3>
              <div className="form-group">
                <input type="text" className="form-control" value={patientName} disabled />
              </div>
            </div>

            <div className="form-section">
              <h3>Due Date</h3>
              <div className="form-group">
                <input
                  type="date"
                  className="form-control"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="line-items-section">
              <div className="line-items-header">
                <h4>Line Items</h4>
              </div>

              {items.map((item, index) => (
                <div key={index} className="line-item-container">
                  <div className="service-row">
                    <label className="service-label">SERVICE</label>
                    <select
                      className="line-item-select full-width"
                      value={item.service_id}
                      onChange={(e) => handleServiceChange(index, e.target.value)}
                      required
                    >
                      <option value="">Select service or enter custom</option>
                      <optgroup label="Weight Loss">
                        {serviceOptions
                          .filter(
                            (s) =>
                              s.label.includes('Semaglutide') ||
                              s.label.includes('Tirzepatide') ||
                              s.label.includes('Metformin') ||
                              s.label.includes('Phentermine')
                          )
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Hormone Replacement">
                        {serviceOptions
                          .filter((s) => s.label.includes('Testosterone'))
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Mental Health">
                        {serviceOptions
                          .filter((s) => s.label.includes('Modafinil'))
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Peptides">
                        {serviceOptions
                          .filter(
                            (s) =>
                              s.label.includes('CJC') ||
                              s.label.includes('Tesamorelin') ||
                              s.label.includes('BPC')
                          )
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Blood Work">
                        {serviceOptions
                          .filter((s) => s.label.includes('Blood Work'))
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Telehealth">
                        {serviceOptions
                          .filter((s) => s.label.includes('Telehealth'))
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <option value="custom">Custom Service</option>
                    </select>
                  </div>

                  <div className="details-row">
                    <div className="description-col-extended">
                      <label className="field-label">DESCRIPTION</label>
                      <input
                        type="text"
                        className="line-item-input description-input"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder={item.service_id === 'custom' ? 'Service description' : ''}
                        disabled={item.service_id !== 'custom' && item.service_id !== ''}
                        required
                      />
                    </div>
                    <div className="total-col">
                      <label className="field-label">TOTAL</label>
                      <div className="total-cell">${item.unit_price.toFixed(2)}</div>
                    </div>
                    {items.length > 1 && (
                      <div className="remove-col">
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeItem(index)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {item.service_id === 'custom' && (
                    <div className="custom-price-row">
                      <label className="field-label">CUSTOM PRICE</label>
                      <input
                        type="number"
                        className="line-item-input price-input-custom"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        step="0.01"
                        placeholder="Enter price"
                        required
                      />
                    </div>
                  )}

                  {item.billing_type === 'recurring' && (
                    <div className="recurring-notice">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="info-icon"
                      >
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
                      </svg>
                      This is a recurring monthly charge. The patient will be automatically charged
                      ${item.unit_price} on the same day each month.
                    </div>
                  )}

                  {index < items.length - 1 && <div className="line-item-divider" />}
                </div>
              ))}

              <button type="button" className="add-line-item-btn" onClick={addItem}>
                + Add Line Item
              </button>
            </div>

            <div className="form-section">
              <h3>Description (Optional)</h3>
              <div className="form-group">
                <textarea
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Invoice description"
                  rows={3}
                />
              </div>
            </div>

            <div className="total-section">
              <div className="total-label">Total Amount</div>
              <div className="total-amount">${calculateTotal().toFixed(2)}</div>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating || calculateTotal() === 0}
            >
              {creating ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
