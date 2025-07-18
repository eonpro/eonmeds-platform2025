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

  const handleServiceTypeChange = (index: number, packageId: string) => {
    const newItems = [...items];
    const selectedPackage = packages.find(p => p.id === packageId);
    
    if (selectedPackage) {
      newItems[index] = {
        ...newItems[index],
        service_package_id: packageId,
        service_type: selectedPackage.category,
        description: selectedPackage.name,
        unit_price: selectedPackage.price
      };
    } else if (packageId === 'custom') {
      newItems[index] = {
        ...newItems[index],
        service_package_id: undefined,
        service_type: 'custom',
        description: '',
        unit_price: 0
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
                    value={item.service_package_id || ''}
                    onChange={(e) => handleServiceTypeChange(index, e.target.value)}
                    required
                  >
                    <option value="">Select service</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </option>
                    ))}
                    <option value="custom">Custom</option>
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