import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({
  size = 'medium',
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 64,
  };

  const spinnerSize = sizeMap[size];

  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
    >
      <div
        style={{
          width: `${spinnerSize}px`,
          height: `${spinnerSize}px`,
          border: '3px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>
        {`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};
