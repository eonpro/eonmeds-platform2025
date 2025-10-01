import React from 'react';
import './HealthcareBillingDashboard.css';

export const SimpleBillingDashboard: React.FC = () => {
  return (
    <div className="healthcare-billing-dashboard">
      <div className="dashboard-header">
        <h1>💰 Healthcare Billing Dashboard</h1>
        <p>Welcome to your billing center!</p>
      </div>
      
      <div className="metrics-grid">
        <div className="metric-card revenue">
          <h3>Total Revenue</h3>
          <p className="metric-value">$847,250.00</p>
        </div>
        
        <div className="metric-card outstanding">
          <h3>Outstanding Balance</h3>
          <p className="metric-value">$124,300.00</p>
        </div>
        
        <div className="metric-card collection">
          <h3>Collection Rate</h3>
          <p className="metric-value">94.5%</p>
        </div>
        
        <div className="metric-card payment-time">
          <h3>Avg. Days to Payment</h3>
          <p className="metric-value">18 days</p>
        </div>
      </div>
    </div>
  );
};
