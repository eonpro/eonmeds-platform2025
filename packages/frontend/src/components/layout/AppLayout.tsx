import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import './AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      <div className={`app-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </div>
    </div>
  );
}; 