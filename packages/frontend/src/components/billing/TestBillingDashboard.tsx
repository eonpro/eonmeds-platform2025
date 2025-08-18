import React from 'react';

export const TestBillingDashboard: React.FC = () => {
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', minHeight: '500px' }}>
      <h1>🎯 Test Billing Dashboard</h1>
      <p>If you can see this, the route is working!</p>
      <div style={{ marginTop: '20px', padding: '20px', background: 'white', borderRadius: '8px' }}>
        <h2>Debug Info:</h2>
        <ul>
          <li>Component: TestBillingDashboard</li>
          <li>Route: /billing</li>
          <li>Time: {new Date().toLocaleString()}</li>
        </ul>
      </div>
    </div>
  );
};
