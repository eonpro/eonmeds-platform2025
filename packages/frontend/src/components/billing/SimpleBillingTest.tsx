import React from 'react';

export const SimpleBillingTest: React.FC = () => {
  return (
    <div style={{ 
      padding: '40px', 
      background: '#ff0000', 
      color: 'white',
      fontSize: '24px',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999
    }}>
      <h1>🚨 SIMPLE BILLING TEST - NO AUTH</h1>
      <p>This page should be visible WITHOUT any authentication!</p>
      <p>URL: {window.location.href}</p>
      <p>Time: {new Date().toISOString()}</p>
      <p style={{ marginTop: '20px', background: 'black', padding: '10px' }}>
        If you see this RED page, the routing is working!
      </p>
    </div>
  );
};
