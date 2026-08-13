const mongoose = require('mongoose');

const pendingSignupSchema = new mongoose.Schema({
  collegeEmail: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  passwordHash: { type: String, required: true },
  department: { type: String, required: true },
  rollNo: { type: String, required: true },
  phone: { type: String, required: true },
  phoneE164: { type: String, index: true },
  bloodGroup: { type: String, required: true },
  idCard: { type: String, required: true },
  idCardData: { type: Buffer, required: true },
  idCardMimeType: { type: String, default: 'image/png' },
  idCardBack: { type: String, required: true },
  idCardBackData: { type: Buffer, required: true },
  idCardBackMimeType: { type: String, default: 'image/png' },
  identityVerificationStatus: { type: String, default: null },
  identityVerificationScore: { type: Number, default: null },
  identityVerifiedAt: { type: Date, default: null },
  otpHash: { type: String, default: '' },
  otpExpiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) },
  otpAttempts: { type: Number, default: 0 },
  otpCooldownUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

pendingSignupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PendingSignup', pendingSignupSchema);