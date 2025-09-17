// apps/web/src/pages/auth/PhoneEntry.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { validatePhone } from '../../utils/phone';
import { useLocation } from 'react-router-dom';

const PhoneEntry: React.FC = () => {
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const phoneFromUrl = queryParams.get('phone');

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Use phoneFromUrl to prefill the phone input if available
const [phoneNumber, setPhoneNumber] = useState(phoneFromUrl || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (loading) return;

    try {
      setLoading(true);
      let res;
      if (mode === 'phone') {
        if (!validatePhone(phone)) {
          setError('Enter a valid 10-digit phone number');
          return;
        }
        res = await api.sendOTPByPhone(phone);
        sessionStorage.setItem('pendingIdentifierType', 'phone');
        sessionStorage.setItem('pendingIdentifierValue', phone);
      } else {
        if (!validateEmail(email)) {
          setError('Enter a valid email address');
          return;
        }
        res = await api.sendOTPByEmail(email);
        sessionStorage.setItem('pendingIdentifierType', 'email');
        sessionStorage.setItem('pendingIdentifierValue', email);
      }

      console.log('OTP Response:', res);
      navigate('/auth/verify-otp');
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* === Animations & Styles === */}
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
        @keyframes riseUp {
          from { opacity: 0; transform: translateY(60px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeInGlow {
          from { opacity: 0; transform: scale(0.8); filter: blur(10px); }
          to { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(139, 69, 19, 0.2); }
          50% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.8), inset 0 0 25px rgba(139, 69, 19, 0.3); }
        }
        @keyframes rotateAura {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        @keyframes healingPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(184, 134, 11, 0.4), inset 0 1px 3px rgba(255, 255, 255, 0.5); }
          50% { transform: scale(1.02); box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6), inset 0 1px 3px rgba(255, 255, 255, 0.7); }
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
        .card-rise { animation: riseUp 1.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .logo-fade { animation: fadeInGlow 1.5s ease 0.3s both; }
        .logo-glow { animation: logoGlow 3s ease-in-out infinite; }
        .aura-rotate { animation: rotateAura 10s linear infinite; }
        .error-shake { animation: shakeError 0.5s ease; }
        .healing-pulse { animation: healingPulse 1.5s ease infinite; }
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

        {/* Floating herbs */}
        <div className="absolute w-10 h-10 top-[10%] left-[10%] rounded-full herb-float-1"
          style={{ background: 'radial-gradient(circle, #8b6914 0%, transparent 70%)' }} />
        <div className="absolute w-15 h-15 top-[70%] right-[15%] rounded-full herb-float-2"
          style={{ background: 'radial-gradient(circle, #cd853f 0%, transparent 70%)' }} />
        <div className="absolute w-9 h-9 bottom-[15%] left-[50%] rounded-full herb-float-3"
          style={{ background: 'radial-gradient(circle, #daa520 0%, transparent 70%)' }} />
        <div className="absolute w-11 h-11 top-[50%] left-[5%] rounded-full herb-float-4"
          style={{ background: 'radial-gradient(circle, #b8860b 0%, transparent 70%)' }} />

        {/* Breathing aura */}
        <div className="absolute w-96 h-96 md:w-[600px] md:h-[600px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="absolute inset-0 rounded-full breathe-1"
            style={{ background: 'radial-gradient(circle, rgba(255, 183, 77, 0.4), rgba(218, 165, 32, 0.1) 40%, transparent 70%)' }} />
          <div className="absolute w-4/5 h-4/5 top-[10%] left-[10%] rounded-full breathe-2"
            style={{ background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3), rgba(184, 134, 11, 0.15) 30%, transparent 60%)' }} />
        </div>

        {/* Pulse rings */}
        <div className="absolute w-96 h-96 md:w-[800px] md:h-[800px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-yellow-400 border-opacity-20 rounded-full pulse-ring-1" />
        <div className="absolute w-96 h-96 md:w-[800px] md:h-[800px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-yellow-400 border-opacity-20 rounded-full pulse-ring-2" />
        <div className="absolute w-96 h-96 md:w-[800px] md:h-[800px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-yellow-400 border-opacity-20 rounded-full pulse-ring-3" />

        {/* Main card */}
        <div className="relative z-20 max-w-md w-full mx-4 p-12 rounded-3xl border card-rise"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 248, 220, 0.95), rgba(250, 240, 190, 0.92))',
            boxShadow: '0 30px 60px rgba(139, 69, 19, 0.4), 0 15px 35px rgba(184, 134, 11, 0.3)'
          }}>

          {/* Logo */}
          <div className="text-center mb-8 logo-fade">
            <div className="relative w-24 h-24 mx-auto mb-5 rounded-full flex items-center justify-center text-5xl font-bold text-amber-900 logo-glow"
              style={{ background: 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)' }}>
              <div className="absolute inset-0 w-[120%] h-[120%] top-[-10%] left-[-10%] aura-rotate"
                style={{ background: 'radial-gradient(circle, transparent 40%, rgba(255, 215, 0, 0.2) 70%)' }} />
              ॐ
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#2c1810' }}>
              Welcome to SwastyaSync
            </h1>
            <p className="text-sm italic mb-6" style={{ color: '#6b4423' }}>
              Ancient wisdom meets modern wellness
            </p>
          </div>

          {/* Toggle */}
          <div className="relative flex gap-2 mb-8 p-1 rounded-2xl border"
            style={{ background: 'rgba(139, 69, 19, 0.1)' }}>
            <div className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-6px)] rounded-2xl transition-transform duration-400 ease-out ${
              mode === 'email' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
            }`} style={{ background: 'linear-gradient(135deg, #b8860b, #daa520)' }} />
            <button type="button" onClick={() => setMode('phone')}
              className={`relative z-10 flex-1 py-3 rounded-2xl font-semibold ${mode === 'phone' ? 'text-white' : 'text-amber-800'}`}>
              📱 Phone
            </button>
            <button type="button" onClick={() => setMode('email')}
              className={`relative z-10 flex-1 py-3 rounded-2xl font-semibold ${mode === 'email' ? 'text-white' : 'text-amber-800'}`}>
              ✉️ Email
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative rounded-2xl border-2 overflow-hidden"
              style={{ background: 'rgba(255, 248, 220, 0.6)' }}>
              {mode === 'phone' ? (
                <input type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-4 bg-transparent outline-none font-medium"
                  placeholder="Enter phone number" maxLength={10} autoFocus
                  style={{ color: '#2c1810' }} />
              ) : (
                <input type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 bg-transparent outline-none font-medium"
                  placeholder="Enter email address" autoFocus
                  style={{ color: '#2c1810' }} />
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2 rounded-lg border text-sm error-shake"
                style={{ color: '#a0522d', background: 'rgba(205, 133, 63, 0.1)' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className={`relative w-full p-4 rounded-2xl font-bold transition-all duration-300 ${
                loading ? 'opacity-70 cursor-not-allowed healing-pulse' : 'hover:-translate-y-0.5'
              }`}
              style={{ background: 'linear-gradient(135deg, #b8860b, #daa520, #ffd700)', color: '#2c1810' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-amber-800 border-opacity-30 border-t-amber-800 rounded-full animate-spin" />
                  Sending...
                </span>
              ) : 'Get OTP'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default PhoneEntry;
