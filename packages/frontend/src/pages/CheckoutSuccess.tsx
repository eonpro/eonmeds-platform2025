import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const paymentIntentId = searchParams.get('payment_intent');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!paymentIntentId) {
        setError('No payment information found');
        setLoading(false);
        return;
      }

      try {
        // First, confirm the payment on the backend
        await axios.post('/api/v1/checkout/confirm-payment', {
          paymentIntentId,
        });

        // Then fetch order details
        const response = await axios.get(`/api/v1/checkout/order/${paymentIntentId}`);
        setOrderDetails(response.data);
      } catch (err: any) {
        console.error('Error fetching order details:', err);
        // Still show success even if we can't fetch details
        setOrderDetails({
          orderNumber: `EON-${Date.now()}`,
          email: 'Processing...',
          amount: 0,
          processing: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [paymentIntentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-green-100 p-3">
              <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Thank you for your purchase. Your order has been confirmed.
          </p>

          {/* Order Details */}
          <div className="border-t border-b border-gray-200 py-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-semibold">{orderDetails?.orderNumber}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Email:</span>
              <span>{orderDetails?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-semibold">${orderDetails?.amount?.toFixed(2)}</span>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You'll receive a confirmation email shortly</li>
              <li>• Our team will review your information</li>
              <li>• A healthcare provider will contact you within 24-48 hours</li>
              <li>• Your medication will be shipped directly to your address</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="/"
              className="flex-1 text-center px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Go to Dashboard
            </a>
            <a
              href="/support"
              className="flex-1 text-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Contact Support
            </a>
          </div>

          {/* Support Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Need help? Contact us at</p>
            <a href="mailto:support@eonpro.app" className="text-green-600 hover:underline">
              support@eonpro.app
            </a>
            <p className="mt-1">or call (555) 123-4567</p>
          </div>
        </div>
      </div>
    </div>
  );
}
