import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { getServiceOptions, getServicePrice } from '../../config/services';
import './CreateInvoiceModal.css';

interface CreateInvoiceModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  service_type: string;
  service_id?: string;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  patientId,
  patientName,
  onClose,
  onSuccess
}) => {
  const apiClient = useApi();
  const serviceOptions = getServiceOptions();
  const [items, setItems] = useState<InvoiceItem[]>([{
    description: '',
    quantity: 1,
    unit_price: 0,
    service_type: '',
    service_id: ''
  }]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleServiceChange = (index: number, serviceId: string) => {
    const newItems = [...items];
    const selectedService = serviceOptions.find(s => s.value === serviceId);
    
    if (serviceId === 'custom') {
      newItems[index] = {
        ...newItems[index],
        service_id: 'custom',
        service_type: 'custom',
        description: '',
        unit_price: 0
      };
    } else if (selectedService) {
      newItems[index] = {
        ...newItems[index],
        service_id: serviceId,
        service_type: selectedService.billingType,
        description: selectedService.label,
        unit_price: selectedService.price
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
    setItems([...items, {
      description: '',
      quantity: 1,
      unit_price: 0,
      service_type: '',
      service_id: ''
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate items
    const validItems = items.filter(item => item.description && item.unit_price > 0);
    if (validItems.length === 0) {
      setError('Please add at least one item with a description and price');
      return;
    }

    setCreating(true);
    try {
      await apiClient.post('/api/v1/invoices', {
        patient_id: patientId,
        due_date: dueDate,
        description,
        items: validItems,
        total_amount: calculateTotal()
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create invoice');
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
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-section">
              <h3>Patient</h3>
              <div className="form-group">
                <input
                  type="text"
                  className="form-control"
                  value={patientName}
                  disabled
                />
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
                          .filter(s => s.label.includes('Semaglutide') || s.label.includes('Tirzepatide') || 
                                     s.label.includes('Metformin') || s.label.includes('Phentermine'))
                          .map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Hormone Replacement">
                        {serviceOptions
                          .filter(s => s.label.includes('Testosterone'))
                          .map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Mental Health">
                        {serviceOptions
                          .filter(s => s.label.includes('Modafinil'))
                          .map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Peptides">
                        {serviceOptions
                          .filter(s => s.label.includes('CJC') || s.label.includes('Tesamorelin') || 
                                     s.label.includes('BPC'))
                          .map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Blood Work">
                        {serviceOptions
                          .filter(s => s.label.includes('Blood Work'))
                          .map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Telehealth">
                        {serviceOptions
                          .filter(s => s.label.includes('Telehealth'))
                          .map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                      <option value="custom">Custom Service</option>
                    </select>
                  </div>
                  
                  <table className="line-items-table">
                    <thead>
                      <tr>
                        <th>QUANTITY</th>
                        <th>DESCRIPTION</th>
                        <th>UNIT PRICE</th>
                        <th>TOTAL</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <input
                            type="number"
                            className="line-item-input quantity-input"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            min="1"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="line-item-input"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder={item.service_id === 'custom' ? 'Service description' : ''}
                            disabled={item.service_id !== 'custom' && item.service_id !== ''}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="line-item-input price-input"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            disabled={item.service_id !== 'custom' && item.service_id !== ''}
                            required
                          />
                        </td>
                        <td className="total-cell">
                          ${(item.quantity * item.unit_price).toFixed(2)}
                        </td>
                        <td>
                          {items.length > 1 && (
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={() => removeItem(index)}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  
                  {index < items.length - 1 && <div className="line-item-divider" />}
                </div>
              ))}
              
              <button
                type="button"
                className="add-line-item-btn"
                onClick={addItem}
              >
                + Add Line Item
              </button>
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