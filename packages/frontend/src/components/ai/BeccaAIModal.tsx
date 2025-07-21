import React from 'react';
import Lottie from 'lottie-react';
import './BeccaAIModal.css';

interface BeccaAIModalProps {
  isOpen: boolean;
  status: 'analyzing' | 'creating' | 'ready' | 'idle';
  patientName?: string;
  onClose?: () => void;
}

// Using a wave animation from LottieFiles
const waveAnimationData = {
  "v": "5.5.7",
  "fr": 60,
  "ip": 0,
  "op": 120,
  "w": 400,
  "h": 400,
  "nm": "AI Wave",
  "ddd": 0,
  "assets": [],
  "layers": [{
    "ddd": 0,
    "ind": 1,
    "ty": 4,
    "nm": "Wave",
    "sr": 1,
    "ks": {
      "o": {"a": 0, "k": 100},
      "r": {"a": 0, "k": 0},
      "p": {"a": 0, "k": [200, 200, 0]},
      "a": {"a": 0, "k": [0, 0, 0]},
      "s": {"a": 0, "k": [100, 100, 100]}
    },
    "ao": 0,
    "shapes": [{
      "ty": "gr",
      "it": [{
        "ty": "sh",
        "d": 1,
        "ks": {
          "a": 1,
          "k": [{
            "i": {"x": 0.3, "y": 1},
            "o": {"x": 0.7, "y": 0},
            "t": 0,
            "s": [{
              "i": [[0, 0], [-50, -30], [-100, 0], [-150, 30], [-200, 0]],
              "o": [[0, 0], [50, 30], [100, 0], [150, -30], [200, 0]],
              "v": [[-200, 0], [-100, -20], [0, 0], [100, 20], [200, 0]],
              "c": false
            }]
          }, {
            "i": {"x": 0.3, "y": 1},
            "o": {"x": 0.7, "y": 0},
            "t": 60,
            "s": [{
              "i": [[0, 0], [-50, 30], [-100, 0], [-150, -30], [-200, 0]],
              "o": [[0, 0], [50, -30], [100, 0], [150, 30], [200, 0]],
              "v": [[-200, 0], [-100, 20], [0, 0], [100, -20], [200, 0]],
              "c": false
            }]
          }, {
            "t": 120,
            "s": [{
              "i": [[0, 0], [-50, -30], [-100, 0], [-150, 30], [-200, 0]],
              "o": [[0, 0], [50, 30], [100, 0], [150, -30], [200, 0]],
              "v": [[-200, 0], [-100, -20], [0, 0], [100, 20], [200, 0]],
              "c": false
            }]
          }]
        }
      }, {
        "ty": "st",
        "c": {"a": 0, "k": [0.337, 0.678, 0.961, 1]},
        "o": {"a": 0, "k": 100},
        "w": {"a": 0, "k": 4},
        "lc": 2,
        "lj": 2
      }, {
        "ty": "tr",
        "p": {"a": 0, "k": [0, 0]},
        "a": {"a": 0, "k": [0, 0]},
        "s": {"a": 0, "k": [100, 100]},
        "r": {"a": 0, "k": 0},
        "o": {"a": 0, "k": 100}
      }],
      "nm": "Wave 1"
    }],
    "ip": 0,
    "op": 120,
    "st": 0
  }]
};

const BeccaAIModal: React.FC<BeccaAIModalProps> = ({ isOpen, status, patientName, onClose }) => {
  if (!isOpen) return null;

  const getStatusMessage = () => {
    switch (status) {
      case 'analyzing':
        return "Wait while I analyze the patient's intake form...";
      case 'creating':
        return "Creating SOAP Note...";
      case 'ready':
        return `SOAP Note created for ${patientName || 'patient'}. Ready for provider approval.`;
      default:
        return "BECCA AI Assistant";
    }
  };

  // Auto-close when ready
  React.useEffect(() => {
    if (status === 'ready' && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  return (
    <div className="becca-modal-overlay">
      <div className="becca-modal">
        <div className="becca-content">
          <div className="becca-animation-container">
            <Lottie
              animationData={waveAnimationData}
              loop={status !== 'ready'}
              style={{ width: 200, height: 200 }}
            />
            <div className="becca-glow"></div>
          </div>
          
          <h2 className="becca-title">BECCA AI</h2>
          <p className="becca-status">{getStatusMessage()}</p>
          
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
    </div>
  );
};

export default BeccaAIModal; 