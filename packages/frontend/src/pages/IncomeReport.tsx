import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import './IncomeReport.css';

interface PaymentData {
  id: string;
  patient_name: string;
  patient_id: string;
  invoice_number: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: string;
  stripe_payment_id?: string;
  offline_reference?: string;
}

interface IncomeStats {
  total_revenue: number;
  stripe_payments: number;
  offline_payments: number;
  refunds: number;
  pending_payments: number;
  payment_count: number;
}

export const IncomeReport: React.FC = () => {
  const apiClient = useApi();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [stats, setStats] = useState<IncomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [filterMethod, setFilterMethod] = useState('all');

  useEffect(() => {
    fetchIncomeData();
  }, [dateRange, filterMethod]);

  const fetchIncomeData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/payments/income-report', {
        params: {
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          payment_method: filterMethod,
        },
      });

      setPayments(response.data.payments || []);
      setStats(response.data.stats || null);
    } catch (error) {
      console.error('Error fetching income data:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Patient', 'Invoice #', 'Amount', 'Method', 'Status', 'Reference'];
    const rows = payments.map((payment) => [
      formatDate(payment.payment_date),
      payment.patient_name,
      payment.invoice_number,
      payment.amount.toFixed(2),
      payment.payment_method,
      payment.status,
      payment.stripe_payment_id || payment.offline_reference || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="income-report-page">
      <div className="page-header">
        <h1>Income Report</h1>
        <div className="header-actions">
          <button className="export-btn" onClick={exportToCSV}>
            📥 Export CSV
          </button>
          <button className="print-btn" onClick={handlePrint}>
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="date-filters">
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Payment Method</label>
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
            <option value="all">All Payments</option>
            <option value="stripe">Stripe Payments</option>
            <option value="offline">Offline Payments</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading income data...</div>
      ) : (
        <>
          {stats && (
            <div className="income-stats">
              <div className="stat-card primary">
                <h3>Total Revenue</h3>
                <p className="stat-value">{formatCurrency(stats.total_revenue)}</p>
                <span className="stat-detail">{stats.payment_count} payments</span>
              </div>

              <div className="stat-card">
                <h3>Stripe Payments</h3>
                <p className="stat-value">{formatCurrency(stats.stripe_payments)}</p>
              </div>

              <div className="stat-card">
                <h3>Offline Payments</h3>
                <p className="stat-value">{formatCurrency(stats.offline_payments)}</p>
              </div>

              <div className="stat-card negative">
                <h3>Refunds</h3>
                <p className="stat-value">{formatCurrency(stats.refunds)}</p>
              </div>

              <div className="stat-card warning">
                <h3>Pending</h3>
                <p className="stat-value">{formatCurrency(stats.pending_payments)}</p>
              </div>
            </div>
          )}

          <div className="payments-table-section">
            <h2>Payment Details</h2>

            {payments.length === 0 ? (
              <div className="empty-state">
                <p>No payments found for the selected period.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Invoice #</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>
                          <a href={`/patients/${payment.patient_id}`} className="patient-link">
                            {payment.patient_name}
                          </a>
                        </td>
                        <td className="invoice-number">{payment.invoice_number}</td>
                        <td className="amount">{formatCurrency(payment.amount)}</td>
                        <td>
                          <span className={`method-badge ${payment.payment_method}`}>
                            {payment.payment_method === 'stripe' ? '💳' : '💵'}{' '}
                            {payment.payment_method}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${payment.status}`}>{payment.status}</span>
                        </td>
                        <td className="reference">
                          {payment.stripe_payment_id ? (
                            <span className="stripe-ref" title={payment.stripe_payment_id}>
                              {payment.stripe_payment_id.substring(0, 12)}...
                            </span>
                          ) : payment.offline_reference ? (
                            <span className="offline-ref">{payment.offline_reference}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
