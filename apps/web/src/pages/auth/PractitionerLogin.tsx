// apps/web/src/pages/auth/PractitionerLogin.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import api from '../../utils/api';

const PractitionerLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Start/drive resend timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const handleSendOTP = async () => {
    setError('');
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Check practitioner exists & is active
      const { data: practitioner, error: userErr } = await supabase
        .from('users')
        .select('id, email, role, is_active')
        .eq('email', email.toLowerCase())
        .eq('role', 'practitioner')
        .single();

      if (userErr || !practitioner) {
        setError('This email is not registered as a practitioner account');
        setLoading(false);
        return;
      }
      if (!practitioner.is_active) {
        setError('This account is inactive. Please contact admin.');
        setLoading(false);
        return;
      }

      // Call backend to send practitioner OTP
      const response = await api.post('/auth/practitioner/send-otp', { email: email.toLowerCase() });

      if (response && response.success) {
        setStep('otp');
        setResendTimer(60);
        setOtp('');
        setError('');
      } else {
        setError(response?.error || response?.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      console.error('[PractitionerLogin] sendOTP error:', err);
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/practitioner/verify-otp', { email: email.toLowerCase(), otp: otp.trim() });

      if (response && response.success && response.token) {
        // Persist token & user for app usage (short-term).
        // NOTE: For pure Supabase session, backend should return access/refresh tokens and we should call supabase.auth.setSession(...)
        localStorage.setItem('authToken', response.token);
        if (response.user) localStorage.setItem('user', JSON.stringify(response.user));

        // Optional: attempt to set Supabase session if backend returned supabase tokens
        if (response.access_token && response.refresh_token && typeof supabase.auth.setSession === 'function') {
          try {
            // @ts-ignore - call only if available
            await supabase.auth.setSession({
              access_token: response.access_token,
              refresh_token: response.refresh_token,
            });
            console.log('[PractitionerLogin] Supabase session set from backend tokens');
          } catch (sessErr) {
            console.warn('[PractitionerLogin] Could not set supabase session (non-fatal):', sessErr);
          }
        }

        // navigate to practitioner dashboard
        navigate('/practitioner/dashboard');
      } else {
        setError(response?.error || response?.message || 'Invalid OTP');
      }
    } catch (err: any) {
      console.error('[PractitionerLogin] verifyOTP error:', err);
      setError(err?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    await handleSendOTP();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `
          radial-gradient(ellipse at top left, rgba(59, 130, 246, 0.12), transparent 40%),
          radial-gradient(ellipse at bottom right, rgba(99, 102, 241, 0.12), transparent 40%),
          linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #0f172a 100%)
        `,
      }}
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.35)',
            }}
          >
            👨‍⚕️
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Practitioner Portal</h1>
          <p className="text-blue-200">Secure access for healthcare professionals</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          {step === 'email' ? (
            <>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Sign In</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Professional Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendOTP();
                      }
                    }}
                    placeholder="doctor@clinic.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleSendOTP}
                  disabled={loading || !email}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending OTP...
                    </span>
                  ) : (
                    'Send OTP'
                  )}
                </button>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-center text-sm text-gray-600">
                    Patient?{' '}
                    <button onClick={() => navigate('/auth/phone')} className="text-blue-600 hover:text-blue-700 font-medium">
                      Sign in here
                    </button>
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Verify OTP</h2>
              <p className="text-sm text-gray-600 mb-6">We've sent a 6-digit code to {email}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleVerifyOTP();
                      }
                    }}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    'Verify OTP'
                  )}
                </button>

                <div className="flex items-center justify-between">
                  <button onClick={() => { setStep('email'); setError(''); }} className="text-sm text-gray-600 hover:text-gray-800">
                    ← Change email
                  </button>

                  <button
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-blue-200">🔒 Secure practitioner authentication</p>
          <p className="text-xs text-blue-300 mt-1">Protected health information access</p>
        </div>
      </motion.div>
    </div>
  );
};

export default PractitionerLogin;
