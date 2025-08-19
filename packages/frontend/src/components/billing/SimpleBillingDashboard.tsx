import React from 'react';
import './HealthcareBillingDashboard.css';

export const SimpleBillingDashboard: React.FC = () => {
  // Static demo data - no API calls
  const metrics = {
    totalRevenue: 847250.00,
    outstandingBalance: 124300.00,
    collectionRate: 94.5,
    averageDaysToPayment: 18,
    totalPatients: 1247,
    activeInsuranceClaims: 89,
    deniedClaims: 12,
    monthlyRevenue: 142580.00
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="healthcare-billing-dashboard">
      <div className="dashboard-header">
        <h1>💰 Healthcare Billing Dashboard</h1>
        <div className="header-actions">
          <button className="btn-primary">
            <span className="icon">📊</span> Export Report
          </button>
          <button className="btn-secondary">
            <span className="icon">⚙️</span> Settings
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card revenue">
          <div className="metric-icon">💵</div>
          <div className="metric-content">
            <h3>Total Revenue</h3>
            <p className="metric-value">{formatCurrency(metrics.totalRevenue)}</p>
            <span className="metric-trend positive">↑ 12.5% from last month</span>
          </div>
        </div>

        <div className="metric-card outstanding">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <h3>Outstanding Balance</h3>
            <p className="metric-value">{formatCurrency(metrics.outstandingBalance)}</p>
            <span className="metric-trend negative">↑ 3.2% from last month</span>
          </div>
        </div>

        <div className="metric-card collection">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>Collection Rate</h3>
            <p className="metric-value">{metrics.collectionRate}%</p>
            <span className="metric-trend positive">↑ 2.1% improvement</span>
          </div>
        </div>

        <div className="metric-card payment-time">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h3>Avg. Days to Payment</h3>
            <p className="metric-value">{metrics.averageDaysToPayment} days</p>
            <span className="metric-trend positive">↓ 3 days faster</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section insurance-overview">
          <h2>🏥 Insurance Claims Overview</h2>
          <div className="insurance-stats">
            <div className="stat-item">
              <span className="stat-label">Active Claims</span>
              <span className="stat-value">{metrics.activeInsuranceClaims}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Denied Claims</span>
              <span className="stat-value denied">{metrics.deniedClaims}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Approval Rate</span>
              <span className="stat-value">86.5%</span>
            </div>
          </div>
          <div className="claim-status-chart">
            <div className="chart-placeholder">
              <p>📈 Claim Status Distribution</p>
              <div className="demo-chart">
                <div className="chart-bar approved" style={{height: '70%'}}>Approved</div>
                <div className="chart-bar pending" style={{height: '20%'}}>Pending</div>
                <div className="chart-bar denied" style={{height: '10%'}}>Denied</div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section recent-activity">
          <h2>🔔 Recent Billing Activity</h2>
          <div className="activity-list">
            <div className="activity-item payment">
              <span className="activity-icon">💳</span>
              <div className="activity-details">
                <p className="activity-title">Payment Received - Patient #1234</p>
                <p className="activity-time">2 minutes ago</p>
              </div>
              <span className="activity-amount">+$250.00</span>
            </div>
            <div className="activity-item claim">
              <span className="activity-icon">✅</span>
              <div className="activity-details">
                <p className="activity-title">Insurance Claim Approved - BCBS</p>
                <p className="activity-time">15 minutes ago</p>
              </div>
              <span className="activity-amount">+$1,200.00</span>
            </div>
            <div className="activity-item invoice">
              <span className="activity-icon">📄</span>
              <div className="activity-details">
                <p className="activity-title">Invoice Sent - Patient #5678</p>
                <p className="activity-time">1 hour ago</p>
              </div>
              <span className="activity-amount">$450.00</span>
            </div>
          </div>
        </div>

        <div className="dashboard-section revenue-chart">
          <h2>📊 Monthly Revenue Trend</h2>
          <div className="chart-placeholder">
            <p>Revenue Overview - Last 6 Months</p>
            <div className="demo-revenue-chart">
              <div className="revenue-bar" style={{height: '60%'}}>Jan</div>
              <div className="revenue-bar" style={{height: '65%'}}>Feb</div>
              <div className="revenue-bar" style={{height: '70%'}}>Mar</div>
              <div className="revenue-bar" style={{height: '75%'}}>Apr</div>
              <div className="revenue-bar" style={{height: '80%'}}>May</div>
              <div className="revenue-bar" style={{height: '85%'}}>Jun</div>
            </div>
          </div>
        </div>

        <div className="dashboard-section quick-actions">
          <h2>⚡ Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn">
              <span className="icon">📄</span>
              <span>Create Invoice</span>
            </button>
            <button className="action-btn">
              <span className="icon">💳</span>
              <span>Process Payment</span>
            </button>
            <button className="action-btn">
              <span className="icon">🏥</span>
              <span>Submit Claim</span>
            </button>
            <button className="action-btn">
              <span className="icon">📊</span>
              <span>View Reports</span>
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-footer">
        <p>💡 <strong>Pro Tip:</strong> Set up automatic payment reminders to improve your collection rate by up to 15%</p>
      </div>
    </div>
  );
};
