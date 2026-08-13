import React, { useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, ShieldCheck, X } from 'lucide-react';

export default function OtpVerificationModal({
  isOpen,
  email,
  otpDigits,
  onOtpChange,
  onVerify,
  onResend,
  onChangeEmail,
  onClose,
  countdown,
  loading,
  message,
  messageType
}) {
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
    }
  }, [isOpen]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    onOtpChange(index, digit);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    event.preventDefault();
    const nextDigits = Array.from({ length: 6 }, (_, index) => text[index] || '');
    nextDigits.forEach((digit, index) => onOtpChange(index, digit));
    const focusIndex = Math.min(text.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-yellow-400/20 bg-[#08101f] p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-yellow-400">Email Verification</p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Enter the 6-digit OTP</h2>
            <p className="mt-2 text-sm text-white/70">
              We&apos;ve sent a verification code to <span className="font-semibold text-white">{email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close OTP modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
          <ShieldCheck size={18} className="text-yellow-400" />
          <span>
            {countdown > 0 ? `OTP expires in ${countdown}s` : 'OTP expired. Request a new code to continue.'}
          </span>
        </div>

        <div className="mt-6 flex gap-3 sm:gap-4" onPaste={handlePaste}>
          {otpDigits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => { inputRefs.current[index] = node; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
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
            onClick={onVerify}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button
            type="button"
            onClick={onResend}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={16} />
            Resend OTP
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onChangeEmail}
            className="inline-flex items-center gap-2 text-left font-medium text-yellow-400 transition hover:text-yellow-300"
          >
            <ArrowLeft size={16} />
            Change email
          </button>
          <p className="text-white/40">Didn&apos;t receive it? Check spam or resend after 60 seconds.</p>
        </div>
      </div>
    </div>
  );
}