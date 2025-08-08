import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import BeccaAILogo from './BeccaAILogo';
import './BeccaAIModal.css';

interface BeccaAIModalProps {
  isOpen: boolean;
  status: 'analyzing' | 'creating' | 'ready' | 'idle';
  patientName?: string;
  onClose?: () => void;
}

const BeccaAIModal: React.FC<BeccaAIModalProps> = ({ isOpen, status, patientName, onClose }) => {
  // Auto-close when ready
  React.useEffect(() => {
    if (status === 'ready' && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  if (!isOpen) return null;

  const getStatusMessage = () => {
    const firstName = patientName?.split(' ')[0] || 'patient';
    
    switch (status) {
      case 'analyzing':
        return `Analyzing ${firstName}'s intake form information...`;
      case 'creating':
        return "Writing personalized SOAP Note...";
      case 'ready':
        return `Perfect! I have created a personalized SOAP Note for ${patientName} and I've uploaded it for Provider approval!`;
      default:
        return "BeccaAI Assistant";
    }
  };

  return (
    <div className="becca-modal-overlay">
      <div className="becca-content">
        <div className="becca-animation-container">
          <DotLottieReact
            src="https://lottie.host/9c7564a3-b6ee-4e8b-8b5e-14a59b28c515/3Htnjbp08p.lottie"
            loop={status !== 'ready'}
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        
        <BeccaAILogo className="becca-logo" />
        
        <p className="becca-status" key={status}>
          {getStatusMessage()}
        </p>
        
        {status === 'ready' && (
          <div className="becca-success-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="2"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeccaAIModal; 