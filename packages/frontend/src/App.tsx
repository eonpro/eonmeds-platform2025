import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Auth0ProviderWithNavigate } from './providers/Auth0Provider';
import { LanguageProvider } from './contexts/LanguageContext';
import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Qualifications } from './pages/Qualifications';
import { PatientProfile } from './pages/PatientProfile';
import { IncomeReport } from './pages/IncomeReport';
import { Packages } from './pages/Packages';
import { UserProfile } from './components/auth/UserProfile';
import { TestAuth } from './pages/TestAuth';
import { DebugAuth } from './components/auth/DebugAuth';
import { Auth0Callback } from './components/auth/Auth0Callback';
import './i18n'; // Initialize i18n
import './App.css';

// Filter out Stripe Elements accessibility warnings in development
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Filter out aria-hidden warnings from Stripe Elements
    if (args[0]?.includes?.('aria-hidden') && args[0]?.includes?.('InputElement')) {
      return;
    }
    // Filter out form field warnings from Stripe Elements
    if (
      args[0]?.includes?.('form field element') &&
      args[0]?.includes?.('should have an id or name')
    ) {
      return;
    }
    // Filter out label association warnings that are likely from Stripe
    if (args[0]?.includes?.('No label associated') && args[0]?.includes?.('form field')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

function App() {
  return (
    <Router>
      <Auth0ProviderWithNavigate>
        <LanguageProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/callback" element={<Auth0Callback />} />
            <Route path="/test-auth" element={<TestAuth />} />
            <Route path="/debug-auth" element={<DebugAuth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/qualifications" element={<Qualifications />} />
                      <Route path="/clients/:id" element={<PatientProfile />} />
                      <Route path="/patients/:id" element={<PatientProfile />} />
                      <Route path="/profile" element={<UserProfile />} />
                      <Route
                        path="/income-report"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <IncomeReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/packages"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <Packages />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/patients"
                        element={
                          <ProtectedRoute requiredPermissions={['patients:read']}>
                            <div>Patients Page - Coming Soon</div>
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </LanguageProvider>
      </Auth0ProviderWithNavigate>
    </Router>
  );
}

export default App;
