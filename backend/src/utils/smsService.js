/**
 * smsService.js
 *
 * SMS OTP delivery via Twilio Verify API.
 * In development mode (NODE_ENV=development) with no Twilio credentials,
 * the service falls back to a DEV BYPASS MODE:
 *   - A 6-digit OTP is generated and stored in memory (keyed by phone E.164)
 *   - The OTP is printed to the backend console
 *   - /verify-phone-otp checks this in-memory store instead of calling Twilio
 *
 * This lets you test the full signup → OTP → account creation flow locally
 * without needing real Twilio credentials.
 */

const safeFetch = (typeof fetch !== 'undefined')
  ? fetch
  : (...args) => {
      try {
        return require('node-fetch')(...args);
      } catch (e) {
        throw new Error('Fetch is not available. Install node-fetch or use Node 18+');
      }
    };

const isPlaceholderValue = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes('your_account_sid') ||
    normalized.includes('your_auth_token') ||
    normalized.includes('your_verify_service_sid') ||
    normalized.includes('change_this')
  );
};

const normalizePhoneE164 = (phoneStr) => {
  if (!phoneStr) return null;
  const digits = String(phoneStr).replace(/\D/g, '');

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    return `+91${digits.slice(1)}`;
  }
  return null;
};

const formatPhoneDisplay = (phoneStr) => {
  const normalized = normalizePhoneE164(phoneStr);
  if (!normalized || normalized.length !== 13) {
    return String(phoneStr || '');
  }
  const countryCode = normalized.slice(0, 3);
  const part1 = normalized.slice(3, 8);
  const part2 = normalized.slice(8);
  return `${countryCode} ${part1} ${part2}`;
};

// ─── Twilio config helper ─────────────────────────────────────────────────────

const getTwilioConfig = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (
    !accountSid || !authToken || !serviceSid ||
    isPlaceholderValue(accountSid) ||
    isPlaceholderValue(authToken) ||
    isPlaceholderValue(serviceSid)
  ) {
    return null; // signals that Twilio is not configured
  }

  return { accountSid, authToken, serviceSid };
};

const isTwilioConfigured = () => getTwilioConfig() !== null;
const isDevMode = () => (process.env.NODE_ENV || 'development') === 'development';

// ─── Dev-bypass OTP store (in-memory, keyed by phone E.164) ─────────────────

/**
 * In-memory map: phoneE164 → { otp: string, expiresAt: number }
 * Only used when Twilio is NOT configured in development mode.
 */
const devOtpStore = new Map();

const devStoreOtp = (phoneE164, otp) => {
  devOtpStore.set(phoneE164, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
  });
};

const devCheckOtp = (phoneE164, code) => {
  const entry = devOtpStore.get(phoneE164);
  if (!entry) return { approved: false, reason: 'no_entry' };
  if (Date.now() > entry.expiresAt) {
    devOtpStore.delete(phoneE164);
    return { approved: false, reason: 'expired' };
  }
  if (entry.otp !== String(code || '').trim()) {
    return { approved: false, reason: 'wrong_code' };
  }
  devOtpStore.delete(phoneE164);
  return { approved: true };
};

// ─── Exported helpers ─────────────────────────────────────────────────────────

exports.normalizePhoneE164 = normalizePhoneE164;
exports.formatPhoneDisplay = formatPhoneDisplay;

exports.verifyTwilioConfig = async () => {
  if (isTwilioConfigured()) return true;
  if (isDevMode()) {
    console.warn('[smsService] DEV BYPASS MODE active — SMS OTPs will be logged to the console.');
    return true; // do not block server startup in dev
  }
  throw new Error('Twilio Verify credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID) are missing or unconfigured in backend/.env');
};

/**
 * Send a phone OTP.
 * In production: uses Twilio Verify API.
 * In development with no Twilio config: stores OTP in memory and logs it.
 *
 * @param {{ phone: string, devOtp?: string }} options
 *   devOtp — the OTP to store in dev-bypass mode (passed in from authController
 *             so that the same OTP stored in PendingSignup is used for verification)
 */
exports.sendTwilioVerifySms = async ({ phone, devOtp }) => {
  const normalizedPhone = normalizePhoneE164(phone);
  if (!normalizedPhone) {
    throw new Error('Invalid phone number. Must be a valid 10-digit Indian phone number.');
  }

  // ── Dev-bypass mode ─────────────────────────────────────────────────────────
  if (!isTwilioConfigured()) {
    if (!isDevMode()) {
      throw new Error('Twilio Verify credentials are missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID in backend/.env');
    }

    const otpToStore = devOtp || String(Math.floor(100000 + Math.random() * 900000));
    devStoreOtp(normalizedPhone, otpToStore);

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║          📱 DEV BYPASS — SMS OTP                 ║');
    console.log(`║  Phone : ${formatPhoneDisplay(normalizedPhone).padEnd(40)}║`);
    console.log(`║  OTP   : ${otpToStore.padEnd(40)}║`);
    console.log('║  (Twilio not configured — using dev bypass mode) ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    return { sid: 'dev-bypass', status: 'pending' };
  }

  // ── Production: Twilio Verify API ─────────────────────────────────────────
  const { accountSid, authToken, serviceSid } = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await safeFetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
    {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: normalizedPhone,
        Channel: 'sms'
      }).toString()
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || data?.more_info || response.statusText || 'Twilio SMS verification dispatch failed';
    throw new Error(`Twilio Verify Error: ${errorMsg}`);
  }

  console.log(`Twilio Verify SMS dispatched successfully to ${formatPhoneDisplay(normalizedPhone)} (sid: ${data.sid})`);
  return data;
};

/**
 * Verify an OTP code for a given phone number.
 * In production: calls Twilio VerificationCheck.
 * In dev-bypass: checks the in-memory store.
 */
exports.checkTwilioVerifyOtp = async ({ phone, code }) => {
  const normalizedPhone = normalizePhoneE164(phone);
  if (!normalizedPhone) {
    throw new Error('Invalid phone number. Must be a valid 10-digit Indian phone number.');
  }

  const cleanCode = String(code || '').trim();
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    throw new Error('Invalid OTP code. Must be a 6-digit number.');
  }

  // ── Dev-bypass mode ─────────────────────────────────────────────────────────
  if (!isTwilioConfigured()) {
    if (!isDevMode()) {
      throw new Error('Twilio Verify credentials are missing in production.');
    }
    const result = devCheckOtp(normalizedPhone, cleanCode);
    return { approved: result.approved, data: result };
  }

  // ── Production: Twilio VerificationCheck ──────────────────────────────────
  const { accountSid, authToken, serviceSid } = getTwilioConfig();
  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await safeFetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
    {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: normalizedPhone,
        Code: cleanCode
      }).toString()
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || data?.more_info || response.statusText || 'Twilio verification check failed';
    throw new Error(`Twilio Verify Check Error: ${errorMsg}`);
  }

  const isApproved = data.status === 'approved' && data.valid === true;
  return { approved: isApproved, data };
};

/**
 * Expose dev bypass check for use in authController in dev mode.
 * This is used to cross-check in-memory OTPs when Twilio isn't configured.
 */
exports.devCheckOtp = devCheckOtp;
exports.isTwilioConfigured = isTwilioConfigured;
exports.isDevMode = isDevMode;
