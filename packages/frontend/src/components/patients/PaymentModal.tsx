import React from 'react';
import { InvoicePaymentModal } from '../invoices/InvoicePaymentModal';

interface PaymentModalProps {
  invoice: any;
  stripeCustomerId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  stripeCustomerId,
  onClose,
  onSuccess,
}) => {
  // Pass through to InvoicePaymentModal
  return (
    <InvoicePaymentModal
      invoice={invoice}
      onClose={onClose}
      onPaymentSuccess={onSuccess}
    />
  );
};