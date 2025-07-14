import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import { LoginButton } from '../components/auth/LoginButton';

export const Home: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth0();

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>Welcome to EONMeds</h1>
        <p className="hero-subtitle">
          Telehealth Platform for the Hispanic Community
        </p>
        
        {isLoading ? (
          <div>Loading...</div>
        ) : isAuthenticated ? (
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