import React from 'react';

interface QuickPayButtonProps {
  invoice: any;
  onPay: () => void;
}

export const QuickPayButton: React.FC<QuickPayButtonProps> = ({ invoice, onPay }) => {
  if (invoice.status === 'paid') {
    return <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Paid</span>;
  }

  return (
    <button
      onClick={onPay}
      style={{
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      💳 Pay ${invoice.total_amount || invoice.amount || 0}
    </button>
  );
};
