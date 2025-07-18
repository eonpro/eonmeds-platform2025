import React, { useState, useEffect } from 'react';
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
  service_package_id?: string;
}

interface ServicePackage {
  id: string;
  name: string;
  category: string;
  billing_period: string;
  price: number;
  description?: string;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  patientId,
  patientName,
  onClose,
  onSuccess
}) => {
  const apiClient = useApi();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [items, setItems] = useState<InvoiceItem[]>([{
    description: '',
    quantity: 1,
    unit_price: 0,
    service_type: '',
    service_package_id: undefined
  }]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await apiClient.get('/api/v1/packages/active');
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleServiceTypeChange = (index: number, value: string) => {
    const newItems = [...items];
    
    if (value === 'custom' || value === '') {
      // Allow custom entry
      newItems[index] = {
        ...newItems[index],
        service_package_id: undefined,
        service_type: 'custom',
        description: newItems[index].description || '',
        unit_price: newItems[index].unit_price || 0
      };
    } else {
      // Find selected package
      const selectedPackage = packages.find(p => p.id.toString() === value);
      if (selectedPackage) {
        newItems[index] = {
          ...newItems[index],
          service_package_id: value,
          service_type: selectedPackage.category,
          description: selectedPackage.name,
          unit_price: selectedPackage.price
        };
      }
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
      service_package_id: undefined
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
        <h2>Create Invoice</h2>
        <button className="close-btn" onClick={onClose}>×</button>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Patient</label>
            <input type="text" value={patientName} disabled />
          </div>

          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Invoice description"
              rows={2}
            />
          </div>

          <div className="line-items-section">
            <div className="line-items-header">
              <h3>Line Items</h3>
            </div>
            <div className="line-items">
              {items.map((item, index) => (
                <div key={index} className="line-item">
                  <div className="line-item-row">
                    <div className="line-item-field">
                      <label>Service</label>
                      <select
                        value={item.service_package_id || ''}
                        onChange={(e) => handleServiceTypeChange(index, e.target.value)}
                      >
                        <option value="">Select service or enter custom</option>
                        {packages.map(pkg => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name}
                          </option>
                        ))}
                        <option value="custom">Custom Service</option>
                      </select>
                    </div>
                    <div className="line-item-field">
                      <label>Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  
                  {(item.service_type === 'custom' || !item.service_package_id) && (
                    <div className="line-item-row full-width">
                      <div className="line-item-field">
                        <label>Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Service description"
                          required
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="line-item-row">
                    <div className="line-item-field">
                      <label>Unit Price</label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                        placeholder="0.00"
                      />
                    </div>
                    <div className="line-item-field">
                      <label>Total</label>
                      <input
                        type="text"
                        value={`$${(item.quantity * item.unit_price).toFixed(2)}`}
                        disabled
                      />
                    </div>
                  </div>
                  
                  {items.length > 1 && (
                    <div className="line-item-footer">
                      <span className="item-total">Item Total: ${(item.quantity * item.unit_price).toFixed(2)}</span>
                      <button
                        type="button"
                        className="remove-item-btn"
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <button type="button" className="add-item-btn" onClick={addItem}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/>
              </svg>
              Add Line Item
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