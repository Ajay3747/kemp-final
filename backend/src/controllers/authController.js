const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const PendingSignup = require('../models/PendingSignup');
const EmailOtpChallenge = require('../models/EmailOtpChallenge');
const UserProfile = require('../models/UserProfile');
const { sendVerificationOtpEmail } = require('../utils/emailService');
const { sendTwilioVerifySms, checkTwilioVerifyOtp, normalizePhoneE164, formatPhoneDisplay, isTwilioConfigured, isDevMode } = require('../utils/smsService');
const { validateIdCardImage } = require('../services/idVerification/imageValidation');
const { verifyIdentity, STATES: ID_VERIFICATION_STATES } = require('../services/idVerification/verifyIdentity');

// Helper: safe fetch (uses global fetch when available)
const safeFetch = (typeof fetch !== 'undefined')
  ? fetch
  : (...args) => {
      try {
        return require('node-fetch')(...args);
      } catch (e) {
        throw new Error('Fetch is not available. Install node-fetch or use Node 18+');
      }
    };

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const isBcryptHash = (value) => typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const maskEmail = (email) => {
  const value = normalizeText(email).toLowerCase();
  const [localPart = '', domain = ''] = value.split('@');
  if (!localPart || !domain) return value;
  if (localPart.length <= 1) return `*@${domain}`;
  return `${localPart[0]}***@${domain}`;
};

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const isEmailDeliveryFailure = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('resend') ||
    message.includes('smtp') ||
    message.includes('nodemailer') ||
    message.includes('email') ||
    message.includes('auth') ||
    message.includes('connect') ||
    message.includes('api key') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  );
};

const isSmsDeliveryFailure = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('twilio') ||
    message.includes('sms') ||
    message.includes('verify') ||
    message.includes('connect') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  );
};

// Validates both ID card images (required, real file type, size, dimensions)
// and returns either { error } with all messages joined, or { frontFile, backFile }.
const validateIdCardPair = (frontFile, backFile) => {
  const frontResult = validateIdCardImage(frontFile, 'Front ID card');
  const backResult = validateIdCardImage(backFile, 'Back ID card');
  const errors = [...frontResult.errors, ...backResult.errors];

  if (errors.length > 0) {
    return { error: errors[0], errors };
  }

  return { frontFile, backFile };
};

