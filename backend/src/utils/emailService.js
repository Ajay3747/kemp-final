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
    normalized.includes('your_resend_api_key') ||
    normalized.includes('yourgmail@gmail.com') ||
    normalized.includes('your_16_digit_app_password') ||
    normalized.includes('your_jwt_secret_key_here') ||
    normalized.includes('your_verified_sender@example.com')
  );
};

exports.verifyEmailTransport = async () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || isPlaceholderValue(apiKey)) {
    throw new Error('RESEND_API_KEY is missing or unconfigured in backend/.env');
  }
  return true;
};

exports.sendVerificationOtpEmail = async ({ to, otp }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'KEMP <onboarding@resend.dev>';

  if (!apiKey || isPlaceholderValue(apiKey)) {
    throw new Error('RESEND_API_KEY is missing or unconfigured in backend/.env');
  }

  const response = await safeFetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'KEMP Email Verification Code',
      text: [
        'Welcome to KEMP!',
        '',
        `Your KEMP verification code is: ${otp}`,
        '',
        'This code will expire in 5 minutes.',
        'Please do not share this code with anyone.',
        '',
        '— KEMP Team'
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; max-width: 520px; margin: 0 auto; border: 1px solid #1e293b;">
          <h2 style="color: #facc15; font-size: 24px; margin-top: 0; margin-bottom: 16px;">Welcome to KEMP!</h2>
          <p style="font-size: 16px; color: #e2e8f0; margin-bottom: 16px;">Your KEMP verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #facc15; background-color: #111827; padding: 16px 24px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #facc15;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.5; margin-top: 20px;">
            This code will expire in 5 minutes.<br />
            Please do not share this code with anyone.
          </p>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px; margin-bottom: 0;">— KEMP Team</p>
        </div>
      `
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || data?.error?.message || response.statusText || 'Resend API rejected email delivery request';
    throw new Error(`Resend API Error: ${errorMsg}`);
  }

  console.log(`Verification OTP email sent successfully via Resend API (id: ${data.id})`);
  return data;
};