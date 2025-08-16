import React, { useState, useEffect } from 'react';
import './HealthcareBillingDashboard.css';

export const HealthcareBillingDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  
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
          <button className="btn-primary">📊 Export Report</button>
          <button className="btn-secondary">⚙️ Settings</button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card revenue">
          <div className="metric-icon">��</div>
          <div className="metric-content">
            <h3>Total Revenue</h3>
            <p className="metric-value">{formatCurrency(metrics.totalRevenue)}</p>
            <span className="metric-trend positive">↑ 12.5% from last month</span>
          </div>
        </div>

        <div className="metric-card outstanding">
          <div className="metric-icon">⏳</div>
          <div className="metric-content">
            <h3>Outstanding Balance</h3>
            <p className="metric-value">{formatCurrency(metrics.outstandingBalance)}</p>
            <span className="metric-trend">Avg {metrics.averageDaysToPayment} days</span>
          </div>
        </div>

        <div className="metric-card collection">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>Collection Rate</h3>
            <p className="metric-value">{metrics.collectionRate}%</p>
            <span className="metric-trend positive">Industry avg: 89%</span>
          </div>
        </div>

        <div className="metric-card patients">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>Active Patients</h3>
            <p className="metric-value">{metrics.totalPatients.toLocaleString()}</p>
            <span className="metric-trend">+45 this month</span>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section insurance-claims">
          <h2>📋 Insurance Claims</h2>
          <div className="claims-summary">
            <div className="claim-stat">
              <span className="stat-label">Active Claims</span>
              <span className="stat-value active">{metrics.activeInsuranceClaims}</span>
            </div>
            <div className="claim-stat">
              <span className="stat-label">Denied Claims</span>
              <span className="stat-value denied">{metrics.deniedClaims}</span>
            </div>
            <div className="claim-stat">
              <span className="stat-label">Approval Rate</span>
              <span className="stat-value">87%</span>
            </div>
          </div>
          <button className="btn-link">View All Claims →</button>
        </div>

        <div className="section quick-actions">
          <h2>⚡ Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn">
              <span className="icon">🧾</span>
              <span>Create Invoice</span>
            </button>
            <button className="action-btn">
              <span className="icon">💳</span>
              <span>Process Payment</span>
            </button>
            <button className="action-btn">
              <span className="icon">📝</span>
              <span>Submit Claim</span>
            </button>
            <button className="action-btn">
              <span className="icon">✉️</span>
              <span>Send Statements</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
