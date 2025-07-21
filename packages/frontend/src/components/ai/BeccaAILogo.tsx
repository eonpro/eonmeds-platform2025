import React from 'react';

const BeccaAILogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 200 40" 
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text x="0" y="30" fontFamily="Poppins, sans-serif" fontSize="32" fontWeight="600">
        Becca<tspan fontSize="24" fontWeight="400">AI</tspan>
      </text>
    </svg>
  );
};

export default BeccaAILogo; 