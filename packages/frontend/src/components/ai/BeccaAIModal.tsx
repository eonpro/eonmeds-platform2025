import React from 'react';
import Lottie from 'lottie-react';
import './BeccaAIModal.css';

interface BeccaAIModalProps {
  isOpen: boolean;
  status: 'analyzing' | 'creating' | 'ready' | 'idle';
  patientName?: string;
  onClose?: () => void;
}

// AI Wave animation similar to Siri/Alexa
const waveAnimationData = {
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 180,
  "w": 400,
  "h": 400,
  "nm": "AI Orb",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Gradient Orb",
      "sr": 1,
      "ks": {
        "o": {"a": 0, "k": 100},
        "r": {"a": 1, "k": [
          {"t": 0, "s": [0], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 90, "s": [180], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 180, "s": [360]}
        ]},
        "p": {"a": 0, "k": [200, 200, 0]},
        "a": {"a": 0, "k": [0, 0, 0]},
        "s": {"a": 1, "k": [
          {"t": 0, "s": [100, 100, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 45, "s": [110, 90, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 90, "s": [95, 105, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 135, "s": [105, 95, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 180, "s": [100, 100, 100]}
        ]}
      },
      "ao": 0,
      "shapes": [{
        "ty": "gr",
        "it": [
          {
            "ty": "rc",
            "d": 1,
            "s": {"a": 0, "k": [300, 300]},
            "p": {"a": 0, "k": [0, 0]},
            "r": {"a": 0, "k": 150}
          },
          {
            "ty": "gf",
            "o": {"a": 0, "k": 100},
            "r": 2,
            "bm": 0,
            "g": {
              "p": 5,
              "k": {
                "a": 1,
                "k": [
                  {
                    "t": 0,
                    "s": [0, 0.2, 0.6, 1, 0.2, 0.4, 0.7, 0.9, 0.4, 0.8, 0.4, 0.8, 0.6, 0.9, 0.3, 0.6, 1, 1, 0.2, 0.4],
                    "i": {"x": 0.3, "y": 1},
                    "o": {"x": 0.7, "y": 0}
                  },
                  {
                    "t": 60,
                    "s": [0, 0.8, 0.3, 0.9, 0.2, 0.6, 0.5, 0.95, 0.4, 0.4, 0.7, 0.9, 0.6, 0.3, 0.8, 0.8, 1, 0.2, 0.6, 1],
                    "i": {"x": 0.3, "y": 1},
                    "o": {"x": 0.7, "y": 0}
                  },
                  {
                    "t": 120,
                    "s": [0, 0.4, 0.8, 0.7, 0.2, 0.5, 0.6, 0.8, 0.4, 0.7, 0.4, 0.9, 0.6, 0.8, 0.3, 0.95, 1, 0.9, 0.2, 0.9],
                    "i": {"x": 0.3, "y": 1},
                    "o": {"x": 0.7, "y": 0}
                  },
                  {
                    "t": 180,
                    "s": [0, 0.2, 0.6, 1, 0.2, 0.4, 0.7, 0.9, 0.4, 0.8, 0.4, 0.8, 0.6, 0.9, 0.3, 0.6, 1, 1, 0.2, 0.4]
                  }
                ]
              }
            },
            "s": {"a": 0, "k": [0, 0]},
            "e": {"a": 0, "k": [100, 0]},
            "t": 1
          },
          {
            "ty": "tr",
            "p": {"a": 0, "k": [0, 0]},
            "a": {"a": 0, "k": [0, 0]},
            "s": {"a": 0, "k": [100, 100]},
            "r": {"a": 0, "k": 0},
            "o": {"a": 0, "k": 100}
          }
        ],
        "nm": "Gradient Fill"
      }],
      "ip": 0,
      "op": 180,
      "st": 0
    },
    {
      "ddd": 0,
      "ind": 2,
      "ty": 4,
      "nm": "Glow Effect",
      "sr": 1,
      "ks": {
        "o": {"a": 1, "k": [
          {"t": 0, "s": [40], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 60, "s": [70], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 120, "s": [40], "i": {"x": [0.3], "y": [1]}, "o": {"x": [0.7], "y": [0]}},
          {"t": 180, "s": [40]}
        ]},
        "r": {"a": 0, "k": 0},
        "p": {"a": 0, "k": [200, 200, 0]},
        "a": {"a": 0, "k": [0, 0, 0]},
        "s": {"a": 1, "k": [
          {"t": 0, "s": [120, 120, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 60, "s": [140, 140, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 120, "s": [120, 120, 100], "i": {"x": [0.3, 0.3], "y": [1, 1]}, "o": {"x": [0.7, 0.7], "y": [0, 0]}},
          {"t": 180, "s": [120, 120, 100]}
        ]}
      },
      "ao": 0,
      "ef": [{
        "ty": 29,
        "nm": "Gaussian Blur",
        "np": 5,
        "mn": "ADBE Gaussian Blur 2",
        "ix": 1,
        "en": 1,
        "ef": [
          {
            "ty": 0,
            "nm": "Blurriness",
            "mn": "ADBE Gaussian Blur 2-0001",
            "ix": 1,
            "v": {"a": 0, "k": 50}
          }
        ]
      }],
      "shapes": [{
        "ty": "gr",
        "it": [
          {
            "ty": "el",
            "s": {"a": 0, "k": [200, 200]},
            "p": {"a": 0, "k": [0, 0]}
          },
          {
            "ty": "fl",
            "c": {"a": 0, "k": [0.5, 0.7, 1, 1]},
            "o": {"a": 0, "k": 50}
          },
          {
            "ty": "tr",
            "p": {"a": 0, "k": [0, 0]},
            "a": {"a": 0, "k": [0, 0]},
            "s": {"a": 0, "k": [100, 100]},
            "r": {"a": 0, "k": 0},
            "o": {"a": 0, "k": 100}
          }
        ],
        "nm": "Glow"
      }],
      "ip": 0,
      "op": 180,
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