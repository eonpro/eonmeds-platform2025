import React from 'react';

interface LogoProps {
  height?: number;
  className?: string;
  variant?: 'default' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ 
  height = 40, 
  className = '', 
  variant = 'default' 
}) => {
  return (
    <img 
      src="https://static.wixstatic.com/shapes/c49a9b_5fd302ab673e48be9489f00b87d2d8ca.svg"
      alt="EONMeds"
      height={height}
      className={`logo ${className}`}
      style={{ height: `${height}px`, width: 'auto' }}
    />
  );
}; 