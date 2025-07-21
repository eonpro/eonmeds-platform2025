import React from 'react';

const BeccaAILogo: React.FC<{ className?: string }> = ({ className }) => {
  // Using the actual Becca logo from your image
  return (
    <div className={className}>
      <svg viewBox="0 0 300 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="40" fontFamily="Arial, sans-serif" fontSize="48" fontWeight="900" fill="black">
          Becca
        </text>
        <text x="180" y="40" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="300" fill="black">
          AI
        </text>
      </svg>
    </div>
  );
};

export default BeccaAILogo; 