import React from 'react';
import Lottie from 'lottie-react';
import './BeccaAIModal.css';

interface BeccaAIModalProps {
  isOpen: boolean;
  status: 'analyzing' | 'creating' | 'ready' | 'idle';
  patientName?: string;
  onClose?: () => void;
}

// Dynamic wave animation with more motion
const waveAnimationData = {
  "v": "5.5.7",
  "fr": 60,
  "ip": 0,
  "op": 60,
  "w": 400,
  "h": 400,
  "nm": "AI Wave",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Circle Wave 1",
      "sr": 1,
      "ks": {
        "o": {"a": 1, "k": [
          {"t": 0, "s": [30], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 30, "s": [80], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 60, "s": [30]}
        ]},
        "r": {"a": 0, "k": 0},
        "p": {"a": 0, "k": [200, 200, 0]},
        "a": {"a": 0, "k": [0, 0, 0]},
        "s": {"a": 1, "k": [
          {"t": 0, "s": [100, 100, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 30, "s": [130, 130, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 60, "s": [100, 100, 100]}
        ]}
      },
      "ao": 0,
      "shapes": [{
        "ty": "gr",
        "it": [{
          "ty": "el",
          "s": {"a": 0, "k": [120, 120]},
          "p": {"a": 0, "k": [0, 0]}
        }, {
          "ty": "st",
          "c": {"a": 0, "k": [0.663, 0.2, 0.2, 1]},
          "o": {"a": 0, "k": 100},
          "w": {"a": 1, "k": [
            {"t": 0, "s": [3], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
            {"t": 15, "s": [8], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
            {"t": 30, "s": [3], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
            {"t": 45, "s": [6], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
            {"t": 60, "s": [3]}
          ]},
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
        "nm": "Circle 1"
      }],
      "ip": 0,
      "op": 60,
      "st": 0
    },
    {
      "ddd": 0,
      "ind": 2,
      "ty": 4,
      "nm": "Circle Wave 2",
      "sr": 1,
      "ks": {
        "o": {"a": 1, "k": [
          {"t": 0, "s": [20], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 20, "s": [60], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 40, "s": [20], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 60, "s": [20]}
        ]},
        "r": {"a": 0, "k": 0},
        "p": {"a": 0, "k": [200, 200, 0]},
        "a": {"a": 0, "k": [0, 0, 0]},
        "s": {"a": 1, "k": [
          {"t": 0, "s": [150, 150, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 20, "s": [180, 180, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 40, "s": [150, 150, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 60, "s": [150, 150, 100]}
        ]}
      },
      "ao": 0,
      "shapes": [{
        "ty": "gr",
        "it": [{
          "ty": "el",
          "s": {"a": 0, "k": [120, 120]},
          "p": {"a": 0, "k": [0, 0]}
        }, {
          "ty": "st",
          "c": {"a": 0, "k": [0.663, 0.2, 0.2, 0.6]},
          "o": {"a": 0, "k": 100},
          "w": {"a": 0, "k": 2},
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
        "nm": "Circle 2"
      }],
      "ip": 0,
      "op": 60,
      "st": 0
    },
    {
      "ddd": 0,
      "ind": 3,
      "ty": 4,
      "nm": "Circle Wave 3",
      "sr": 1,
      "ks": {
        "o": {"a": 1, "k": [
          {"t": 10, "s": [10], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 30, "s": [40], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 50, "s": [10], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 60, "s": [10]}
        ]},
        "r": {"a": 0, "k": 0},
        "p": {"a": 0, "k": [200, 200, 0]},
        "a": {"a": 0, "k": [0, 0, 0]},
        "s": {"a": 1, "k": [
          {"t": 10, "s": [200, 200, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 30, "s": [250, 250, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 50, "s": [200, 200, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 60, "s": [200, 200, 100]}
        ]}
      },
      "ao": 0,
      "shapes": [{
        "ty": "gr",
        "it": [{
          "ty": "el",
          "s": {"a": 0, "k": [120, 120]},
          "p": {"a": 0, "k": [0, 0]}
        }, {
          "ty": "st",
          "c": {"a": 0, "k": [0.663, 0.2, 0.2, 0.3]},
          "o": {"a": 0, "k": 100},
          "w": {"a": 0, "k": 1.5},
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
        "nm": "Circle 3"
      }],
      "ip": 0,
      "op": 60,
      "st": 0
    }
  ]
};

const BeccaAIModal: React.FC<BeccaAIModalProps> = ({ isOpen, status, patientName, onClose }) => {
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
              key={status} // Force re-render on status change for smooth animation
              animationData={waveAnimationData}
              loop={status !== 'ready'}
              style={{ width: 200, height: 200 }}
            />
            <div className="becca-glow"></div>
          </div>
          
          <h2 className="becca-title">BeccaAI</h2>
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