import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import './Packages.css';

interface ServicePackage {
  id: string;
  name: string;
  category: string;
  billing_period: string;
  price: number;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export const Packages: React.FC = () => {
  const apiClient = useApi();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/packages');
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;

    try {
      await apiClient.delete(`/api/v1/packages/${id}`);
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package');
    }
  };

  const handleToggleActive = async (pkg: ServicePackage) => {
    try {
      await apiClient.patch(`/api/v1/packages/${pkg.id}`, {
        is_active: !pkg.is_active,
      });
      fetchPackages();
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Failed to update package');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="packages-page">
      <div className="page-header">
        <h1>Service Packages</h1>
        <button className="create-package-btn" onClick={() => setShowCreateModal(true)}>
          + Create Package
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading packages...</div>
      ) : packages.length === 0 ? (
        <div className="empty-state">
          <h3>No packages yet</h3>
          <p>Create your first service package to start billing clients</p>
          <button className="create-first-btn" onClick={() => setShowCreateModal(true)}>
            Create Package
          </button>
        </div>
      ) : (
        <div className="packages-grid">
          {packages.map((pkg) => (
            <div key={pkg.id} className={`package-card ${!pkg.is_active ? 'inactive' : ''}`}>
              <div className="package-header">
                <h3>{pkg.name}</h3>
                <div className="package-actions">
                  <button className="edit-btn" onClick={() => setEditingPackage(pkg)} title="Edit">
                    ✏️
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeletePackage(pkg.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="package-details">
                <div className="package-category">{pkg.category}</div>
                <div className="package-price">{formatPrice(pkg.price)}</div>
                <div className="package-billing">per {pkg.billing_period.toLowerCase()}</div>
                {pkg.description && <p className="package-description">{pkg.description}</p>}
              </div>

              <div className="package-footer">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={pkg.is_active}
                    onChange={() => handleToggleActive(pkg)}
                  />
                  <span className="slider"></span>
                  <span className="label">{pkg.is_active ? 'Active' : 'Inactive'}</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPackage) && (
        <PackageModal
          package={editingPackage}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPackage(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingPackage(null);
            fetchPackages();
          }}
        />
      )}
    </div>
  );
};

// Package Modal Component
const PackageModal: React.FC<{
  package?: ServicePackage | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ package: editingPackage, onClose, onSuccess }) => {
  const apiClient = useApi();
  const [formData, setFormData] = useState({
    name: editingPackage?.name || '',
    category: editingPackage?.category || 'Weight Loss',
    billing_period: editingPackage?.billing_period || 'Monthly',
    price: editingPackage?.price || 0,
    description: editingPackage?.description || '',
    is_active: editingPackage?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const categories = ['Weight Loss', 'Testosterone', 'Consultation', 'Lab Work', 'Custom'];
  const billingPeriods = ['Monthly', 'Quarterly', 'One-time'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      if (editingPackage) {
        await apiClient.put(`/api/v1/packages/${editingPackage.id}`, formData);
      } else {
        await apiClient.post('/api/v1/packages', formData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingPackage ? 'Edit Package' : 'Create Package'}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Package Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Weight Loss - Monthly"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Billing Period</label>
              <select
                value={formData.billing_period}
                onChange={(e) => setFormData({ ...formData, billing_period: e.target.value })}
                required
              >
                {billingPeriods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Price</label>
            <div className="price-input">
              <span className="currency">$</span>
              <input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                }
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Package details..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Active (available for selection)
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : editingPackage ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
