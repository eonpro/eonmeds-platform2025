import React from 'react';

interface LogoProps {
  height?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ height = 40, className = '' }) => {
  return (
    <img
      src="https://static.wixstatic.com/shapes/c49a9b_5fd302ab673e48be9489f00b87d2d8ca.svg"
      alt="EONMeds"
      style={{ 
        height: `${height}px`, 
        width: 'auto',
        display: 'block'
      }}
      className={className}
      onError={(e) => {
        console.error('Logo failed to load');
        // Fallback to text if image fails
        e.currentTarget.style.display = 'none';
        e.currentTarget.insertAdjacentHTML('afterend', '<div style="font-weight: bold; font-size: 24px; color: var(--color-primary-teal);">EONMeds</div>');
      }}
    />
  );
}; 