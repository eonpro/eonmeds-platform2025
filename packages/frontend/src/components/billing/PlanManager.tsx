import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './PlanManager.css';

interface BillingPlan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
  trial_period_days: number;
  features: string[];
  active: boolean;
  created_at: string;
}

interface CreatePlanForm {
  name: string;
  description: string;
  amount: string;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: string;
  trial_period_days: string;
  features: string;
}

export const PlanManager: React.FC = () => {
  const apiClient = useApi();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreatePlanForm>({
    name: '',
    description: '',
    amount: '',
    currency: 'USD',
    interval: 'month',
    interval_count: '1',
    trial_period_days: '0',
    features: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    if (!apiClient) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/billing-system/plans');
      setPlans(response.data.data);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
      setError(err.response?.data?.error || 'Failed to load billing plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiClient) return;

    setCreating(true);
    setError(null);

    try {
      const planData = {
        name: formData.name,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        interval: formData.interval,
        interval_count: parseInt(formData.interval_count),
        trial_period_days: parseInt(formData.trial_period_days),
        features: formData.features.split('\n').filter(f => f.trim())
      };

      await apiClient.post('/billing-system/plans', planData);
      
      // Reset form and refresh plans
      setFormData({
        name: '',
        description: '',
        amount: '',
        currency: 'USD',
        interval: 'month',
        interval_count: '1',
        trial_period_days: '0',
        features: ''
      });
      setShowCreateForm(false);
      await fetchPlans();
    } catch (err: any) {
      console.error('Error creating plan:', err);
      setError(err.response?.data?.error || 'Failed to create billing plan');
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatInterval = (interval: string, count: number) => {
    const plural = count > 1 ? 's' : '';
    return count > 1 ? `every ${count} ${interval}${plural}` : `per ${interval}`;
  };

  if (loading) {
    return (
      <div className="plan-manager loading">
        <div className="spinner"></div>
        <p>Loading billing plans...</p>
      </div>
    );
  }

  return (
    <div className="plan-manager">
      <div className="manager-header">
        <h1>Billing Plans</h1>
        <button 
          className="create-plan-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Create New Plan'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showCreateForm && (
        <div className="create-plan-form">
          <h2>Create New Billing Plan</h2>
          <form onSubmit={handleCreatePlan}>
            <div className="form-row">
              <div className="form-group">
                <label>Plan Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Professional Plan"
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <div className="input-with-addon">
                  <span className="addon">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="99.99"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the plan"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Billing Interval *</label>
                <select
                  value={formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval: e.target.value as any })}
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Interval Count *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.interval_count}
                  onChange={(e) => setFormData({ ...formData, interval_count: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Trial Period (days)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.trial_period_days}
                  onChange={(e) => setFormData({ ...formData, trial_period_days: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Features (one per line)</label>
              <textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Unlimited appointments&#10;Priority support&#10;Advanced analytics"
                rows={5}
              />
            </div>

            <div className="form-actions">
              <button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Plan'}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="plans-grid">
        {plans.length === 0 ? (
          <div className="no-plans">
            <p>No billing plans created yet.</p>
            <button onClick={() => setShowCreateForm(true)}>
              Create your first plan
            </button>
          </div>
        ) : (
          plans.map(plan => (
            <div key={plan.id} className={`plan-card ${!plan.active ? 'inactive' : ''}`}>
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <span className={`plan-status ${plan.active ? 'active' : 'inactive'}`}>
                  {plan.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {plan.description && (
                <p className="plan-description">{plan.description}</p>
              )}

              <div className="plan-pricing">
                <span className="price">{formatCurrency(plan.amount, plan.currency)}</span>
                <span className="interval">{formatInterval(plan.interval, plan.interval_count)}</span>
              </div>

              {plan.trial_period_days > 0 && (
                <div className="plan-trial">
                  {plan.trial_period_days} day free trial
                </div>
              )}

              {plan.features.length > 0 && (
                <div className="plan-features">
                  <h4>Features:</h4>
                  <ul>
                    {plan.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="plan-actions">
                <button className="edit-btn">Edit</button>
                <button className="toggle-btn">
                  {plan.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>

              <div className="plan-meta">
                Created: {new Date(plan.created_at).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
