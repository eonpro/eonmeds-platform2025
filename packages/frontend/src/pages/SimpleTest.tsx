import React from 'react';

export const SimpleTest = () => {
  React.useEffect(() => {
    console.log('🔴 SimpleTest component mounted!');
    document.title = 'SIMPLE TEST PAGE';
  }, []);
  
  return <h1 style={{ fontSize: '100px', color: 'red' }}>SIMPLE TEST</h1>;
};
