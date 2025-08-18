import React from 'react';

export const BillingDebugPage: React.FC = () => {
  console.log('🚨 BillingDebugPage is rendering!');
  
  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'red',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '48px',
      zIndex: 9999
    }}>
      <h1>🚨 BILLING DEBUG PAGE 🚨</h1>
      <p>This is outside of AppLayout!</p>
      <p style={{ fontSize: '24px' }}>Path: {window.location.pathname}</p>
      <button 
        onClick={() => window.location.href = '/dashboard'}
        style={{ 
          padding: '20px 40px', 
          fontSize: '24px', 
          marginTop: '20px',
          cursor: 'pointer'
        }}
      >
        Go to Dashboard
      </button>
    </div>
  );
};