const buildRegularSignupPayload = (body, files) => {
  const frontFile = files?.idCardFront?.[0] || null;
  const backFile = files?.idCardBack?.[0] || null;

  const username = normalizeText(body.username);
  const fullName = normalizeText(body.fullName);
  const password = body.password || '';
  const confirmPassword = body.confirmPassword || '';
  const department = normalizeText(body.department);
  const rollNo = normalizeText(body.rollNo);
  const phone = normalizeText(body.phone);
  const collegeEmail = normalizeText(body.collegeEmail).toLowerCase();
  const bloodGroup = normalizeText(body.bloodGroup);

  if (!username || !fullName || !password || !confirmPassword || !department || !rollNo || !phone || !collegeEmail || !bloodGroup) {
    return { error: 'All fields are required' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  if (!collegeEmail.endsWith('@kongu.edu') && collegeEmail !== 'ajay3747.dev@gmail.com') {
    return { error: 'Invalid college email - must end with @kongu.edu' };
  }

  const idCardResult = validateIdCardPair(frontFile, backFile);
  if (idCardResult.error) {
    return { error: idCardResult.error };
  }

  return {
    username,
    fullName,
    password,
    department,
    rollNo,
    phone,
    collegeEmail,
    bloodGroup,
    frontFile,
    backFile
  };
};

const buildPhoneSignupPayload = (body, files) => {
  const frontFile = files?.idCardFront?.[0] || null;
  const backFile = files?.idCardBack?.[0] || null;

  const username = normalizeText(body.username);
  const fullName = normalizeText(body.fullName);
  const password = body.password || '';
  const confirmPassword = body.confirmPassword || '';
  const department = normalizeText(body.department);
  const rollNo = normalizeText(body.rollNo);
  const rawPhone = normalizeText(body.phone || body.phoneNumber);
  const collegeEmail = normalizeText(body.collegeEmail).toLowerCase();
  const bloodGroup = normalizeText(body.bloodGroup);

  if (!username || !fullName || !password || !confirmPassword || !department || !rollNo || !rawPhone || !collegeEmail || !bloodGroup) {
    return { error: 'All fields are required' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  if (!collegeEmail.endsWith('@kongu.edu') && collegeEmail !== 'ajay3747.dev@gmail.com') {
    return { error: 'Invalid college email - must end with @kongu.edu' };
  }

  const phoneE164 = normalizePhoneE164(rawPhone);
  if (!phoneE164) {
    return { error: 'Invalid Indian phone number. Please enter a valid 10-digit number.' };
  }

  const idCardResult = validateIdCardPair(frontFile, backFile);
  if (idCardResult.error) {
    return { error: idCardResult.error };
  }

  return {
    username,
    fullName,
    password,
    department,
    rollNo,
    phone: rawPhone,
    phoneE164,
    collegeEmail,
    bloodGroup,
    frontFile,
    backFile
  };
};

// Runs OCR-based identity verification for a signup payload and maps the
// resulting state to an HTTP-safe response. Never creates any DB records —
// callers decide what to do once they know the state.
const runIdCardVerification = async (payload) => {
  const result = await verifyIdentity(
    {
      name: payload.fullName,
      rollNumber: payload.rollNo,
      phone: payload.phone,
      department: payload.department
    },
    payload.frontFile.buffer,
    payload.backFile.buffer
  );

  if (result.state === ID_VERIFICATION_STATES.FAILED) {
    return {
      ok: false,
      statusCode: 400,
      message: result.reasons[0] || "We couldn't verify your institution ID card. Please make sure both sides are clear and that the information entered matches your ID card.",
      result
    };
  }

  if (result.state === ID_VERIFICATION_STATES.NEEDS_REVIEW) {
    return {
      ok: false,
      statusCode: 422,
      message: 'Identity verification needs a clearer scan. Please retake or re-upload both sides of your ID card and try again.',
      result
    };
  }

  return { ok: true, result };
};

const createOrRefreshPendingSignup = async (payload, verificationResult) => {
  const {
    username,
    fullName,
    password,
    department,
    rollNo,
    phone,
    collegeEmail,
    bloodGroup,
    frontFile,
    backFile
  } = payload;

  const existingUser = await User.findOne({ collegeEmail });
  if (existingUser) {
    return { error: 'Email is already registered' };
  }

  const pendingSignup = await PendingSignup.findOne({ collegeEmail });
  const now = Date.now();

  if (pendingSignup && pendingSignup.otpCooldownUntil && pendingSignup.otpCooldownUntil.getTime() > now) {
    return {
      error: 'Please wait before requesting another OTP',
      statusCode: 429,
      cooldownRemaining: Math.ceil((pendingSignup.otpCooldownUntil.getTime() - now) / 1000)
    };
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const passwordHash = await bcrypt.hash(password, 10);
  const otpExpiresAt = new Date(now + OTP_EXPIRY_MS);
  const otpCooldownUntil = new Date(now + OTP_COOLDOWN_MS);

  const upsertedPendingSignup = await PendingSignup.findOneAndUpdate(
    { collegeEmail },
    {
      username,
      fullName,
      passwordHash,
      department,
      rollNo,
      phone,
      collegeEmail,
      bloodGroup,
      idCard: frontFile.originalname,
      idCardData: frontFile.buffer,
      idCardMimeType: frontFile.mimetype,
      idCardBack: backFile.originalname,
      idCardBackData: backFile.buffer,
      idCardBackMimeType: backFile.mimetype,
      identityVerificationStatus: verificationResult.state,
      identityVerificationScore: verificationResult.score,
      identityVerifiedAt: new Date(),
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      otpCooldownUntil,
      updatedAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendVerificationOtpEmail({ to: collegeEmail, otp });

  return {
    pendingSignupId: upsertedPendingSignup._id,
    collegeEmail,
    maskedEmail: maskEmail(collegeEmail),
    cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000),
    expiresInSeconds: Math.ceil(OTP_EXPIRY_MS / 1000)
  };
};

const createUserFromPendingSignup = async (pendingSignup) => {
  const existingUser = await User.findOne({ $or: [{ collegeEmail: pendingSignup.collegeEmail }, { username: pendingSignup.username }, { rollNo: pendingSignup.rollNo }] });
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  const user = new User({
    username: pendingSignup.username,
    fullName: pendingSignup.fullName,
    password: pendingSignup.passwordHash,
    collegeEmail: pendingSignup.collegeEmail,
    department: pendingSignup.department,
    rollNo: pendingSignup.rollNo,
    phone: pendingSignup.phone,
    bloodGroup: pendingSignup.bloodGroup,
    idCard: pendingSignup.idCard,
    idCardData: pendingSignup.idCardData,
    idCardMimeType: pendingSignup.idCardMimeType,
    idCardBack: pendingSignup.idCardBack,
    idCardBackData: pendingSignup.idCardBackData,
    idCardBackMimeType: pendingSignup.idCardBackMimeType,
    identityVerificationStatus: pendingSignup.identityVerificationStatus,
    identityVerificationScore: pendingSignup.identityVerificationScore,
    identityVerifiedAt: pendingSignup.identityVerifiedAt,
    role: 'user',
    isApproved: true,
    emailVerified: true
  });

  await user.save();

  const userProfile = new UserProfile({
    userId: user._id,
    username: user.username,
    collegeEmail: user.collegeEmail,
    department: user.department,
    phone: user.phone,
    verificationStatus: 'verified'
  });
  await userProfile.save();

  await PendingSignup.deleteOne({ _id: pendingSignup._id });

  return { user, userProfile };
};

const createOrRefreshLoginOtpChallenge = async (user) => {
  const now = Date.now();
  const existingChallenge = await EmailOtpChallenge.findOne({ collegeEmail: user.collegeEmail });

  if (existingChallenge && existingChallenge.otpCooldownUntil && existingChallenge.otpCooldownUntil.getTime() > now && existingChallenge.otpExpiresAt.getTime() > now) {
    return {
      challengeId: existingChallenge._id,
      collegeEmail: user.collegeEmail,
      maskedEmail: maskEmail(user.collegeEmail),
      cooldownSeconds: Math.ceil((existingChallenge.otpCooldownUntil.getTime() - now) / 1000),
      expiresInSeconds: Math.ceil((existingChallenge.otpExpiresAt.getTime() - now) / 1000),
      reused: true
    };
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(now + OTP_EXPIRY_MS);
  const otpCooldownUntil = new Date(now + OTP_COOLDOWN_MS);

  const challenge = await EmailOtpChallenge.findOneAndUpdate(
    { collegeEmail: user.collegeEmail },
    {
      collegeEmail: user.collegeEmail,
      userId: user._id,
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      otpCooldownUntil,
      updatedAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendVerificationOtpEmail({ to: user.collegeEmail, otp });

  return {
    challengeId: challenge._id,
    collegeEmail: user.collegeEmail,
    maskedEmail: maskEmail(user.collegeEmail),
    cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000),
    expiresInSeconds: Math.ceil(OTP_EXPIRY_MS / 1000),
    reused: false
  };
};

// Hardcoded admin credentials
const ADMIN_USERNAME = 'test';
const ADMIN_PASSWORD = 'test';

exports.login = async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Admin login: any User with role 'admin' can log in with their own
    // username/password. The original hardcoded test/test account is
    // preserved as a one-time bootstrap so existing access never breaks.
    if (userType === 'admin') {
      let adminUser = await User.findOne({ username, role: 'admin' });

      if (!adminUser) {
        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
          return res.status(400).json({ message: 'Invalid Username or Password' });
        }

        adminUser = await User.findOne({ username: ADMIN_USERNAME });
        if (!adminUser) {
          adminUser = new User({
            username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
            collegeEmail: 'admin@kongu.edu',
            department: 'Administration',
            rollNo: 'ADMIN001',
            phone: '9999999999',
            idCard: 'admin-id-card',
            role: 'admin',
            isAdmin: true,
            isApproved: true,
            emailVerified: true
          });
          await adminUser.save();
        } else {
          adminUser.role = 'admin';
          adminUser.isAdmin = true;
          adminUser.isApproved = true;
          adminUser.emailVerified = true;
          await adminUser.save();
        }
      } else {
        const isPasswordValid = await adminUser.comparePassword(password);
        if (!isPasswordValid) {
          return res.status(400).json({ message: 'Invalid Username or Password' });
        }
      }

      if (adminUser.isActive === false) {
        return res.status(403).json({ message: 'This admin account has been deactivated.' });
      }

      const token = jwt.sign({ userId: adminUser._id, isAdmin: true }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
      return res.json({ message: 'Admin Login Successful', token, userId: adminUser._id, isAdmin: true });
    }

    // Regular user login
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Username or Password' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid Username or Password' });
    }

    // Regular user login (role: 'user')
    if (user.role !== 'user') {
      return res.status(400).json({ message: 'Invalid Username or Password' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact the administrator.' });
    }

    if (user.emailVerified === false) {
      const challenge = await createOrRefreshLoginOtpChallenge(user);
      return res.status(202).json({
        otpRequired: true,
        message: 'Email not verified. OTP sent to your email.',
        challengeId: challenge.challengeId,
        collegeEmail: challenge.collegeEmail,
        maskedEmail: challenge.maskedEmail,
        cooldownSeconds: challenge.cooldownSeconds,
        expiresInSeconds: challenge.expiresInSeconds
      });
    }

    // approval flow disabled: allow login regardless of isApproved

    const token = jwt.sign({ userId: user._id, isAdmin: false }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    res.json({ message: 'Login Successful', token, userId: user._id, isAdmin: false });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.sendPhoneOtp = async (req, res) => {
  try {
    const payload = buildPhoneSignupPayload(req.body, req.files);

    if (payload.error) {
      return res.status(400).json({ message: payload.error });
    }

    const existingUser = await User.findOne({
      $or: [
        { collegeEmail: payload.collegeEmail },
        { username: payload.username },
        { rollNo: payload.rollNo },
        { phoneNumber: payload.phoneE164 }
      ]
    });

    if (existingUser) {
      if (existingUser.collegeEmail === payload.collegeEmail) return res.status(400).json({ message: 'Email is already registered' });
      if (existingUser.username === payload.username) return res.status(400).json({ message: 'Username is already taken' });
      if (existingUser.rollNo === payload.rollNo) return res.status(400).json({ message: 'Roll number is already registered' });
      return res.status(400).json({ message: 'Phone number is already registered' });
    }

    const pendingSignup = await PendingSignup.findOne({
      $or: [{ collegeEmail: payload.collegeEmail }, { phoneE164: payload.phoneE164 }]
    });
    const now = Date.now();

    if (pendingSignup && pendingSignup.otpCooldownUntil && pendingSignup.otpCooldownUntil.getTime() > now) {
      return res.status(429).json({
        message: 'Please wait before requesting another OTP',
        cooldownRemaining: Math.ceil((pendingSignup.otpCooldownUntil.getTime() - now) / 1000)
      });
    }

    // Identity verification runs before we touch Twilio or persist anything —
    // no SMS is sent and no signup record is created unless the ID card
    // matches the signup form.
    const verification = await runIdCardVerification(payload);
    if (!verification.ok) {
      return res.status(verification.statusCode).json({ message: verification.message });
    }

    await sendTwilioVerifySms({ phone: payload.phoneE164 });

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const otpCooldownUntil = new Date(now + OTP_COOLDOWN_MS);

    const upsertedPending = await PendingSignup.findOneAndUpdate(
      { collegeEmail: payload.collegeEmail },
      {
        username: payload.username,
        fullName: payload.fullName,
        passwordHash,
        department: payload.department,
        rollNo: payload.rollNo,
        phone: payload.phone,
        phoneE164: payload.phoneE164,
        collegeEmail: payload.collegeEmail,
        bloodGroup: payload.bloodGroup,
        idCard: payload.frontFile.originalname,
        idCardData: payload.frontFile.buffer,
        idCardMimeType: payload.frontFile.mimetype,
        idCardBack: payload.backFile.originalname,
        idCardBackData: payload.backFile.buffer,
        idCardBackMimeType: payload.backFile.mimetype,
        identityVerificationStatus: verification.result.state,
        identityVerificationScore: verification.result.score,
        identityVerifiedAt: new Date(),
        otpAttempts: 0,
        otpCooldownUntil,
        updatedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const devBypass = !isTwilioConfigured() && isDevMode();

    return res.status(200).json({
      message: devBypass
        ? 'Identity verified successfully. DEV MODE: OTP printed to backend console. Check your server terminal.'
        : 'Identity verified successfully. SMS verification code sent to your phone',
      pendingSignupId: upsertedPending._id,
      phone: payload.phoneE164,
      formattedPhone: formatPhoneDisplay(payload.phoneE164),
      cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000),
      expiresInSeconds: Math.ceil(OTP_EXPIRY_MS / 1000),
      devMode: devBypass
    });
  } catch (error) {
    console.error('Send phone OTP error:', error.message);
    if (isSmsDeliveryFailure(error)) {
      return res.status(502).json({ message: 'Unable to send verification SMS. Please check phone number and try again.' });
    }
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.verifyPhoneOtp = async (req, res) => {
  try {
    const pendingSignupId = normalizeText(req.body.pendingSignupId);
    const rawPhone = normalizeText(req.body.phone || req.body.phoneNumber);
    const otp = normalizeText(req.body.otp || req.body.code);

    if ((!pendingSignupId && !rawPhone) || !otp) {
      return res.status(400).json({ message: 'OTP and pending reference or phone number are required' });
    }

    const query = pendingSignupId
      ? { _id: pendingSignupId }
      : rawPhone
      ? { $or: [{ phoneE164: normalizePhoneE164(rawPhone) }, { phone: rawPhone }] }
      : null;

    const pendingSignup = await PendingSignup.findOne(query);
    if (!pendingSignup) {
      return res.status(404).json({ message: 'Pending verification session not found or expired.' });
    }

    if (pendingSignup.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many invalid attempts. Please request a new OTP.' });
    }

    const phoneToVerify = pendingSignup.phoneE164 || normalizePhoneE164(pendingSignup.phone);
    const verificationResult = await checkTwilioVerifyOtp({ phone: phoneToVerify, code: otp });

    if (!verificationResult.approved) {
      pendingSignup.otpAttempts += 1;
      await pendingSignup.save();

      if (pendingSignup.otpAttempts >= OTP_MAX_ATTEMPTS) {
        return res.status(429).json({ message: 'Too many invalid attempts. Please request a new OTP.' });
      }

      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    const existingUser = await User.findOne({
      $or: [
        { collegeEmail: pendingSignup.collegeEmail },
        { username: pendingSignup.username },
        { rollNo: pendingSignup.rollNo },
        { phoneNumber: phoneToVerify }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Account is already registered' });
    }

    const user = new User({
      username: pendingSignup.username,
      fullName: pendingSignup.fullName,
      password: pendingSignup.passwordHash,
      collegeEmail: pendingSignup.collegeEmail,
      department: pendingSignup.department,
      rollNo: pendingSignup.rollNo,
      phone: pendingSignup.phone,
      phoneNumber: phoneToVerify,
      bloodGroup: pendingSignup.bloodGroup,
      idCard: pendingSignup.idCard,
      idCardData: pendingSignup.idCardData,
      idCardMimeType: pendingSignup.idCardMimeType,
      idCardBack: pendingSignup.idCardBack,
      idCardBackData: pendingSignup.idCardBackData,
      idCardBackMimeType: pendingSignup.idCardBackMimeType,
      identityVerificationStatus: pendingSignup.identityVerificationStatus,
      identityVerificationScore: pendingSignup.identityVerificationScore,
      identityVerifiedAt: pendingSignup.identityVerifiedAt,
      role: 'user',
      isApproved: true,
      emailVerified: true,
      phoneVerified: true
    });

    await user.save();

    const userProfile = new UserProfile({
      userId: user._id,
      username: user.username,
      collegeEmail: user.collegeEmail,
      department: user.department,
      phone: user.phone,
      verificationStatus: 'verified'
    });
    await userProfile.save();

    await PendingSignup.deleteOne({ _id: pendingSignup._id });

    const token = jwt.sign({ userId: user._id, isAdmin: false }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

    let idCardUrl = null;
    if (user.idCardData && user.idCardData.length > 0) {
      const base64 = user.idCardData.toString('base64');
      const mimeType = user.idCardMimeType || 'image/png';
      idCardUrl = `data:${mimeType};base64,${base64}`;
    }

    return res.status(201).json({
      message: 'Phone verified and account created successfully',
      token,
      userId: user._id,
      profileId: userProfile._id,
      formattedPhone: formatPhoneDisplay(phoneToVerify),
      userData: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        collegeEmail: user.collegeEmail,
        department: user.department,
        rollNo: user.rollNo,
        phone: user.phone,
        phoneNumber: phoneToVerify,
        bloodGroup: user.bloodGroup,
        idCard: user.idCard,
        idCardUrl,
        emailVerified: true,
        phoneVerified: true,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Verify phone OTP error:', error.message);
    if (isSmsDeliveryFailure(error)) {
      return res.status(400).json({ message: 'Twilio OTP verification failed. Please try again.' });
    }
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.resendPhoneOtp = async (req, res) => {
  try {
    const pendingSignupId = normalizeText(req.body.pendingSignupId);
    const rawPhone = normalizeText(req.body.phone || req.body.phoneNumber);

    const query = pendingSignupId
      ? { _id: pendingSignupId }
      : rawPhone
      ? { $or: [{ phoneE164: normalizePhoneE164(rawPhone) }, { phone: rawPhone }] }
      : null;

    if (!query) {
      return res.status(400).json({ message: 'Pending signup reference or phone number required' });
    }

    const pendingSignup = await PendingSignup.findOne(query);
    if (!pendingSignup) {
      return res.status(404).json({ message: 'No pending verification found' });
    }

    const now = Date.now();
    if (pendingSignup.otpCooldownUntil && pendingSignup.otpCooldownUntil.getTime() > now) {
      return res.status(429).json({
        message: 'Please wait before requesting another OTP',
        cooldownRemaining: Math.ceil((pendingSignup.otpCooldownUntil.getTime() - now) / 1000)
      });
    }

    const phoneToVerify = pendingSignup.phoneE164 || normalizePhoneE164(pendingSignup.phone);
    await sendTwilioVerifySms({ phone: phoneToVerify });

    pendingSignup.otpAttempts = 0;
    pendingSignup.otpCooldownUntil = new Date(now + OTP_COOLDOWN_MS);
    await pendingSignup.save();

    return res.json({
      message: 'OTP resent successfully',
      pendingSignupId: pendingSignup._id,
      phone: phoneToVerify,
      formattedPhone: formatPhoneDisplay(phoneToVerify),
      cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000),
      expiresInSeconds: Math.ceil(OTP_EXPIRY_MS / 1000)
    });
  } catch (error) {
    console.error('Resend phone OTP error:', error.message);
    if (isSmsDeliveryFailure(error)) {
      return res.status(502).json({ message: 'Unable to send verification SMS. Please check phone number and try again.' });
    }
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.sendOtp = async (req, res) => {
  return exports.sendPhoneOtp(req, res);
};

exports.resendOtp = async (req, res) => {
  return exports.resendPhoneOtp(req, res);
};

exports.verifyOtp = async (req, res) => {
  return exports.verifyPhoneOtp(req, res);
};

exports.resendLoginOtp = async (req, res) => {
  try {
    const challengeId = normalizeText(req.body.challengeId);
    const collegeEmail = normalizeText(req.body.collegeEmail).toLowerCase();

    const query = challengeId ? { _id: challengeId } : collegeEmail ? { collegeEmail } : null;
    if (!query) {
      return res.status(400).json({ message: 'OTP challenge reference required' });
    }

    const challenge = await EmailOtpChallenge.findOne(query).populate('userId');
    if (!challenge) {
      return res.status(404).json({ message: 'OTP expired. Please request a new OTP.' });
    }

    const now = Date.now();
    if (challenge.otpCooldownUntil && challenge.otpCooldownUntil.getTime() > now) {
      return res.status(429).json({
        message: 'Please wait before requesting another OTP',
        cooldownRemaining: Math.ceil((challenge.otpCooldownUntil.getTime() - now) / 1000)
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(now + OTP_EXPIRY_MS);
    const otpCooldownUntil = new Date(now + OTP_COOLDOWN_MS);

    await sendVerificationOtpEmail({ to: challenge.collegeEmail, otp });

    challenge.otpHash = otpHash;
    challenge.otpExpiresAt = otpExpiresAt;
    challenge.otpAttempts = 0;
    challenge.otpCooldownUntil = otpCooldownUntil;
    await challenge.save();

    return res.json({
      message: 'OTP resent successfully',
      challengeId: challenge._id,
      collegeEmail: challenge.collegeEmail,
      maskedEmail: maskEmail(challenge.collegeEmail),
      cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000),
      expiresInSeconds: Math.ceil(OTP_EXPIRY_MS / 1000)
    });
  } catch (error) {
    console.error('Resend login OTP error:', error.message);
    if (isEmailDeliveryFailure(error)) {
      return res.status(502).json({ message: 'Unable to send verification code. Please try again.' });
    }
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.verifyLoginOtp = async (req, res) => {
  try {
    const challengeId = normalizeText(req.body.challengeId);
    const otp = normalizeText(req.body.otp);

    if (!challengeId || !otp) {
      return res.status(400).json({ message: 'OTP and challenge reference are required' });
    }

    const challenge = await EmailOtpChallenge.findById(challengeId).populate('userId');
    if (!challenge) {
      return res.status(404).json({ message: 'OTP expired. Please request a new OTP.' });
    }

    if (challenge.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many invalid attempts. Please request a new OTP.' });
    }

    if (challenge.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }

    const isOtpValid = await bcrypt.compare(otp, challenge.otpHash);
    if (!isOtpValid) {
      challenge.otpAttempts += 1;
      await challenge.save();

      if (challenge.otpAttempts >= OTP_MAX_ATTEMPTS) {
        return res.status(429).json({ message: 'Too many invalid attempts. Please request a new OTP.' });
      }

      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const user = challenge.userId && challenge.userId._id
      ? challenge.userId
      : await User.findById(challenge.userId || challenge.userIdId || challenge.user);

    if (!user) {
      return res.status(404).json({ message: 'Account not found. Please sign in again.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact the administrator.' });
    }

    user.emailVerified = true;
    await user.save();

    let userProfile = await UserProfile.findOne({ userId: user._id });
    if (userProfile) {
      userProfile.username = user.username;
      userProfile.collegeEmail = user.collegeEmail;
      userProfile.department = user.department;
      userProfile.phone = user.phone;
      userProfile.verificationStatus = 'verified';
      await userProfile.save();
    } else {
      userProfile = await UserProfile.create({
        userId: user._id,
        username: user.username,
        collegeEmail: user.collegeEmail,
        department: user.department,
        phone: user.phone,
        verificationStatus: 'verified'
      });
    }

    await EmailOtpChallenge.deleteOne({ _id: challenge._id });

    const token = jwt.sign({ userId: user._id, isAdmin: false }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

    let idCardUrl = null;
    if (user.idCardData && user.idCardData.length > 0) {
      const base64 = user.idCardData.toString('base64');
      const mimeType = user.idCardMimeType || 'image/png';
      idCardUrl = `data:${mimeType};base64,${base64}`;
    }

    return res.status(200).json({
      message: 'Email verified successfully',
      token,
      userId: user._id,
      profileId: userProfile._id,
      userData: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        collegeEmail: user.collegeEmail,
        department: user.department,
        rollNo: user.rollNo,
        phone: user.phone,
        bloodGroup: user.bloodGroup,
        idCard: user.idCard,
        idCardUrl,
        emailVerified: true,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Verify login OTP error:', error.message);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.signup = async (req, res) => {
  try {
    const regularPayload = buildRegularSignupPayload(req.body, req.files);
    if (regularPayload.error) {
      return res.status(400).json({ message: regularPayload.error });
    }

    const verification = await runIdCardVerification(regularPayload);
    if (!verification.ok) {
      return res.status(verification.statusCode).json({ message: verification.message });
    }

    const otpStartResult = await createOrRefreshPendingSignup(regularPayload, verification.result);
    if (otpStartResult.error) {
      return res.status(otpStartResult.statusCode || 400).json({
        message: otpStartResult.error,
        cooldownRemaining: otpStartResult.cooldownRemaining
      });
    }

    return res.status(200).json({
      message: 'OTP sent to your email',
      pendingSignupId: otpStartResult.pendingSignupId,
      collegeEmail: otpStartResult.collegeEmail,
      cooldownSeconds: otpStartResult.cooldownSeconds,
      expiresInSeconds: otpStartResult.expiresInSeconds
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let idCardUrl = null;

    // If the user has idCardData, convert to base64 data URL
    if (user.idCardData && user.idCardData.length > 0) {
      const base64 = user.idCardData.toString('base64');
      const mimeType = user.idCardMimeType || 'image/png';
      idCardUrl = `data:${mimeType};base64,${base64}`;
    }

    let idCardBackUrl = null;
    if (user.idCardBackData && user.idCardBackData.length > 0) {
      const base64Back = user.idCardBackData.toString('base64');
      const mimeTypeBack = user.idCardBackMimeType || 'image/png';
      idCardBackUrl = `data:${mimeTypeBack};base64,${base64Back}`;
    }

    res.json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      collegeEmail: user.collegeEmail,
      department: user.department,
      rollNo: user.rollNo,
      phone: user.phone,
      bloodGroup: user.bloodGroup,
      donationAvailability: user.donationAvailability,
      idCard: user.idCard,
      idCardUrl: idCardUrl,
      idCardBackUrl: idCardBackUrl,
      identityVerificationStatus: user.identityVerificationStatus,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Self-service blood donation availability toggle. Gated by isAuthenticated
// (route-level) and scoped to req.user.userId only — a user can never pass
// a different user id to change someone else's availability. Touches only
// the donationAvailability field; the existing bloodGroup field set at
// signup is never read or modified here.
exports.updateDonationAvailability = async (req, res) => {
  try {
    const { donationAvailability } = req.body;

    if (typeof donationAvailability !== 'boolean') {
      return res.status(400).json({ message: 'donationAvailability must be true or false.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { donationAvailability },
      { new: true, select: 'donationAvailability' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Blood donation availability updated successfully.',
      donationAvailability: user.donationAvailability
    });
  } catch (error) {
    console.error('Update donation availability error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getIdCard = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.idCardData) {
      return res.status(404).json({ message: 'ID Card not found' });
    }

    res.set('Content-Type', user.idCardMimeType || 'image/png');
    res.set('Content-Disposition', 'inline');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Send buffer directly as binary data
    res.send(user.idCardData);
  } catch (error) {
    console.error('Get ID card error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getIdCardBack = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.idCardBackData) {
      return res.status(404).json({ message: 'Back ID Card not found' });
    }

    res.set('Content-Type', user.idCardBackMimeType || 'image/png');
    res.set('Content-Disposition', 'inline');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    res.send(user.idCardBackData);
  } catch (error) {
    console.error('Get back ID card error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Debug endpoint to check specific user data
exports.checkUserData = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('username idCard idCardData idCardMimeType');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      username: user.username,
      idCard: user.idCard,
      idCardMimeType: user.idCardMimeType,
      idCardDataExists: !!user.idCardData,
      idCardDataSize: user.idCardData ? user.idCardData.length : 0,
      idCardDataType: user.idCardData ? typeof user.idCardData : 'none'
    });
  } catch (error) {
    console.error('Check user data error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Public stats endpoint for real-time dashboard data
exports.getPublicStats = async (req, res) => {
  try {
    const Product = require('../models/Product');
    const SaleRecord = require('../models/SaleRecord');
    
    // Get total active users (approved students + staff)
    const totalUsers = await User.countDocuments({ 
      isApproved: true,
      role: { $in: ['user', 'staff'] }
    });
    
    // Get total products listed
    const totalProducts = await Product.countDocuments({ isActive: true });
    
    // Get total completed sales
    const totalSales = await SaleRecord.countDocuments();
    
    // Calculate satisfaction rate based on product reviews
    const productsWithReviews = await Product.find({ totalReviews: { $gt: 0 } });
    let satisfactionRate = 98; // Default value
    if (productsWithReviews.length > 0) {
      const totalRatingSum = productsWithReviews.reduce((sum, p) => sum + (p.averageRating || 0), 0);
      const avgRating = totalRatingSum / productsWithReviews.length;
      satisfactionRate = Math.round((avgRating / 5) * 100);
    }
    
    res.json({
      activeStudents: totalUsers,
      itemsListed: totalProducts,
      satisfactionRate: satisfactionRate,
      totalSales: totalSales
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// SSO redirect: starts OAuth flow for supported providers
exports.ssoRedirect = (req, res) => {
  const provider = req.params.provider;
  const apiBase = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${apiBase}/api/auth/sso/google/callback`;
    const scope = encodeURIComponent('openid email profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent`;
    return res.redirect(authUrl);
  }

  if (provider === 'microsoft') {
    const clientId = process.env.MS_CLIENT_ID;
    const redirectUri = process.env.MS_REDIRECT_URI || `${apiBase}/api/auth/sso/microsoft/callback`;
    const scope = encodeURIComponent('openid email profile');
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${scope}`;
    return res.redirect(authUrl);
  }

  return res.status(400).json({ message: 'Unsupported SSO provider' });
};

// SSO callback: exchange code for token, get user info, sign-in/up user, return JWT
exports.ssoCallback = async (req, res) => {
  try {
    const provider = req.params.provider;
    const code = req.query.code;
    const apiBase = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!code) return res.status(400).json({ message: 'Missing code' });

    let tokenResponse, userInfo;

    if (provider === 'google') {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const params = new URLSearchParams();
      params.append('code', code);
      params.append('client_id', process.env.GOOGLE_CLIENT_ID);
      params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET);
      params.append('redirect_uri', process.env.GOOGLE_REDIRECT_URI || `${apiBase}/api/auth/sso/google/callback`);
      params.append('grant_type', 'authorization_code');

      tokenResponse = await safeFetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const tokenJson = await tokenResponse.json();
      const accessToken = tokenJson.access_token;

      const userRes = await safeFetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      userInfo = await userRes.json();
      // userInfo contains { sub, name, given_name, family_name, picture, email, email_verified }
    } else if (provider === 'microsoft') {
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      const params = new URLSearchParams();
      params.append('client_id', process.env.MS_CLIENT_ID);
      params.append('client_secret', process.env.MS_CLIENT_SECRET);
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', process.env.MS_REDIRECT_URI || `${apiBase}/api/auth/sso/microsoft/callback`);

      tokenResponse = await safeFetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const tokenJson = await tokenResponse.json();
      const accessToken = tokenJson.access_token;

      const userRes = await safeFetch('https://graph.microsoft.com/oidc/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      userInfo = await userRes.json();
      // userInfo contains { sub, name, email, ... }
    } else {
      return res.status(400).json({ message: 'Unsupported provider' });
    }

    // Normalize email and username
    const email = userInfo.email || userInfo.preferred_username || userInfo.upn;
    if (!email) return res.status(400).json({ message: 'SSO provider did not return an email' });

    // Find or create user
    let user = await User.findOne({ collegeEmail: email });
    if (!user) {
      const username = (email.split('@')[0] || `user${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '');
      user = new User({
        username,
        password: Math.random().toString(36).slice(2, 12), // random password
        collegeEmail: email,
        department: 'SSO',
        rollNo: `sso-${Date.now()}`,
        phone: '',
        bloodGroup: 'N/A',
        idCard: 'sso',
        role: 'user',
        isApproved: true
      });
      await user.save();
    }

    // Issue JWT
    const token = jwt.sign({ userId: user._id, isAdmin: !!user.isAdmin, isStaff: user.role === 'staff' }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

    // Redirect to frontend with token as query param (frontend should store it)
    const redirectTo = `${frontend}/?token=${token}`;
    return res.redirect(redirectTo);
  } catch (error) {
    console.error('SSO callback error:', error);
    return res.status(500).json({ message: 'SSO Error', error: error.message });
  }
};