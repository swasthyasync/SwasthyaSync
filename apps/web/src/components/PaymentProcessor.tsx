// src/components/PaymentProcessor.tsx
import React, { useEffect } from 'react';

interface PaymentDetails {
  appointmentId: string;
  amount: number;
  doctorName: string;
  date: string;
  time: string;
  consultationType: string;
}

interface PaymentProcessorProps {
  paymentDetails: PaymentDetails;
  onSuccess: (response: any) => void;
  onFailure: (error: any) => void;
  onDismiss?: () => void;
}

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  paymentDetails,
  onSuccess,
  onFailure,
  onDismiss
}) => {
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if Razorpay script is already loaded
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const processPayment = async () => {
    try {
      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load');
      }

      // Get user data for prefill
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const registrationData = JSON.parse(localStorage.getItem('registrationData') || '{}');

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_1234567890', // Replace with your Razorpay key
        amount: paymentDetails.amount * 100, // Amount in paise
        currency: 'INR',
        name: 'Swastya Sync',
        description: `${paymentDetails.consultationType} with ${paymentDetails.doctorName}`,
        order_id: paymentDetails.appointmentId,
        handler: function (response: any) {
          handlePaymentSuccess(response);
        },
        prefill: {
          name: `${registrationData.firstName || user.firstName || ''} ${registrationData.lastName || user.lastName || ''}`.trim(),
          email: registrationData.email || user.email || '',
          contact: registrationData.phone || user.phone || ''
        },
        notes: {
          appointment_id: paymentDetails.appointmentId,
          doctor_name: paymentDetails.doctorName,
          appointment_date: paymentDetails.date,
          appointment_time: paymentDetails.time,
          consultation_type: paymentDetails.consultationType
        },
        theme: {
          color: '#4F46E5' // Indigo color to match the theme
        },
        modal: {
          ondismiss: function() {
            if (onDismiss) {
              onDismiss();
            }
          },
          escape: true,
          animation: true,
          confirm_close: true
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        timeout: 300, // 5 minutes timeout
        remember_customer: true
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment initialization error:', error);
      onFailure(error);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    try {
      // Store payment details locally
      const paymentRecord = {
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
        appointment_details: paymentDetails,
        payment_status: 'success',
        payment_date: new Date().toISOString(),
        amount_paid: paymentDetails.amount
      };

      // Store in localStorage for now (in production, send to backend)
      const existingPayments = JSON.parse(localStorage.getItem('paymentHistory') || '[]');
      existingPayments.push(paymentRecord);
      localStorage.setItem('paymentHistory', JSON.stringify(existingPayments));

      // Store appointment details
      const appointment = {
        id: paymentDetails.appointmentId,
        doctorName: paymentDetails.doctorName,
        date: paymentDetails.date,
        time: paymentDetails.time,
        consultationType: paymentDetails.consultationType,
        amount: paymentDetails.amount,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentId: response.razorpay_payment_id,
        createdAt: new Date().toISOString()
      };

      const existingAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
      existingAppointments.push(appointment);
      localStorage.setItem('appointments', JSON.stringify(existingAppointments));

      // Call success handler
      onSuccess({
        ...response,
        appointment: appointment,
        payment_record: paymentRecord
      });

    } catch (error) {
      console.error('Error processing payment success:', error);
      onFailure(error);
    }
  };

  return (
    <div className="payment-processor">
      <button
        onClick={processPayment}
        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
      >
        Pay ₹{paymentDetails.amount} - Secure Payment
      </button>
      
      <div className="mt-4 text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Secure payment powered by Razorpay</span>
        </div>
        
        <div className="mt-2 flex justify-center space-x-4">
          <img src="https://razorpay.com/assets/razorpay-glyph.svg" alt="Razorpay" className="h-4" />
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500">SSL Secured</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500">PCI Compliant</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Payment Summary</h4>
        <div className="space-y-1 text-sm text-blue-700">
          <div className="flex justify-between">
            <span>Consultation Fee:</span>
            <span>₹{paymentDetails.amount}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform Fee:</span>
            <span>₹0</span>
          </div>
          <div className="flex justify-between">
            <span>GST (18%):</span>
            <span>₹{Math.round(paymentDetails.amount * 0.18)}</span>
          </div>
          <hr className="border-blue-300" />
          <div className="flex justify-between font-semibold">
            <span>Total Amount:</span>
            <span>₹{paymentDetails.amount + Math.round(paymentDetails.amount * 0.18)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          By proceeding with the payment, you agree to our Terms of Service and Privacy Policy. 
          You will receive appointment confirmation via SMS and email after successful payment.
        </p>
        <p className="mt-2">
          For any payment related queries, contact our support team at support@swastyasync.com
        </p>
      </div>
    </div>
  );
};

export default PaymentProcessor;