import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './EnterpriseDashboard.css';

interface WebhookStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  failureRate: number;
  avgProcessingTime: number;
}

interface DunningMetrics {
  total_events: number;
  active_events: number;
  recovery_rate: number;
  average_recovery_time_days: number;
  revenue_recovered: number;
  revenue_lost: number;
}

interface CurrencyExposure {
  currency: string;
  active_subscriptions: number;
  monthly_revenue: number;
  outstanding_invoices: number;
  total_exposure: number;
}

interface TaxCollected {
  jurisdiction: string;
  tax_type: string;
  total_collected: number;
  transaction_count: number;
}

export const EnterpriseDashboard: React.FC = () => {
  const apiClient = useApi();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'webhooks' | 'dunning' | 'multi-currency' | 'tax'>('overview');
  
  // Data states
  const [webhookStats, setWebhookStats] = useState<WebhookStats | null>(null);
  const [dunningMetrics, setDunningMetrics] = useState<DunningMetrics | null>(null);
  const [currencyExposure, setCurrencyExposure] = useState<CurrencyExposure[]>([]);
  const [taxData, setTaxData] = useState<TaxCollected[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    if (!apiClient) return;

    setLoading(true);
    try {
      // Fetch all data in parallel
      const [webhooks, dunning, currency, tax] = await Promise.all([
        apiClient.get('/billing-system/webhooks/stats'),
        apiClient.get('/billing-system/dunning/metrics', {
          params: { start_date: dateRange.start, end_date: dateRange.end }
        }),
        apiClient.get('/billing-system/currency/exposure'),
        apiClient.get('/billing-system/tax/collected', {
          params: { start_date: dateRange.start, end_date: dateRange.end }
        })
      ]);

      setWebhookStats(webhooks.data.data);
      setDunningMetrics(dunning.data.data);
      setCurrencyExposure(currency.data.data);
      setTaxData(tax.data.data);
    } catch (error) {
      console.error('Failed to fetch enterprise dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const renderOverview = () => (
    <div className="overview-section">
      <div className="metrics-row">
        <div className="metric-card">
          <h4>Webhook Reliability</h4>
          <div className="metric-value">
            {webhookStats ? `${(100 - webhookStats.failureRate).toFixed(1)}%` : '-'}
          </div>
          <div className="metric-subtitle">Success Rate</div>
        </div>

        <div className="metric-card">
          <h4>Payment Recovery</h4>
          <div className="metric-value">
            {dunningMetrics ? `${dunningMetrics.recovery_rate.toFixed(1)}%` : '-'}
          </div>
          <div className="metric-subtitle">Dunning Success</div>
        </div>

        <div className="metric-card">
          <h4>Currency Exposure</h4>
          <div className="metric-value">
            {currencyExposure.length}
          </div>
          <div className="metric-subtitle">Active Currencies</div>
        </div>

        <div className="metric-card">
          <h4>Tax Compliance</h4>
          <div className="metric-value">
            {taxData.length}
          </div>
          <div className="metric-subtitle">Tax Jurisdictions</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <h3>Enterprise Metrics</h3>
        <ul>
          <li>
            <span>Revenue Recovered (Dunning):</span>
            <strong>{dunningMetrics ? formatCurrency(dunningMetrics.revenue_recovered) : '-'}</strong>
          </li>
          <li>
            <span>Average Processing Time:</span>
            <strong>{webhookStats ? `${webhookStats.avgProcessingTime.toFixed(2)}s` : '-'}</strong>
          </li>
          <li>
            <span>Active Dunning Events:</span>
            <strong>{dunningMetrics?.active_events || 0}</strong>
          </li>
        </ul>
      </div>
    </div>
  );

  const renderWebhooks = () => (
    <div className="webhooks-section">
      <h3>Webhook Processing</h3>
      
      {webhookStats && (
        <>
          <div className="webhook-stats">
            <div className="stat-item">
              <span className="stat-label">Total Events (24h)</span>
              <span className="stat-value">{webhookStats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completed</span>
              <span className="stat-value success">{webhookStats.completed}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Failed</span>
              <span className="stat-value error">{webhookStats.failed}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pending</span>
              <span className="stat-value warning">{webhookStats.pending}</span>
            </div>
          </div>

          <div className="webhook-performance">
            <h4>Performance Metrics</h4>
            <div className="performance-chart">
              <div className="chart-bar">
                <div 
                  className="bar-fill success" 
                  style={{ width: `${(webhookStats.completed / webhookStats.total) * 100}%` }}
                />
                <span>Success Rate</span>
              </div>
              <div className="chart-bar">
                <div 
                  className="bar-fill error" 
                  style={{ width: `${webhookStats.failureRate}%` }}
                />
                <span>Failure Rate</span>
              </div>
            </div>
          </div>

          <div className="webhook-actions">
            <button onClick={() => apiClient?.post('/billing-system/webhooks/retry-failed')}>
              Retry Failed Webhooks
            </button>
            <button onClick={() => apiClient?.post('/billing-system/webhooks/cleanup')}>
              Cleanup Old Events
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderDunning = () => (
    <div className="dunning-section">
      <h3>Dunning Management</h3>
      
      {dunningMetrics && (
        <>
          <div className="dunning-overview">
            <div className="dunning-stat">
              <h4>Recovery Performance</h4>
              <div className="stat-circle">
                <svg viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#eee"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#4CAF50"
                    strokeWidth="3"
                    strokeDasharray={`${dunningMetrics.recovery_rate}, 100`}
                  />
                </svg>
                <div className="percentage">{dunningMetrics.recovery_rate.toFixed(1)}%</div>
              </div>
            </div>

            <div className="dunning-metrics">
              <div className="metric">
                <span>Revenue Recovered</span>
                <strong>{formatCurrency(dunningMetrics.revenue_recovered)}</strong>
              </div>
              <div className="metric">
                <span>Revenue at Risk</span>
                <strong className="warning">{formatCurrency(dunningMetrics.revenue_lost)}</strong>
              </div>
              <div className="metric">
                <span>Avg Recovery Time</span>
                <strong>{dunningMetrics.average_recovery_time_days.toFixed(1)} days</strong>
              </div>
              <div className="metric">
                <span>Active Events</span>
                <strong>{dunningMetrics.active_events}</strong>
              </div>
            </div>
          </div>

          <div className="dunning-strategies">
            <h4>Active Strategies</h4>
            <div className="strategy-list">
              <div className="strategy-item">
                <span className="strategy-name">Standard</span>
                <span className="strategy-stats">4 attempts over 22 days</span>
              </div>
              <div className="strategy-item">
                <span className="strategy-name">Aggressive</span>
                <span className="strategy-stats">6 attempts over 28 days</span>
              </div>
              <div className="strategy-item">
                <span className="strategy-name">Gentle</span>
                <span className="strategy-stats">3 attempts over 35 days</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderMultiCurrency = () => (
    <div className="currency-section">
      <h3>Multi-Currency Management</h3>
      
      <div className="currency-exposure">
        <h4>Currency Exposure</h4>
        <table className="currency-table">
          <thead>
            <tr>
              <th>Currency</th>
              <th>Active Subscriptions</th>
              <th>Monthly Revenue</th>
              <th>Outstanding</th>
              <th>Total Exposure</th>
            </tr>
          </thead>
          <tbody>
            {currencyExposure.map((exposure) => (
              <tr key={exposure.currency}>
                <td className="currency-code">{exposure.currency}</td>
                <td>{exposure.active_subscriptions}</td>
                <td>{formatCurrency(exposure.monthly_revenue, exposure.currency)}</td>
                <td>{formatCurrency(exposure.outstanding_invoices, exposure.currency)}</td>
                <td className="total">
                  {formatCurrency(exposure.total_exposure, exposure.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="exchange-rate-actions">
        <button onClick={() => apiClient?.post('/billing-system/currency/update-rates')}>
          Update Exchange Rates
        </button>
        <button onClick={() => window.location.href = '/billing/currency/settings'}>
          Currency Settings
        </button>
      </div>
    </div>
  );

  const renderTax = () => (
    <div className="tax-section">
      <h3>Tax Compliance</h3>
      
      <div className="tax-collection">
        <h4>Tax Collected by Jurisdiction</h4>
        <table className="tax-table">
          <thead>
            <tr>
              <th>Jurisdiction</th>
              <th>Tax Type</th>
              <th>Transactions</th>
              <th>Amount Collected</th>
            </tr>
          </thead>
          <tbody>
            {taxData.map((tax, index) => (
              <tr key={index}>
                <td>{tax.jurisdiction}</td>
                <td className="tax-type">{tax.tax_type.toUpperCase()}</td>
                <td>{tax.transaction_count}</td>
                <td className="amount">{formatCurrency(tax.total_collected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tax-actions">
        <button onClick={() => window.location.href = '/billing/tax/remittance'}>
          Generate Remittance Report
        </button>
        <button onClick={() => window.location.href = '/billing/tax/rates'}>
          Manage Tax Rates
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="enterprise-dashboard loading">
        <div className="spinner"></div>
        <p>Loading enterprise metrics...</p>
      </div>
    );
  }

  return (
    <div className="enterprise-dashboard">
      <div className="dashboard-header">
        <h1>Enterprise Billing Dashboard</h1>
        <div className="date-range-selector">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
          <button onClick={fetchDashboardData}>Refresh</button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'webhooks' ? 'active' : ''}
          onClick={() => setActiveTab('webhooks')}
        >
          Webhooks
        </button>
        <button 
          className={activeTab === 'dunning' ? 'active' : ''}
          onClick={() => setActiveTab('dunning')}
        >
          Dunning
        </button>
        <button 
          className={activeTab === 'multi-currency' ? 'active' : ''}
          onClick={() => setActiveTab('multi-currency')}
        >
          Multi-Currency
        </button>
        <button 
          className={activeTab === 'tax' ? 'active' : ''}
          onClick={() => setActiveTab('tax')}
        >
          Tax Compliance
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'webhooks' && renderWebhooks()}
        {activeTab === 'dunning' && renderDunning()}
        {activeTab === 'multi-currency' && renderMultiCurrency()}
        {activeTab === 'tax' && renderTax()}
      </div>
    </div>
  );
};
