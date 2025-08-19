import React from 'react';

export const TestBillingDebug: React.FC = () => {
  console.log('TestBillingDebug component is rendering!');
  
  return (
    <div style={{ padding: '50px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: 'red', fontSize: '48px' }}>🚨 BILLING PAGE IS WORKING! 🚨</h1>
      <p style={{ fontSize: '24px' }}>If you can see this, the routing is working correctly.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2>Debug Info:</h2>
        <p>Component: TestBillingDebug</p>
        <p>Path: /billing</p>
        <p>Status: RENDERED</p>
      </div>
    </div>
  );
};
