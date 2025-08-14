# Financial Dashboard - Frontend Implementation

## Overview
A comprehensive financial dashboard for admins to view Stripe payment data, customer analytics, and revenue trends.

## React Component Example

```tsx
// FinancialDashboard.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface DashboardData {
  payments: {
    total: number;
    succeeded: number;
    failed: number;
    refunded: number;
    totalAmount: number;
  };
  volume: {
    gross: number;
    net: number;
    previousMonth: number;
    percentageChange: number;
  };
  customers: {
    total: number;
    new: number;
    withPaymentMethods: number;
  };
  recentPayments: Array<any>;
  failedPayments: Array<any>;
  topCustomers: Array<any>;
  paymentMethods: {
    card: number;
    other: number;
  };
}

export const FinancialDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ days: 30 });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
    fetchChartData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/api/v1/financial-dashboard/overview', {
        params: dateRange,
      });
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await apiClient.get('/api/v1/financial-dashboard/revenue-chart', {
        params: { days: dateRange.days },
      });
      setChartData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
  };

  if (loading) return <div className="loading">Loading financial data...</div>;
  if (!data) return <div className="error">Failed to load dashboard</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const paymentStatusData = [
    { name: 'Succeeded', value: data.payments.succeeded, color: '#10b981' },
    { name: 'Failed', value: data.payments.failed, color: '#ef4444' },
    { name: 'Refunded', value: data.payments.refunded, color: '#f59e0b' },
  ];

  return (
    <div className="financial-dashboard">
      <div className="dashboard-header">
        <h1>Financial Dashboard</h1>
        <div className="date-selector">
          <select 
            value={dateRange.days} 
            onChange={(e) => setDateRange({ days: Number(e.target.value) })}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Gross Volume</h3>
          <div className="metric-value">{formatCurrency(data.volume.gross)}</div>
          <div className={`metric-change ${data.volume.percentageChange >= 0 ? 'positive' : 'negative'}`}>
            {data.volume.percentageChange >= 0 ? '↑' : '↓'} {Math.abs(data.volume.percentageChange)}%
            <span className="metric-label">vs previous period</span>
          </div>
        </div>

        <div className="metric-card">
          <h3>Net Revenue</h3>
          <div className="metric-value">{formatCurrency(data.volume.net)}</div>
          <div className="metric-sublabel">After refunds</div>
        </div>

        <div className="metric-card">
          <h3>Total Customers</h3>
          <div className="metric-value">{data.customers.total}</div>
          <div className="metric-sublabel">
            {data.customers.new} new this period
          </div>
        </div>

        <div className="metric-card">
          <h3>Success Rate</h3>
          <div className="metric-value">
            {((data.payments.succeeded / data.payments.total) * 100).toFixed(1)}%
          </div>
          <div className="metric-sublabel">
            {data.payments.succeeded} of {data.payments.total} payments
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'payments' ? 'active' : ''}
          onClick={() => setActiveTab('payments')}
        >
          Payments
        </button>
        <button 
          className={activeTab === 'customers' ? 'active' : ''}
          onClick={() => setActiveTab('customers')}
        >
          Customers
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <>
            {/* Revenue Chart */}
            <div className="chart-section">
              <h3>Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Status Breakdown */}
            <div className="charts-row">
              <div className="chart-section half">
                <h3>Payment Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="legend">
                  {paymentStatusData.map((item) => (
                    <div key={item.name} className="legend-item">
                      <span 
                        className="legend-color" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Customers */}
              <div className="chart-section half">
                <h3>Top Customers by Revenue</h3>
                <div className="top-customers-list">
                  {data.topCustomers.map((customer, index) => (
                    <div key={customer.id} className="customer-item">
                      <div className="customer-rank">#{index + 1}</div>
                      <div className="customer-info">
                        <div className="customer-name">{customer.name}</div>
                        <div className="customer-email">{customer.email}</div>
                      </div>
                      <div className="customer-value">
                        {formatCurrency(customer.totalSpent)}
                        <span className="payment-count">
                          {customer.paymentCount} payments
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'payments' && (
          <PaymentsTab data={data} />
        )}

        {activeTab === 'customers' && (
          <CustomersTab />
        )}
      </div>
    </div>
  );
};

// Payments Tab Component
const PaymentsTab: React.FC<{ data: DashboardData }> = ({ data }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await apiClient.get('/api/v1/financial-dashboard/payments');
      setPayments(response.data.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading payments...</div>;

  return (
    <div className="payments-tab">
      <h3>Recent Payments</h3>
      <table className="payments-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Payment Method</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td>{new Date(payment.created).toLocaleDateString()}</td>
              <td>{formatCurrency(payment.amount)}</td>
              <td>
                <div>{payment.customer.name || 'Unknown'}</div>
                <div className="text-small">{payment.customer.email}</div>
              </td>
              <td>
                <span className={`status-badge status-${payment.status}`}>
                  {payment.status}
                </span>
              </td>
              <td>
                {payment.payment_method.brand} •••• {payment.payment_method.last4}
              </td>
              <td>{payment.description || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Failed Payments Section */}
      {data.failedPayments.length > 0 && (
        <div className="failed-payments">
          <h3>Failed Payments</h3>
          <div className="failed-list">
            {data.failedPayments.map((payment) => (
              <div key={payment.id} className="failed-item">
                <div className="failed-info">
                  <div className="failed-amount">{formatCurrency(payment.amount)}</div>
                  <div className="failed-customer">{payment.customerEmail}</div>
                  <div className="failed-date">
                    {new Date(payment.created).toLocaleDateString()}
                  </div>
                </div>
                <div className="failed-reason">{payment.failureReason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
```

