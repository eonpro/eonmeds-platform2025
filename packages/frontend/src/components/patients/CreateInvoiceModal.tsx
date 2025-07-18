import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
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
}

const SERVICE_TYPES = [
  { value: 'weight_loss_monthly', label: 'Weight Loss - Monthly', price: 299 },
  { value: 'weight_loss_quarterly', label: 'Weight Loss - Quarterly', price: 799 },
  { value: 'testosterone_monthly', label: 'Testosterone - Monthly', price: 349 },
  { value: 'testosterone_quarterly', label: 'Testosterone - Quarterly', price: 949 },
  { value: 'consultation', label: 'Consultation', price: 99 },
  { value: 'lab_work', label: 'Lab Work', price: 150 },
  { value: 'custom', label: 'Custom', price: 0 }
];

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  patientId,
  patientName,
  onClose,
  onSuccess
}) => {
  const apiClient = useApi();
  const [items, setItems] = useState<InvoiceItem[]>([{
    description: '',
    quantity: 1,
    unit_price: 0,
    service_type: ''
  }]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleServiceTypeChange = (index: number, serviceType: string) => {
    const newItems = [...items];
    const service = SERVICE_TYPES.find(s => s.value === serviceType);
    
    if (service) {
      newItems[index] = {
        ...newItems[index],
        service_type: serviceType,
        description: service.label,
        unit_price: service.price
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
      service_type: ''
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
    
    try {
      setCreating(true);
      
      const response = await apiClient.post('/api/v1/payments/invoices/create', {
        patient_id: patientId,
        items: items.filter(item => item.description && item.unit_price > 0),
        due_date: dueDate,
        description: description || `Medical services for ${patientName}`
      });

      if (response.data.invoice) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Invoice</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <label>Patient</label>
            <input type="text" value={patientName} disabled />
          </div>

          <div className="form-section">
            <label>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div className="form-section">
            <label>Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Invoice description"
            />
          </div>

          <div className="form-section">
            <label>Line Items</label>
            <div className="line-items">
              {items.map((item, index) => (
                <div key={index} className="line-item">
                  <select
                    value={item.service_type}
                    onChange={(e) => handleServiceTypeChange(index, e.target.value)}
                    required
                  >
                    <option value="">Select service</option>
                    {SERVICE_TYPES.map(service => (
                      <option key={service.value} value={service.value}>
                        {service.label}
                      </option>
                    ))}
                  </select>
                  
                  {item.service_type === 'custom' && (
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Description"
                      required
                    />
                  )}
                  
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                    min="1"
                    required
                  />
                  
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                    disabled={item.service_type !== 'custom'}
                  />
                  
                  <span className="item-total">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </span>
                  
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => removeItem(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button type="button" className="add-item-btn" onClick={addItem}>
              + Add Item
            </button>
          </div>

          <div className="invoice-total">
            <span>Total:</span>
            <span className="total-amount">${calculateTotal().toFixed(2)}</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="create-btn" disabled={creating}>
              {creating ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 