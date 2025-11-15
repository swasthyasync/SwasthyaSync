// apps/web/src/pages/auth/OTPVerify.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabase';

const OTPVerify: React.FC = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const pendingType =
    (sessionStorage.getItem('pendingIdentifierType') as 'phone' | 'email' | null) ?? null;
  const pendingValue = sessionStorage.getItem('pendingIdentifierValue') ?? '';

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleaned.slice(0, 1);
    setOtp(newOtp);
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // helper: persist token & user to localStorage and (optionally) set supabase session
  const persistAuth = async (response: any, token: string | null, user: any) => {
    try {
      if (token) {
        // save token to all keys ApiService.getAuthToken checks
        localStorage.setItem('token', token);
        localStorage.setItem('authToken', token);
        localStorage.setItem('accessToken', token);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      console.log('[OTPVerify] Persisted token and user to localStorage');
    } catch (e) {
      console.warn('[OTPVerify] Failed to persist auth to localStorage', e);
    }

    // If backend returned real Supabase tokens, set the client session so supabase.auth.getSession() works
    try {
      // Only call setSession if backend actually provided both access_token & refresh_token for supabase
      if (
        typeof supabase?.auth?.setSession === 'function' &&
        response &&
        response.access_token &&
        response.refresh_token
      ) {
        // @ts-ignore - supabase typings may differ; this call is optional and only used if backend returns real tokens
        await supabase.auth.setSession({
          access_token: response.access_token,
          refresh_token: response.refresh_token,
        });
        console.log('[OTPVerify] supabase.auth.setSession completed');
      }
    } catch (sErr) {
      console.warn('[OTPVerify] Could not set Supabase session (non-fatal)', sErr);
    }
  };

  const handleSubmit = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Enter 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');

    try {
      console.log('[OTPVerify] Verifying OTP:', otpString, 'for:', pendingValue, 'type:', pendingType);

      let response: any;
      if (pendingType === 'email') {
        response = await api.verifyOTPByEmail(pendingValue, otpString);
      } else {
        response = await api.verifyOTPByPhone(pendingValue, otpString);
      }

      console.log('[OTPVerify] OTP verification response:', response);

      if (!response?.success) {
        const errorMsg = response?.message || response?.error || 'Verification failed';
        console.error('[OTPVerify] API returned error:', errorMsg);
        setError(errorMsg);
        return;
      }

      console.log('[OTPVerify] OTP verification successful');

      // If new user, redirect to registration and keep pending identifier
      if (response.new === true || response.needsRegistration === true) {
        console.log('[OTPVerify] New user detected - redirecting to registration');
        sessionStorage.setItem('pendingIdentifierType', pendingType ?? 'phone');
        sessionStorage.setItem('pendingIdentifierValue', pendingValue ?? '');
        navigate('/auth/register');
        return;
      }

      // Existing user flow
      const user = response.user;
      const token = response.token || response.access_token || null;

      if (!user) {
        console.error('[OTPVerify] No user data in response for existing user');
        setError('User authentication failed. Please try again.');
        return;
      }

      console.log('[OTPVerify] Existing user found:', user.id);

      // Clear pending identifier
      sessionStorage.removeItem('pendingIdentifierType');
      sessionStorage.removeItem('pendingIdentifierValue');

      // Try to create Supabase session if possible, otherwise use localStorage
      try {
        if (token) {
          // If your backend returns a Supabase-compatible JWT token
          const { data, error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: token
          });

          if (error) {
            console.warn('[OTPVerify] Could not set Supabase session:', error.message);
            // Fallback to localStorage
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('authToken', token); // Store the token as well
          } else {
            console.log('[OTPVerify] Supabase session created successfully');
          }
        } else {
          // No token, use localStorage only
          localStorage.setItem('user', JSON.stringify(user));
          if (token) {
            localStorage.setItem('authToken', token); // Store the token as well
          }
        }
      } catch (sessionError) {
        console.warn('[OTPVerify] Session creation failed:', sessionError);
        localStorage.setItem('user', JSON.stringify(user));
        if (token) {
          localStorage.setItem('authToken', token); // Store the token as well
        }
      }

      // Navigate based on user role and questionnaire completion
      console.log('[OTPVerify] User object:', user);
      console.log('[OTPVerify] User role:', user.role);
      console.log('[OTPVerify] User type:', typeof user.role);
      
      if (user.role === 'practitioner' || user.role === 'admin') {
        // Practitioners and admins go directly to their dashboard without Prakriti questionnaire
        console.log('[OTPVerify] Practitioner/Admin user - going to practitioner dashboard');
        navigate('/practitioner/dashboard');
      } else if (user.questionnaire_completed || user.onboarding_completed) {
        // Regular patients who have completed questionnaire go to patient dashboard
        console.log('[OTPVerify] Patient has completed questionnaire - going to dashboard');
        navigate('/patient/dashboard');
      } else {
        // Regular patients who haven't completed questionnaire go to Prakriti assessment
        console.log('[OTPVerify] Patient needs questionnaire - going to assessment');
        navigate('/auth/prakriti-questionnaire', { state: { userId: user.id } });
      }
      return;
    } catch (err: any) {
      console.error('[OTPVerify] Verification error:', err);

      let errorMessage = 'Verification failed';

      if (err?.message) {
        if (err.message.includes('Invalid or expired OTP')) {
          errorMessage = 'Invalid or expired OTP. Please try again.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timeout. Please check your connection and try again.';
        } else if (err.message.includes('Network error')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setResendTimer(30);
    setError('');
    try {
      console.log('[OTPVerify] Resending OTP to:', pendingValue, 'type:', pendingType);

      if (pendingType === 'email') {
        await api.sendOTPByEmail(pendingValue);
      } else {
        await api.sendOTPByPhone(pendingValue);
      }

      console.log('[OTPVerify] OTP resent successfully');
    } catch (e: any) {
      console.error('[OTPVerify] Resend error:', e);
      setError('Failed to resend OTP. Please try again.');
    }
  };

  return (
    <>
      <style>{`
        @keyframes rotateMandala { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes floatHerb { 0%,100% { transform: translate(0,0) rotate(0deg) scale(1); opacity:0.15 } 50% { transform: translate(-20px,-60px) rotate(180deg) scale(0.9); opacity:0.1 } }
        @keyframes ayurvedicBreathe { 0%,100% { transform: scale(0.8); opacity:0.3 } 50% { transform: scale(1.2); opacity:0.6 } }
        @keyframes pulseExpand { 0% { transform: translate(-50%,-50%) scale(0.5); opacity:0.8 } 100% { transform: translate(-50%,-50%) scale(1.5); opacity:0 } }
        @keyframes otpGlow { 0%,100% { box-shadow: 0 0 0 2px rgba(218,165,32,0.3); border-color: rgba(218,165,32,0.5) } 50% { box-shadow: 0 0 0 4px rgba(255,215,0,0.4); border-color: rgba(255,215,0,0.7) } }
        .herb-float-1 { animation: floatHerb 25s infinite ease-in-out; }
        .mandala-rotate { animation: rotateMandala 60s linear infinite; }
        .breathe-1 { animation: ayurvedicBreathe 6s ease-in-out infinite; }
        .pulse-ring-1 { animation: pulseExpand 4s ease-out infinite; }
        .otp-input-glow { animation: otpGlow 2s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
           style={{
             background: `radial-gradient(ellipse at top left, rgba(255,183,77,0.15), transparent 40%), linear-gradient(135deg,#2c1810 0%, #3d2817 100%)`
           }}>

        <div className="absolute inset-0 opacity-5 pointer-events-none mandala-rotate" />

        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          className="relative z-20 max-w-md w-full mx-4 p-12 rounded-3xl border"
          style={{
            background: 'linear-gradient(135deg, rgba(255,248,220,0.95), rgba(255,243,205,0.95))',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 30px 60px rgba(139,69,19,0.4)',
            borderColor: 'rgba(218,165,32,0.3)'
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl"
            style={{
              background: 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)',
              color: '#2c1810'
            }}
          >
            🔐
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                     className="text-2xl font-bold text-center mb-2" style={{ color: '#2c1810' }}>
            Verify your {pendingType ?? 'contact'}
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="text-center mb-8" style={{ color: '#6b4423' }}>
            We sent a 6-digit code to <span className="font-semibold" style={{ color: '#8b6914' }}>{pendingValue}</span>
          </motion.p>

          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, i) => (
              <motion.input
                key={i}
                ref={(el: HTMLInputElement | null) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                whileFocus={{ scale: 1.1 }}
                className={`w-12 h-14 text-center border-2 rounded-xl text-lg font-bold transition-all focus:outline-none ${digit ? 'otp-input-glow' : ''}`}
                style={{
                  background: digit ? 'rgba(255,215,0,0.1)' : 'rgba(255,248,220,0.6)',
                  borderColor: digit ? '#daa520' : 'rgba(218,165,32,0.3)',
                  color: '#2c1810',
                  boxShadow: digit ? '0 0 0 2px rgba(218,165,32,0.3)' : 'none'
                }}
              />
            ))}
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 p-3 rounded-lg border text-sm mb-4"
                        style={{ color: '#a0522d', background: 'rgba(205,133,63,0.1)', borderColor: 'rgba(205,133,63,0.3)' }}>
              ⚠️ {error}
            </motion.div>
          )}

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            onClick={handleSubmit}
            disabled={loading || otp.join('').length !== 6}
            className={`relative w-full p-4 rounded-2xl font-bold transition-all duration-300 overflow-hidden ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
            style={{
              background: 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)',
              color: '#2c1810',
              boxShadow: '0 4px 15px rgba(184,134,11,0.4)'
            }}
          >
            <span className="relative z-10">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-amber-800 border-opacity-30 border-t-amber-800 rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify OTP'
              )}
            </span>
          </motion.button>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center mt-6">
            {canResend ? (
              <button onClick={handleResend} className="font-medium hover:underline transition-all duration-200 hover:scale-105" style={{ color: '#b8860b' }}>
                ✨ Resend OTP
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(218,165,32,0.2)', color: '#8b6914' }}>
                  {resendTimer}
                </div>
                <span style={{ color: '#6b4423' }}>seconds until resend</span>
              </div>
            )}
          </motion.div>

          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #daa520, transparent)' }} />
        </motion.div>
      </div>
    </>
  );
};

export default OTPVerify;
