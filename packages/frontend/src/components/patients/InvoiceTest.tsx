import React from 'react';

export const InvoiceTest: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#FFE4B5', 
      border: '2px solid #FF6347',
      borderRadius: '8px', 
      margin: '10px',
      textAlign: 'center'
    }}>
      <h2 style={{ color: '#FF6347' }}>🚨 INVOICE SYSTEM UPDATE ACTIVE 🚨</h2>
      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
        If you can see this box, the frontend has updated!
      </p>
      <button 
        style={{
          backgroundColor: '#FF6347',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          marginTop: '10px'
        }}
        onClick={() => alert('Frontend is working! Payment system ready.')}
      >
        💳 Click to Test Frontend
      </button>
      <div style={{ marginTop: '10px', fontSize: '12px' }}>
        <strong>Deployment Time:</strong> {new Date().toISOString()}
      </div>
    </div>
  );
};