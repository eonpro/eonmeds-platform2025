import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import './FinancialDashboard.css';

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
  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    customerEmail: string;
    customerName: string;
    created: Date;
    description: string;
  }>;
  failedPayments: Array<{
    id: string;
    amount: number;
    customerEmail: string;
    failureReason: string;
    created: Date;
  }>;
  topCustomers: Array<{
    id: string;
    email: string;
    name: string;
    totalSpent: number;
    paymentCount: number;
  }>;
  paymentMethods: {
    card: number;
    other: number;
  };
}

interface ChartData {
  date: string;
  amount: number;
}

export const FinancialDashboard: React.FC = () => {
  const apiClient = useApi();
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ days: 30 });
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchChartData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const response = await apiClient.get('/api/v1/financial-dashboard/overview', {
        params: dateRange,
      });
      setData(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error.response?.data?.message || 'Failed to load dashboard data');
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

  if (loading) {
    return <div className="loading">Loading financial data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!data) {
    return <div className="error">No data available</div>;
  }

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
            {data.payments.total > 0 
              ? ((data.payments.succeeded / data.payments.total) * 100).toFixed(1) 
              : '0.0'}%
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
          <PaymentsTab data={data} apiClient={apiClient} />
        )}

        {activeTab === 'customers' && (
          <CustomersTab apiClient={apiClient} />
        )}
      </div>
    </div>
  );
};

// Payments Tab Component
const PaymentsTab: React.FC<{ data: DashboardData; apiClient: any }> = ({ data, apiClient }) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
                {payment.payment_method.type === 'card' 
                  ? `${payment.payment_method.brand} •••• ${payment.payment_method.last4}`
                  : payment.payment_method.type || '-'
                }
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

// Customers Tab Component
const CustomersTab: React.FC<{ apiClient: any }> = ({ apiClient }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/api/v1/financial-dashboard/customers');
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) return <div>Loading customers...</div>;

  return (
    <div className="customers-tab">
      <h3>Customer Analytics</h3>
      <table className="customers-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Created</th>
            <th>Lifetime Value</th>
            <th>Total Payments</th>
            <th>Payment Methods</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <div>{customer.name || 'Unknown'}</div>
                <div className="text-small">{customer.email}</div>
              </td>
              <td>{new Date(customer.created).toLocaleDateString()}</td>
              <td>{formatCurrency(customer.lifetime_value)}</td>
              <td>{customer.total_payments}</td>
              <td>
                {customer.payment_methods.length > 0 ? (
                  <div className="payment-methods">
                    {customer.payment_methods.map((pm: any) => (
                      <div key={pm.id} className="payment-method-item">
                        {pm.brand} •••• {pm.last4}
                        {pm.is_default && <span className="default-badge">Default</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-small">No payment methods</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
