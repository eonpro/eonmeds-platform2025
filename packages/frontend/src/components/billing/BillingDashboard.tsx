import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './BillingDashboard.css';

interface RevenueMetrics {
  total_revenue: number;
  recurring_revenue: number;
  one_time_revenue: number;
  refunds: number;
  net_revenue: number;
}

interface PlanRevenue {
  plan_name: string;
  revenue: number;
  subscriptions: number;
}

interface RevenueReport {
  period: {
    start: string;
    end: string;
  };
  metrics: RevenueMetrics;
  by_plan: PlanRevenue[];
  by_status: {
    succeeded: number;
    pending: number;
    failed: number;
  };
  currency: string;
}

interface MRRData {
  mrr: number;
  currency: string;
}

export const BillingDashboard: React.FC = () => {
  const apiClient = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [mrrData, setMrrData] = useState<MRRData | null>(null);
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
    setError(null);

    try {
      // Fetch revenue report
      const revenueResponse = await apiClient.get('/billing-system/reports/revenue', {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end
        }
      });
      setRevenueReport(revenueResponse.data.data);

      // Fetch MRR
      const mrrResponse = await apiClient.get('/billing-system/metrics/mrr');
      setMrrData(mrrResponse.data.data);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
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

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="billing-dashboard loading">
        <div className="spinner"></div>
        <p>Loading financial data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="billing-dashboard error">
        <p>Error: {error}</p>
        <button onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="billing-dashboard">
      <div className="dashboard-header">
        <h1>Financial Dashboard</h1>
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
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card mrr">
          <h3>Monthly Recurring Revenue</h3>
          <div className="metric-value">
            {mrrData ? formatCurrency(mrrData.mrr, mrrData.currency) : '$0.00'}
          </div>
          <div className="metric-label">Current MRR</div>
        </div>

        <div className="metric-card total-revenue">
          <h3>Total Revenue</h3>
          <div className="metric-value">
            {revenueReport ? formatCurrency(revenueReport.metrics.total_revenue, revenueReport.currency) : '$0.00'}
          </div>
          <div className="metric-period">
            {dateRange.start} to {dateRange.end}
          </div>
        </div>

        <div className="metric-card net-revenue">
          <h3>Net Revenue</h3>
          <div className="metric-value">
            {revenueReport ? formatCurrency(revenueReport.metrics.net_revenue, revenueReport.currency) : '$0.00'}
          </div>
          <div className="metric-detail">
            After {revenueReport ? formatCurrency(revenueReport.metrics.refunds, revenueReport.currency) : '$0.00'} in refunds
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      {revenueReport && (
        <>
          <div className="revenue-breakdown">
            <h2>Revenue Breakdown</h2>
            <div className="breakdown-grid">
              <div className="breakdown-item">
                <span className="label">Recurring Revenue</span>
                <span className="value">{formatCurrency(revenueReport.metrics.recurring_revenue, revenueReport.currency)}</span>
                <span className="percentage">{formatPercentage(revenueReport.metrics.recurring_revenue, revenueReport.metrics.total_revenue)}</span>
              </div>
              <div className="breakdown-item">
                <span className="label">One-Time Revenue</span>
                <span className="value">{formatCurrency(revenueReport.metrics.one_time_revenue, revenueReport.currency)}</span>
                <span className="percentage">{formatPercentage(revenueReport.metrics.one_time_revenue, revenueReport.metrics.total_revenue)}</span>
              </div>
            </div>
          </div>

          {/* Revenue by Plan */}
          {revenueReport.by_plan.length > 0 && (
            <div className="revenue-by-plan">
              <h2>Revenue by Plan</h2>
              <table>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Subscriptions</th>
                    <th>Revenue</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueReport.by_plan.map((plan, index) => (
                    <tr key={index}>
                      <td>{plan.plan_name}</td>
                      <td>{plan.subscriptions}</td>
                      <td>{formatCurrency(plan.revenue, revenueReport.currency)}</td>
                      <td>{formatPercentage(plan.revenue, revenueReport.metrics.recurring_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payment Status */}
          <div className="payment-status">
            <h2>Payment Status</h2>
            <div className="status-grid">
              <div className="status-item succeeded">
                <div className="status-label">Succeeded</div>
                <div className="status-value">{formatCurrency(revenueReport.by_status.succeeded, revenueReport.currency)}</div>
              </div>
              <div className="status-item pending">
                <div className="status-label">Pending</div>
                <div className="status-value">{formatCurrency(revenueReport.by_status.pending, revenueReport.currency)}</div>
              </div>
              <div className="status-item failed">
                <div className="status-label">Failed</div>
                <div className="status-value">{formatCurrency(revenueReport.by_status.failed, revenueReport.currency)}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button onClick={() => window.location.href = '/billing/plans'}>
            Manage Plans
          </button>
          <button onClick={() => window.location.href = '/billing/subscriptions'}>
            View Subscriptions
          </button>
          <button onClick={() => window.location.href = '/billing/transactions'}>
            Transaction History
          </button>
          <button onClick={fetchDashboardData}>
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};