## CSS Styling

```css
/* FinancialDashboard.css */

.financial-dashboard {
  padding: 20px;
  background: #f9fafb;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.dashboard-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.date-selector select {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 14px;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metric-card h3 {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.metric-change {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.metric-change.positive {
  color: #10b981;
}

.metric-change.negative {
  color: #ef4444;
}

.metric-label {
  color: #6b7280;
  margin-left: 4px;
}

.metric-sublabel {
  font-size: 14px;
  color: #6b7280;
}

/* Tabs */
.dashboard-tabs {
  display: flex;
  gap: 20px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 30px;
}

.dashboard-tabs button {
  padding: 12px 24px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.dashboard-tabs button:hover {
  color: #111827;
}

.dashboard-tabs button.active {
  color: #3b82f6;
}

.dashboard-tabs button.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #3b82f6;
}

/* Charts */
.chart-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.chart-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 20px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-section.half {
  margin-bottom: 0;
}

/* Legend */
.legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #4b5563;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

/* Top Customers */
.top-customers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.customer-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.customer-rank {
  font-size: 18px;
  font-weight: 700;
  color: #6b7280;
  width: 30px;
}

.customer-info {
  flex: 1;
}

.customer-name {
  font-weight: 600;
  color: #111827;
}

.customer-email {
  font-size: 14px;
  color: #6b7280;
}

.customer-value {
  text-align: right;
}

.customer-value {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.payment-count {
  display: block;
  font-size: 14px;
  font-weight: 400;
  color: #6b7280;
}

/* Tables */
.payments-table {
  width: 100%;
  border-collapse: collapse;
}

.payments-table th {
  text-align: left;
  padding: 12px;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 2px solid #e5e7eb;
}

.payments-table td {
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.text-small {
  font-size: 14px;
  color: #6b7280;
}

/* Status Badges */
.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.status-succeeded {
  background: #d1fae5;
  color: #065f46;
}

.status-processing {
  background: #dbeafe;
  color: #1e40af;
}

.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

/* Failed Payments */
.failed-payments {
  margin-top: 40px;
}

.failed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.failed-item {
  display: flex;
  justify-content: space-between;
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.failed-info {
  display: flex;
  gap: 20px;
  align-items: center;
}

.failed-amount {
  font-size: 18px;
  font-weight: 700;
  color: #dc2626;
}

.failed-reason {
  font-size: 14px;
  color: #7f1d1d;
}

/* Loading & Error States */
.loading, .error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  font-size: 18px;
  color: #6b7280;
}

.error {
  color: #ef4444;
}

/* Responsive */
@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .dashboard-tabs {
    overflow-x: auto;
  }
  
  .payments-table {
    font-size: 14px;
  }
}
```

## API Endpoints

The financial dashboard uses these endpoints:

### Overview Data
- `GET /api/v1/financial-dashboard/overview`
  - Query params: `startDate`, `endDate` (optional)
  - Returns: Payment metrics, volume, customer stats

### Revenue Chart
- `GET /api/v1/financial-dashboard/revenue-chart`
  - Query params: `days` (7, 30, 90, 365), `interval` (daily, weekly, monthly)
  - Returns: Time series revenue data

### Payments List
- `GET /api/v1/financial-dashboard/payments`
  - Query params: `status`, `limit`
  - Returns: Detailed payment list with customer info

### Customer Analytics
- `GET /api/v1/financial-dashboard/customers`
  - Query params: `limit`, `hasPaymentMethod`
  - Returns: Customer list with lifetime value

### Subscription Metrics
- `GET /api/v1/financial-dashboard/subscriptions`
  - Returns: MRR, churn rate, active subscriptions

## Security

All financial dashboard endpoints require admin authentication:
- Include JWT token in Authorization header
- User must have `admin` or `superadmin` role
- Implement proper RBAC in your auth system

## Dependencies

```json
{
  "dependencies": {
    "recharts": "^2.5.0",
    "axios": "^1.3.0",
    "react": "^18.2.0"
  }
}
```
