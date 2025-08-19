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
import { FinancialDashboard } from './pages/FinancialDashboard';
import { DebugDashboard } from './pages/DebugDashboard';
import { BillingDebugPage } from './pages/BillingDebugPage';
import { SimpleTest } from './pages/SimpleTest';
// import { BillingTest } from './pages/BillingTest';
// import { EnterpriseBillingDemo } from './pages/EnterpriseBillingDemo';
import { HealthcareBillingDashboard } from './components/billing/HealthcareBillingDashboard';
import { TestBillingDashboard } from './components/billing/TestBillingDashboard';
import { SimpleBillingDashboard } from './components/billing/SimpleBillingDashboard';
import { TestBillingDebug } from './components/billing/TestBillingDebug';
// import { PatientPaymentPortal } from './components/billing/PatientPaymentPortal';
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
  console.log('🚨 APP VERSION: 0.1.2-deploy-test-20250818 🚨');
  console.log('🚨 DEPLOYED AT:', new Date().toISOString(), '🚨');
  
  return (
    <Router>
      <Routes>
        {/* Test routes completely outside Auth0 and everything */}
        <Route path="/simple-test" element={
          <div style={{ backgroundColor: 'purple', color: 'white', fontSize: '72px', padding: '100px' }}>
            PURPLE TEST - COMPLETELY OUTSIDE
          </div>
        } />
        <Route path="/billing-direct" element={<SimpleBillingDashboard />} />
        
        {/* All other routes wrapped in Auth0 */}
        <Route path="*" element={
          <Auth0ProviderWithNavigate>
            <LanguageProvider>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/callback" element={<Auth0Callback />} />
                <Route path="/simple" element={<SimpleTest />} />
                <Route path="/test-auth" element={<TestAuth />} />
                <Route path="/debug-auth" element={<DebugAuth />} />
                <Route path="/billing-debug" element={<BillingDebugPage />} />
                <Route path="/test-red" element={
                  <div style={{ backgroundColor: 'red', color: 'white', fontSize: '72px', padding: '100px' }}>
                    TEST RED PAGE - NO IMPORTS
                  </div>
                } />
                {/* <Route path="/billing-test" element={<BillingTest />} /> */}
                {/* <Route path="/billing-demo" element={<EnterpriseBillingDemo />} /> */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="dashboard" element={<Dashboard />} />
                      {/* <Route path="payment-portal" element={<PatientPaymentPortal />} /> */}
                      <Route path="clients" element={<Clients />} />
                      <Route path="qualifications" element={<Qualifications />} />
                      <Route path="clients/:id" element={<PatientProfile />} />
                      <Route path="patients/:id" element={<PatientProfile />} />
                      <Route path="profile" element={<UserProfile />} />
                      <Route
                        path="income-report"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <IncomeReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="packages"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <Packages />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="financial-dashboard"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                            <FinancialDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="debug-dashboard"
                        element={
                          <ProtectedRoute>
                            <DebugDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="patients"
                        element={
                          <ProtectedRoute requiredPermissions={['patients:read']}>
                            <div>Patients Page - Coming Soon</div>
                          </ProtectedRoute>
                        }
                      />
                      <Route path="billing" element={<SimpleBillingDashboard />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
              </Routes>
            </LanguageProvider>
          </Auth0ProviderWithNavigate>
        } />
      </Routes>
    </Router>
  );
}

export default App;
// FORCE REBUILD: Sun Aug 17 17:58:00 EDT 2025 - WITH SIMPLEBILLINGTEST
