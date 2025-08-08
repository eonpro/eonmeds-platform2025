import React from 'react';

const BeccaAILogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '32px', color: '#333' }}>
        <span style={{ fontWeight: 450 }}>Becca.</span>
        <span style={{ fontWeight: 550 }}>AI</span>
      </span>
    </div>
  );
};

export default BeccaAILogo; 