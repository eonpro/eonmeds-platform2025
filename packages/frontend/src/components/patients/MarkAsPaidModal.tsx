import React, { useState } from "react";
import { useApi } from "../../hooks/useApi";
import "./MarkAsPaidModal.css";

interface MarkAsPaidModalProps {
  invoice: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const MarkAsPaidModal: React.FC<MarkAsPaidModalProps> = ({
  invoice,
  onClose,
  onSuccess,
}) => {
  const apiClient = useApi();
  const [processing, setProcessing] = useState(false);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setProcessing(true);

      const response = await apiClient.post("/api/v1/payments/mark-paid", {
        invoice_id: invoice.id,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference: reference,
        notes: notes,
      });

      if (response.data.success) {
        alert("Invoice marked as paid successfully!");
        onSuccess();
      } else {
        alert(response.data.error || "Failed to mark invoice as paid");
      }
    } catch (error: any) {
      console.error("Error marking invoice as paid:", error);
      alert(
        error.response?.data?.error ||
          "Failed to mark invoice as paid. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="mark-paid-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Mark Invoice as Paid</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleMarkAsPaid}>
          <div className="invoice-info">
            <div className="info-row">
              <span className="label">Invoice #:</span>
              <span className="value">{invoice.invoice_number}</span>
            </div>
            <div className="info-row">
              <span className="label">Amount:</span>
              <span className="value amount">
                {formatCurrency(invoice.amount_due)}
              </span>
            </div>
          </div>

          <div className="form-section">
            <label>Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div className="form-section">
            <label>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="wire_transfer">Wire Transfer</option>
              <option value="ach">ACH Transfer</option>
              <option value="zelle">Zelle</option>
              <option value="venmo">Venmo</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-section">
            <label>Reference/Check Number (Optional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Check #1234"
            />
          </div>

          <div className="form-section">
            <label>Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this payment"
              rows={3}
            />
          </div>

          <div className="warning-message">
            <span className="warning-icon">⚠️</span>
            <p>
              This will mark the invoice as paid without processing a charge.
              Use this only for payments received outside the platform.
            </p>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </button>
            <button type="submit" className="confirm-btn" disabled={processing}>
              {processing ? "Processing..." : "Mark as Paid"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
