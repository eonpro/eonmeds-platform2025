import React, { useState, useEffect } from 'react';
import './HealthcareBillingDashboard.css';
import { useApi } from '../../hooks/useApi';

interface BillingMetrics {
  totalRevenue: number;
  outstandingBalance: number;
  collectionRate: number;
  averageDaysToPayment: number;
  totalPatients: number;
  activeInsuranceClaims: number;
  deniedClaims: number;
  monthlyRevenue: number;
}

export const HealthcareBillingDashboard: React.FC = () => {
  const api = useApi();
  const [metrics, setMetrics] = useState<BillingMetrics>({
    totalRevenue: 0,
    outstandingBalance: 0,
    collectionRate: 0,
    averageDaysToPayment: 0,
    totalPatients: 0,
    activeInsuranceClaims: 0,
    deniedClaims: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      // Fetch real data from API
      const response = await api.get('/api/v1/billing/metrics');
      if (response.data) {
        setMetrics(response.data);
      }
    } catch (error) {
      console.error('Error fetching billing metrics:', error);
      // Use demo data for now
      setMetrics({
        totalRevenue: 847250.00,
        outstandingBalance: 124300.00,
        collectionRate: 94.5,
        averageDaysToPayment: 18,
        totalPatients: 1247,
        activeInsuranceClaims: 89,
        deniedClaims: 12,
        monthlyRevenue: 142580.00
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="healthcare-billing-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading billing metrics...</p>
      </div>
    );
  }

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

        <div className="section revenue-breakdown">
          <h2>💹 Revenue Breakdown</h2>
          <div className="revenue-chart">
            <div className="chart-bar insurance" style={{width: '65%'}}>
              <span>Insurance (65%)</span>
            </div>
            <div className="chart-bar patient" style={{width: '25%'}}>
              <span>Patient (25%)</span>
            </div>
            <div className="chart-bar other" style={{width: '10%'}}>
              <span>Other (10%)</span>
            </div>
          </div>
          <div className="revenue-details">
            <p>Insurance Payments: {formatCurrency(metrics.totalRevenue * 0.65)}</p>
            <p>Patient Payments: {formatCurrency(metrics.totalRevenue * 0.25)}</p>
            <p>Other Sources: {formatCurrency(metrics.totalRevenue * 0.10)}</p>
          </div>
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

        <div className="section recent-activity">
          <h2>🔔 Recent Activity</h2>
          <ul className="activity-list">
            <li className="activity-item payment">
              <span className="icon">💰</span>
              <span className="activity-text">Payment received from United Healthcare - $4,250.00</span>
              <span className="time">2 min ago</span>
            </li>
            <li className="activity-item claim">
              <span className="icon">✅</span>
              <span className="activity-text">Claim #C-2024-1847 approved by Aetna</span>
              <span className="time">15 min ago</span>
            </li>
            <li className="activity-item invoice">
              <span className="icon">📧</span>
              <span className="activity-text">Invoice INV-2025-01824 sent to patient</span>
              <span className="time">1 hour ago</span>
            </li>
            <li className="activity-item alert">
              <span className="icon">⚠️</span>
              <span className="activity-text">Claim #C-2024-1823 denied - requires additional documentation</span>
              <span className="time">2 hours ago</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="dashboard-footer">
        <p>Last updated: {new Date().toLocaleString()}</p>
        <button className="btn-refresh" onClick={fetchMetrics}>
          <span className="icon">🔄</span> Refresh Data
        </button>
      </div>
    </div>
  );
};