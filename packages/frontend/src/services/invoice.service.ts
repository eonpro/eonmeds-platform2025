/**
 * Invoice Service - Production Ready
 * Connects to the new comprehensive invoice backend
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://qm6dnecfhp.us-east-1.awsapprunner.com';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Create axios instance with auth
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  status: 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue' | 'void' | 'cancelled';
  invoiceDate: string;
  dueDate: string;
  paidDate?: string;
  sentDate?: string;
  subtotal: number;
  discountAmount?: number;
  discountPercent?: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  notes?: string;
  lineItems?: LineItem[];
  payments?: Payment[];
  paymentUrl?: string;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
}

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: 'card' | 'ach' | 'cash' | 'check' | 'wire' | 'other';
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'partial_refund';
  reference?: string;
  paymentDate: string;
  stripePaymentIntentId?: string;
}

export interface CreateInvoiceParams {
  customerId: string;
  lineItems: LineItem[];
  dueDate?: string;
  discountPercent?: number;
  discountAmount?: number;
  taxRate?: number;
  notes?: string;
  internalNotes?: string;
  metadata?: Record<string, any>;
}

export interface PaymentLink {
  url: string;
  token: string;
  expiresAt: string;
}

class InvoiceService {
  /**
   * Create a new invoice
   */
  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    try {
      const response = await apiClient.post('/api/v1/invoices', params);
      return response.data;
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Get all invoices for a patient/customer
   */
  async getPatientInvoices(patientId: string): Promise<Invoice[]> {
    try {
      const response = await apiClient.get('/api/v1/invoices', {
        params: { customerId: patientId }
      });
      return response.data.invoices || [];
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoice(id: string): Promise<Invoice> {
    try {
      const response = await apiClient.get(`/api/v1/invoices/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Update an invoice
   */
  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    try {
      const response = await apiClient.put(`/api/v1/invoices/${id}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Delete an invoice
   */
  async deleteInvoice(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/invoices/${id}`);
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Send invoice to customer
   */
  async sendInvoice(id: string, recipients?: string[]): Promise<void> {
    try {
      await apiClient.post(`/api/v1/invoices/${id}/send`, { recipients });
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Generate payment link for invoice
   */
  async generatePaymentLink(invoiceId: string): Promise<PaymentLink> {
    try {
      const response = await apiClient.post(`/api/v1/invoices/${invoiceId}/payment-link`);
      return {
        url: response.data.paymentLink || response.data.url,
        token: response.data.token,
        expiresAt: response.data.expiresAt
      };
    } catch (error: any) {
      console.error('Error generating payment link:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Create Stripe checkout session for invoice
   */
  async createCheckoutSession(invoiceId: string): Promise<{
    sessionId: string;
    checkoutUrl: string;
  }> {
    try {
      const response = await apiClient.post(`/api/v1/invoices/${invoiceId}/create-checkout`);
      return {
        sessionId: response.data.sessionId,
        checkoutUrl: response.data.checkoutUrl || response.data.url
      };
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Process payment for invoice
   */
  async processPayment(invoiceId: string, params: {
    amount: number;
    paymentMethodId?: string;
    customerId?: string;
  }): Promise<Payment> {
    try {
      const response = await apiClient.post(`/api/v1/invoices/${invoiceId}/payment`, params);
      return response.data;
    } catch (error: any) {
      console.error('Error processing payment:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Apply manual payment to invoice
   */
  async applyPayment(invoiceId: string, params: {
    amount: number;
    method: Payment['method'];
    reference?: string;
    date?: string;
  }): Promise<Payment> {
    try {
      const response = await apiClient.post(`/api/v1/invoices/${invoiceId}/apply-payment`, params);
      return response.data;
    } catch (error: any) {
      console.error('Error applying payment:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Process refund for a payment
   */
  async processRefund(paymentId: string, params: {
    amount?: number;
    reason?: string;
  }): Promise<Payment> {
    try {
      const response = await apiClient.post(`/api/v1/payments/${paymentId}/refund`, params);
      return response.data;
    } catch (error: any) {
      console.error('Error processing refund:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Void an invoice
   */
  async voidInvoice(id: string, reason: string): Promise<Invoice> {
    try {
      const response = await apiClient.post(`/api/v1/invoices/${id}/void`, { reason });
      return response.data;
    } catch (error: any) {
      console.error('Error voiding invoice:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(id: string): Promise<Payment> {
    try {
      const response = await apiClient.get(`/api/v1/payments/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payment:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * List payments for invoice
   */
  async listInvoicePayments(invoiceId: string): Promise<Payment[]> {
    try {
      const response = await apiClient.get(`/api/v1/invoices/${invoiceId}/payments`);
      return response.data.payments || [];
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      return [];
    }
  }

  /**
   * Download invoice as PDF
   */
  async downloadPDF(invoiceId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/api/v1/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Get invoice summary for patient
   */
  async getPatientInvoiceSummary(patientId: string): Promise<{
    totalOutstanding: number;
    totalPaid: number;
    totalInvoices: number;
    overdueAmount: number;
    overdueCount: number;
  }> {
    try {
      const invoices = await this.getPatientInvoices(patientId);
      
      const summary = {
        totalOutstanding: 0,
        totalPaid: 0,
        totalInvoices: invoices.length,
        overdueAmount: 0,
        overdueCount: 0
      };

      const now = new Date();
      
      invoices.forEach(invoice => {
        if (invoice.status === 'paid') {
          summary.totalPaid += invoice.totalAmount;
        } else if (invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'partially_paid') {
          summary.totalOutstanding += invoice.amountDue;
          
          if (new Date(invoice.dueDate) < now) {
            summary.overdueAmount += invoice.amountDue;
            summary.overdueCount++;
          }
        }
      });

      return summary;
    } catch (error: any) {
      console.error('Error calculating summary:', error);
      return {
        totalOutstanding: 0,
        totalPaid: 0,
        totalInvoices: 0,
        overdueAmount: 0,
        overdueCount: 0
      };
    }
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService();

// Export for testing
export default InvoiceService;
