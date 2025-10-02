import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './PaymentMonitoringDashboard.css';

interface PaymentMetrics {
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  averagePaymentAmount: number;
  paymentSuccessRate: number;
  refundTotal: number;
  chargebackTotal: number;
}

interface PaymentTrend {
  date: string;
  successful: number;
  failed: number;
  amount: number;
}

export const PaymentMonitoringDashboard: React.FC = () => {
  const apiClient = useApi();
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [trends, setTrends] = useState<PaymentTrend[]>([]);
  const [recentFailures, setRecentFailures] = useState<any[]>([]);
  const [retryQueue, setRetryQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [timeRange, refreshInterval]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsRes, trendsRes, failuresRes, retryRes] = await Promise.all([
        apiClient.get(`/api/v1/monitoring/payment-metrics?range=${timeRange}`),
        apiClient.get(`/api/v1/monitoring/payment-trends?range=${timeRange}`),
        apiClient.get('/api/v1/monitoring/recent-failures?limit=10'),
        apiClient.get('/api/v1/monitoring/retry-queue')
      ]);

      setMetrics(metricsRes.data);
      setTrends(trendsRes.data);
      setRecentFailures(failuresRes.data);
      setRetryQueue(retryRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

  const paymentStatusData = metrics ? [
    { name: 'Successful', value: metrics.successfulPayments, color: '#10b981' },
    { name: 'Failed', value: metrics.failedPayments, color: '#ef4444' },
    { name: 'Pending', value: metrics.pendingPayments, color: '#f59e0b' }
  ] : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !metrics) {
    return <div className="loading">Loading payment monitoring data...</div>;
  }

  return (
    <div className="payment-monitoring-dashboard">
      <div className="dashboard-header">
        <h1>Payment Monitoring Dashboard</h1>
        <div className="header-controls">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-selector"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <select 
            value={refreshInterval} 
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="refresh-selector"
          >
            <option value="30000">Refresh: 30s</option>
            <option value="60000">Refresh: 1m</option>
            <option value="300000">Refresh: 5m</option>
            <option value="0">Manual Only</option>
          </select>
          <button onClick={loadDashboardData} className="refresh-btn">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Revenue</h3>
          <div className="metric-value">{formatCurrency(metrics?.totalRevenue || 0)}</div>
          <div className="metric-label">All time</div>
        </div>
        <div className="metric-card">
          <h3>Success Rate</h3>
          <div className="metric-value">{(metrics?.paymentSuccessRate || 0).toFixed(1)}%</div>
          <div className="metric-label">Payment success rate</div>
        </div>
        <div className="metric-card">
          <h3>Average Payment</h3>
          <div className="metric-value">{formatCurrency(metrics?.averagePaymentAmount || 0)}</div>
          <div className="metric-label">Per transaction</div>
        </div>
        <div className="metric-card alert">
          <h3>Failed Payments</h3>
          <div className="metric-value">{metrics?.failedPayments || 0}</div>
          <div className="metric-label">Requires attention</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Payment Trends */}
        <div className="chart-card">
          <h3>Payment Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="successful" stroke="#10b981" name="Successful" />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status Distribution */}
        <div className="chart-card">
          <h3>Payment Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="tables-row">
        {/* Recent Failures */}
        <div className="table-card">
          <h3>Recent Payment Failures</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Error</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentFailures.map((failure) => (
                  <tr key={failure.id}>
                    <td>{failure.invoice_number}</td>
                    <td>{formatCurrency(failure.amount)}</td>
                    <td className="error-cell">{failure.error_message}</td>
                    <td>{new Date(failure.created_at).toLocaleString()}</td>
                    <td>
                      <button className="retry-btn" onClick={() => retryPayment(failure.invoice_id)}>
                        Retry
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Retry Queue */}
        <div className="table-card">
          <h3>Payment Retry Queue</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Attempts</th>
                  <th>Next Retry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {retryQueue.map((retry) => (
                  <tr key={retry.id}>
                    <td>{retry.invoice_number}</td>
                    <td>{formatCurrency(retry.amount)}</td>
                    <td>{retry.attempt_number}/{retry.max_attempts}</td>
                    <td>{new Date(retry.retry_at).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${retry.status}`}>
                        {retry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  async function retryPayment(invoiceId: string) {
    try {
      await apiClient.post(`/api/v1/payments/invoice/${invoiceId}/retry`);
      loadDashboardData();
    } catch (error) {
      console.error('Error retrying payment:', error);
    }
  }
};
