// apps/web/src/pages/auth/OTPVerify.tsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { motion } from 'framer-motion';

const OTPVerify: React.FC = () => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const pendingType =
    (sessionStorage.getItem('pendingIdentifierType') as 'phone' | 'email' | null) ??
    null;
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

  const handleSubmit = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Enter 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');

    try {
      let res;
      if (pendingType === 'email') {
        res = await api.verifyOTPByEmail(pendingValue, otpString);
      } else {
        res = await api.verifyOTPByPhone(pendingValue, otpString);
      }

      if (res?.token) {
        api.setToken(res.token);
        window.location.href = '/';
      } else if (res?.new) {
        window.location.href = '/auth/register';
      } else {
        setError('Unexpected verification response');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setResendTimer(30);
    setError('');
    try {
      if (pendingType === 'email') {
        await api.sendOTPByEmail(pendingValue);
      } else {
        await api.sendOTPByPhone(pendingValue);
      }
    } catch {
      setError('Failed to resend OTP');
    }
  };

  return (
    <>
      {/* === Ayurvedic Animations & Styles === */}
      <style>{`
        @keyframes rotateMandala {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes floatHerb {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.15; }
          25% { transform: translate(30px, -40px) rotate(90deg) scale(1.1); opacity: 0.2; }
          50% { transform: translate(-20px, -60px) rotate(180deg) scale(0.9); opacity: 0.1; }
          75% { transform: translate(-40px, -20px) rotate(270deg) scale(1.05); opacity: 0.18; }
        }
        @keyframes ayurvedicBreathe {
          0%, 100% { transform: scale(0.8); opacity: 0.3; filter: blur(2px); }
          50% { transform: scale(1.2); opacity: 0.6; filter: blur(0px); }
        }
        @keyframes pulseExpand {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes otpGlow {
          0%, 100% { 
            box-shadow: 0 0 0 2px rgba(218, 165, 32, 0.3), 0 4px 12px rgba(184, 134, 11, 0.2); 
            border-color: rgba(218, 165, 32, 0.5);
          }
          50% { 
            box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.4), 0 6px 20px rgba(255, 183, 77, 0.3); 
            border-color: rgba(255, 215, 0, 0.7);
          }
        }
        @keyframes shimmerGold {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes chakraRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .herb-float-1 { animation: floatHerb 25s infinite ease-in-out; }
        .herb-float-2 { animation: floatHerb 30s infinite ease-in-out; animation-delay: -5s; }
        .herb-float-3 { animation: floatHerb 22s infinite ease-in-out; animation-delay: -10s; }
        .herb-float-4 { animation: floatHerb 28s infinite ease-in-out; animation-delay: -15s; }
        .mandala-rotate { animation: rotateMandala 60s linear infinite; }
        .breathe-1 { animation: ayurvedicBreathe 6s ease-in-out infinite; }
        .breathe-2 { animation: ayurvedicBreathe 6s ease-in-out infinite reverse; animation-delay: -3s; }
        .pulse-ring-1 { animation: pulseExpand 4s ease-out infinite; }
        .pulse-ring-2 { animation: pulseExpand 4s ease-out infinite; animation-delay: 1s; }
        .pulse-ring-3 { animation: pulseExpand 4s ease-out infinite; animation-delay: 2s; }
        .otp-input-glow { animation: otpGlow 2s ease-in-out infinite; }
        .shimmer-gold {
          background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 215, 0, 0.4), 
            rgba(255, 183, 77, 0.4), 
            transparent
          );
          background-size: 200% 100%;
          animation: shimmerGold 3s linear infinite;
        }
        .chakra-spin { animation: chakraRotate 20s linear infinite; }
      `}</style>

      <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at top left, rgba(255, 183, 77, 0.15), transparent 40%),
            radial-gradient(ellipse at bottom right, rgba(139, 69, 19, 0.2), transparent 40%),
            radial-gradient(ellipse at center, rgba(255, 140, 0, 0.1), transparent 60%),
            linear-gradient(135deg, #2c1810 0%, #3d2817 25%, #4a3420 50%, #3d2817 75%, #2c1810 100%)
          `
        }}>

        {/* Mandala overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none mandala-rotate"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 80% 80%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 80% 20%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 20% 80%, transparent 30%, rgba(255, 183, 77, 0.1) 30.5%, transparent 31%),
              radial-gradient(circle at 50% 50%, transparent 40%, rgba(255, 183, 77, 0.1) 40.5%, transparent 41%)
            `
          }}
        />

        {/* Floating herb particles */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 2 }}
          className="absolute w-10 h-10 top-[10%] left-[10%] rounded-full herb-float-1"
          style={{ background: 'radial-gradient(circle, #8b6914 0%, transparent 70%)' }} 
        />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 2, delay: 0.3 }}
          className="absolute w-15 h-15 top-[70%] right-[15%] rounded-full herb-float-2"
          style={{ background: 'radial-gradient(circle, #cd853f 0%, transparent 70%)' }} 
        />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 2, delay: 0.6 }}
          className="absolute w-9 h-9 bottom-[15%] left-[50%] rounded-full herb-float-3"
          style={{ background: 'radial-gradient(circle, #daa520 0%, transparent 70%)' }} 
        />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 2, delay: 0.9 }}
          className="absolute w-11 h-11 top-[50%] left-[5%] rounded-full herb-float-4"
          style={{ background: 'radial-gradient(circle, #b8860b 0%, transparent 70%)' }} 
        />

        {/* Ayurvedic breathing light */}
        <div className="absolute w-96 h-96 md:w-[600px] md:h-[600px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="absolute inset-0 rounded-full breathe-1"
            style={{ background: 'radial-gradient(circle, rgba(255, 183, 77, 0.4), rgba(218, 165, 32, 0.1) 40%, transparent 70%)' }} 
          />
          <div className="absolute w-4/5 h-4/5 top-[10%] left-[10%] rounded-full breathe-2"
            style={{ background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3), rgba(184, 134, 11, 0.15) 30%, transparent 60%)' }} 
          />
        </div>

        {/* Healing pulse rings */}
        <div className="absolute w-96 h-96 md:w-[800px] md:h-[800px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-yellow-400 border-opacity-20 rounded-full pulse-ring-1" />
        <div className="absolute w-96 h-96 md:w-[800px] md:h-[800px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-yellow-400 border-opacity-20 rounded-full pulse-ring-2" />
        <div className="absolute w-96 h-96 md:w-[800px] md:h-[800px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-yellow-400 border-opacity-20 rounded-full pulse-ring-3" />

        {/* Chakra decoration */}
        <div className="absolute w-64 h-64 top-1/2 left-1/2 opacity-5 chakra-spin pointer-events-none">
          <div className="absolute inset-0 border-2 border-yellow-600 rounded-full" />
          <div className="absolute inset-4 border-2 border-yellow-600 rounded-full" />
          <div className="absolute inset-8 border-2 border-yellow-600 rounded-full" />
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          className="relative z-20 max-w-md w-full mx-4 p-12 rounded-3xl border"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 248, 220, 0.95) 0%, rgba(250, 240, 190, 0.92) 50%, rgba(255, 243, 205, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 30px 60px rgba(139, 69, 19, 0.4), 0 15px 35px rgba(184, 134, 11, 0.3), inset 0 2px 5px rgba(255, 215, 0, 0.3)',
            borderColor: 'rgba(218, 165, 32, 0.3)'
          }}
        >
          {/* Golden shimmer overlay */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 shimmer-gold opacity-10" />
          </div>

          {/* Lock icon with glow */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl"
            style={{
              background: 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(139, 69, 19, 0.2)',
              color: '#2c1810'
            }}
          >
            🔐
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-bold text-center mb-2"
            style={{ color: '#2c1810', textShadow: '0 2px 4px rgba(139, 69, 19, 0.1)' }}
          >
            Verify your {pendingType ?? 'contact'}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-8"
            style={{ color: '#6b4423' }}
          >
            We sent a 6-digit code to <span className="font-semibold" style={{ color: '#8b6914' }}>{pendingValue}</span>
          </motion.p>

          {/* OTP Inputs */}
          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, i) => (
              <motion.input
                key={i}
                ref={(el: HTMLInputElement | null) => {
                  inputRefs.current[i] = el;
                }}
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
                className={`w-12 h-14 text-center border-2 rounded-xl text-lg font-bold transition-all focus:outline-none ${
                  digit ? 'otp-input-glow' : ''
                }`}
                style={{
                  background: digit ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 248, 220, 0.6)',
                  borderColor: digit ? '#daa520' : 'rgba(218, 165, 32, 0.3)',
                  color: '#2c1810',
                  boxShadow: digit ? '0 0 0 2px rgba(218, 165, 32, 0.3), 0 4px 12px rgba(184, 134, 11, 0.2)' : 'none'
                }}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg border text-sm mb-4"
              style={{ 
                color: '#a0522d', 
                background: 'rgba(205, 133, 63, 0.1)',
                borderColor: 'rgba(205, 133, 63, 0.3)'
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          {/* Verify Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            onClick={handleSubmit}
            disabled={loading || otp.join('').length !== 6}
            className={`relative w-full p-4 rounded-2xl font-bold transition-all duration-300 overflow-hidden ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'
            }`}
            style={{ 
              background: 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)', 
              color: '#2c1810',
              boxShadow: '0 4px 15px rgba(184, 134, 11, 0.4), inset 0 1px 3px rgba(255, 255, 255, 0.5)'
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
            {!loading && (
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.3), transparent 70%)'
                }}
              />
            )}
          </motion.button>

          {/* Resend Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-6"
          >
            {canResend ? (
              <button
                onClick={handleResend}
                className="font-medium hover:underline transition-all duration-200 hover:scale-105"
                style={{ color: '#b8860b' }}
              >
                ✨ Resend OTP
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ 
                    background: 'rgba(218, 165, 32, 0.2)',
                    color: '#8b6914'
                  }}
                >
                  {resendTimer}
                </div>
                <span style={{ color: '#6b4423' }}>seconds until resend</span>
              </div>
            )}
          </motion.div>

          {/* Decorative bottom pattern */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #daa520, transparent)'
            }}
          />
        </motion.div>
      </div>
    </>
  );
};

export default OTPVerify;