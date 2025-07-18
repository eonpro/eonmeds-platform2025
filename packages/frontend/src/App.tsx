import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Auth0ProviderWithNavigate } from './providers/Auth0Provider';
import { LanguageProvider } from './contexts/LanguageContext';
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
import './i18n'; // Initialize i18n
import './App.css';

function App() {
  return (
    <Router>
      <Auth0ProviderWithNavigate>
        <LanguageProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/test-auth" element={<TestAuth />} />
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
