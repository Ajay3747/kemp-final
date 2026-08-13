import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, ShieldCheck, X } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/auth';

const formatPhoneDisplay = (phoneStr) => {
  const digits = String(phoneStr || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phoneStr || '';
};

const getFlowFromState = (state) => {
  if (!state) return null;
  return {
    flow: state.flow || 'signup',
    pendingSignupId: state.pendingSignupId || '',
    challengeId: state.challengeId || '',
    phone: state.phone || '',
    formattedPhone: state.formattedPhone || formatPhoneDisplay(state.phone),
    email: state.email || '',
    nextPath: state.nextPath || (state.flow === 'login' ? '/home' : '/profile'),
    cooldownSeconds: state.cooldownSeconds || 60,
    expiresInSeconds: state.expiresInSeconds || 300,
    devMode: state.devMode || false
  };
};

export default function OtpVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const inputRefs = useRef([]);
  const initialState = useMemo(() => {
    const fromLocation = getFlowFromState(location.state);
    if (fromLocation) return fromLocation;

    try {
      const stored = sessionStorage.getItem('kempOtpFlow');
      if (!stored) return null;
      return getFlowFromState(JSON.parse(stored));
    } catch (error) {
      return null;
    }
  }, [location.state]);

  const [flowState, setFlowState] = useState(initialState);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(initialState?.expiresInSeconds || 0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    if (flowState) {
      sessionStorage.setItem('kempOtpFlow', JSON.stringify(flowState));
    }
  }, [flowState]);

  useEffect(() => {
    if (initialState) {
      setFlowState(initialState);
      setCountdown(initialState.expiresInSeconds || 0);
    }
  }, [initialState]);

  useEffect(() => {
    if (!flowState || countdown <= 0) return undefined;
    const timer = setInterval(() => {
      setCountdown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [flowState, countdown]);

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 0);
  }, []);

  if (!flowState) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <h1 className="text-3xl font-bold text-white">Verify Your Phone Number</h1>
          <p className="mt-3 text-white/70">No active OTP session was found. Please start signup or login again.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 rounded-2xl bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const formattedPhone = flowState.formattedPhone || formatPhoneDisplay(flowState.phone);
  const isLoginFlow = flowState.flow === 'login';

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    event.preventDefault();
    const nextDigits = Array.from({ length: 6 }, (_, index) => text[index] || '');
    setOtpDigits(nextDigits);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setMessageType('error');
      setMessage('Enter the full 6-digit OTP.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const endpoint = isLoginFlow ? '/verify-login-otp' : '/verify-phone-otp';
      const body = isLoginFlow
        ? { challengeId: flowState.challengeId, otp }
        : { pendingSignupId: flowState.pendingSignupId, phone: flowState.phone, otp };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        setMessageType('error');
        setMessage(data.message || 'OTP verification failed');
        return;
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.userId) {
        localStorage.setItem('userId', data.userId);
      }
      localStorage.setItem('isAdmin', 'false');
      if (data.userData) {
        localStorage.setItem('userData', JSON.stringify(data.userData));
      }

      sessionStorage.removeItem('kempOtpFlow');
      setMessageType('success');
      setMessage('Phone verified successfully. Redirecting...');
      setTimeout(() => navigate(flowState.nextPath || (isLoginFlow ? '/home' : '/profile')), 700);
    } catch (error) {
      setMessageType('error');
      setMessage(`Server Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const endpoint = isLoginFlow ? '/resend-login-otp' : '/resend-phone-otp';
      const body = isLoginFlow
        ? { challengeId: flowState.challengeId }
        : { pendingSignupId: flowState.pendingSignupId, phone: flowState.phone };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        setMessageType('error');
        setMessage(data.message || 'Could not resend OTP');
        if (data.cooldownRemaining) {
          setCountdown(data.cooldownRemaining);
        }
        return;
      }

      setOtpDigits(['', '', '', '', '', '']);
      setCountdown(data.cooldownSeconds || 60);
      setFlowState((current) => ({
        ...current,
        pendingSignupId: data.pendingSignupId || current.pendingSignupId,
        phone: data.phone || current.phone,
        formattedPhone: data.formattedPhone || current.formattedPhone
      }));
      setMessageType('success');
      setMessage('A new SMS OTP has been sent to your phone.');
    } catch (error) {
      setMessageType('error');
      setMessage(`Server Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhone = () => {
    sessionStorage.removeItem('kempOtpFlow');
    navigate('/', { state: { mode: isLoginFlow ? 'login' : 'signup' } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center text-white relative overflow-hidden bg-slate-950 px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_28%)]" />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-yellow-400">Phone Verification</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Verify Your Phone Number</h1>
            <p className="mt-3 text-sm text-white/70">
              We&apos;ve sent a 6-digit verification code to <span className="font-semibold text-white">{formattedPhone}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleChangePhone}
            className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close OTP screen"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
          <ShieldCheck size={18} className="text-yellow-400" />
          <span>{countdown > 0 ? `OTP expires in ${countdown}s` : 'OTP expired. Please request a new OTP.'}</span>
        </div>

        {flowState.devMode && (
          <div className="mt-4 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-300">
            <p className="font-semibold text-yellow-400 mb-1">🛠 Dev Mode — No SMS Sent</p>
            <p>Twilio is not configured. The OTP was printed to your <strong>backend server console</strong>. Look for the box labelled <code className="bg-black/30 rounded px-1">📱 DEV BYPASS — SMS OTP</code>.</p>
          </div>
        )}

        <div className="mt-6 flex gap-2 sm:gap-3" onPaste={handlePaste}>
          {otpDigits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => { inputRefs.current[index] = node; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(event) => handleOtpChange(index, event.target.value)}
              onKeyDown={(event) => handleBackspace(index, event)}
              className="h-14 w-full flex-1 rounded-2xl border border-white/15 bg-slate-900/80 text-center text-xl font-semibold text-white outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 sm:h-16"
            />
          ))}
        </div>

        {message && (
          <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${messageType === 'success' ? 'border-green-400/30 bg-green-400/10 text-green-300' : 'border-red-400/30 bg-red-400/10 text-red-300'}`}>
            {message}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleVerify}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={16} />
            Resend OTP
          </button>
        </div>

        <button
          type="button"
          onClick={handleChangePhone}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-yellow-400 transition hover:text-yellow-300"
        >
          <ArrowLeft size={16} />
          Change Phone Number / Back to {isLoginFlow ? 'Login' : 'Signup'}
        </button>
      </div>
    </div>
  );
}