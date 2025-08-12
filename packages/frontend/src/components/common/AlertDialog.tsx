import React from 'react';
import './AlertDialog.css';

interface AlertDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  onClose,
  type = 'info',
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 12l2 2 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'error':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path
              d="M15 9l-6 6M9 9l6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9v4m0 4h.01M5.07 19h13.86c1.66 0 2.64-1.84 1.73-3.26L13.73 4.26c-.87-1.35-2.59-1.35-3.46 0L3.34 15.74C2.43 17.16 3.41 19 5.07 19z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 16v-4m0-4h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
    }
  };

  return (
    <div className="alert-dialog-overlay" onClick={onClose}>
      <div className={`alert-dialog-content ${type}`} onClick={(e) => e.stopPropagation()}>
        <div className="alert-dialog-icon">{getIcon()}</div>

        <div className="alert-dialog-body">
          {title && <h3>{title}</h3>}
          <p>{message}</p>
        </div>

        <button className="alert-dialog-close" onClick={onClose}>
          {confirmText}
        </button>
      </div>
    </div>
  );
};
