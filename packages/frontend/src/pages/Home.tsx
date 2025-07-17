import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import { LoginButton } from '../components/auth/LoginButton';
import '../App.css';

export const Home: React.FC = () => {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();

  return (
    <div className="home-container">
      <div className="hero-section">
        <img src="/logo192.png" alt="EONMeds Logo" className="hero-logo" />
        <h1 className="hero-title">Welcome to EONMeds</h1>
        <p className="hero-subtitle">
          HIPAA & SOC 2 Compliant Telehealth Platform for the Hispanic Community
        </p>
        
        {/* Temporary debug info - REMOVE THIS IN PRODUCTION */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            background: '#f0f0f0', 
            padding: '10px', 
            margin: '20px 0', 
            borderRadius: '5px',
            fontSize: '12px',
            textAlign: 'left'
          }}>
            <h4>Debug Info (Dev Only):</h4>
            <p>Auth0 Domain: {process.env.REACT_APP_AUTH0_DOMAIN || 'NOT SET'}</p>
            <p>Auth0 Client ID: {process.env.REACT_APP_AUTH0_CLIENT_ID ? '***' + process.env.REACT_APP_AUTH0_CLIENT_ID.slice(-4) : 'NOT SET'}</p>
            <p>API Base URL: {process.env.REACT_APP_API_BASE_URL || 'NOT SET'}</p>
          </div>
        )}

        <div className="hero-buttons">
          {isAuthenticated ? (
            <div className="welcome-message">
              <h2>Welcome back, {user?.name || user?.email}!</h2>
              <p>Ready to manage your healthcare needs?</p>
              <Link to="/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="cta-section">
              <p>Get started with your personalized healthcare journey</p>
              <LoginButton className="btn btn-primary btn-lg" />
            </div>
          )}
        </div>
      </div>

      <div className="features-section">
        <h2>Our Services</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Telemedicine Consultations</h3>
            <p>Connect with healthcare providers from the comfort of your home</p>
          </div>
          <div className="feature-card">
            <h3>Spanish Language Support</h3>
            <p>Full support in Spanish for better communication</p>
          </div>
          <div className="feature-card">
            <h3>Personalized Care</h3>
            <p>Tailored healthcare solutions for your specific needs</p>
          </div>
          <div className="feature-card">
            <h3>Secure & Private</h3>
            <p>HIPAA-compliant platform ensuring your data privacy</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 