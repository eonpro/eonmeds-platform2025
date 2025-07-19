import React, { useState } from 'react';
import './StripePaymentForm.css';

interface StripePaymentFormProps {
  onPaymentMethodCreated: (paymentMethodId: string) => void;
  onCancel: () => void;
  saveCard?: boolean;
  processing?: boolean;
}

// Stripe Test Cards for development
const TEST_CARDS = [
  { brand: 'Visa', number: '4242 4242 4242 4242', cvc: 'Any 3 digits' },
  { brand: 'Visa (debit)', number: '4000 0566 5566 5556', cvc: 'Any 3 digits' },
  { brand: 'Mastercard', number: '5555 5555 5555 4444', cvc: 'Any 3 digits' },
  { brand: 'American Express', number: '3782 822463 10005', cvc: 'Any 4 digits' },
  { brand: 'Discover', number: '6011 1111 1111 1117', cvc: 'Any 3 digits' },
];

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  onPaymentMethodCreated,
  onCancel,
  saveCard = false,
  processing = false
}) => {
  const [selectedCard, setSelectedCard] = useState(0);
  const [expiryMonth, setExpiryMonth] = useState('12');
  const [expiryYear, setExpiryYear] = useState('2025');
  const [showInstructions, setShowInstructions] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In test mode, we'll use Stripe's test payment method IDs
    // In production, this would use Stripe Elements to create a real payment method
    const testPaymentMethodId = `pm_card_${TEST_CARDS[selectedCard].brand.toLowerCase().replace(/[^a-z]/g, '')}`;
    
    onPaymentMethodCreated(testPaymentMethodId);
  };

  return (
    <div className="stripe-payment-form">
      {showInstructions && (
        <div className="test-mode-banner">
          <div className="banner-content">
            <span className="test-badge">TEST MODE</span>
            <p>Use any of the test cards below. No real charges will be made.</p>
            <button 
              type="button" 
              className="dismiss-btn"
              onClick={() => setShowInstructions(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="test-cards-section">
          <label className="form-label">Select a Test Card</label>
          <div className="test-cards-grid">
            {TEST_CARDS.map((card, index) => (
              <div 
                key={index}
                className={`test-card-option ${selectedCard === index ? 'selected' : ''}`}
                onClick={() => setSelectedCard(index)}
              >
                <input
                  type="radio"
                  name="test-card"
                  checked={selectedCard === index}
                  onChange={() => setSelectedCard(index)}
                />
                <div className="card-details">
                  <div className="card-brand">{card.brand}</div>
                  <div className="card-number">{card.number}</div>
                  <div className="card-cvc">CVC: {card.cvc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="expiry-section">
          <div className="form-row">
            <div className="form-group">
              <label>Expiry Month</label>
              <select 
                value={expiryMonth} 
                onChange={(e) => setExpiryMonth(e.target.value)}
                className="expiry-select"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month.toString().padStart(2, '0')}>
                    {month.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Expiry Year</label>
              <select 
                value={expiryYear} 
                onChange={(e) => setExpiryYear(e.target.value)}
                className="expiry-select"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="stripe-branding">
          <div className="powered-by">
            <span>Secured by</span>
            <svg className="stripe-logo" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg">
              <path fill="#6772E5" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.21 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.07 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z"/>
            </svg>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={processing}
          >
            {processing ? 'Processing...' : (saveCard ? 'Save Card' : 'Use This Card')}
          </button>
        </div>
      </form>
    </div>
  );
}; 