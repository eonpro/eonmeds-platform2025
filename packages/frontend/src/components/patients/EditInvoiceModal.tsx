import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './CreateInvoiceModal.css'; // Reuse the same styles

interface EditInvoiceModalProps {
  invoice: any;
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  invoice,
  patientId,
  onClose,
  onSuccess,
}) => {
  const apiClient = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    due_date: invoice.due_date.split('T')[0], // Format for date input
    status: invoice.status,
  });

  const [items, setItems] = useState(invoice.items || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Calculate total
      const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

      const updateData = {
        ...formData,
        total_amount: total,
        items: items,
      };

      await apiClient.put(`/api/v1/payments/invoices/${invoice.id}`, updateData);
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      setError(error.response?.data?.error || 'Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_: any, i: number) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    
    // Recalculate amount
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-invoice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Invoice #{invoice.invoice_number}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h3>Invoice Items</h3>
              <button type="button" className="add-item-btn" onClick={addItem}>
                + Add Item
              </button>
            </div>

            <div className="items-list">
              {items.map((item: any, index: number) => (
                <div key={index} className="invoice-item">
                  <div className="item-row">
                    <div className="item-description">
                      <input
                        type="text"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="item-quantity">
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                    
                    <div className="item-price">
                      <input
                        type="number"
                        placeholder="Price"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    
                    <div className="item-total">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                    
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
                </div>
              ))}
            </div>

            <div className="invoice-total">
              <span>Total:</span>
              <span className="total-amount">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading || items.length === 0}>
              {loading ? 'Updating...' : 'Update Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
