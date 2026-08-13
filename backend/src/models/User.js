const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const isBcryptHash = (value) => typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullName: { type: String, default: '' }, // legal name as printed on the institution ID card
  password: { type: String, required: true },
  collegeEmail: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  phoneNumber: { type: String },
  bloodGroup: { type: String, required: true },
  idCard: { type: String, required: true }, // front-side filename
  idCardData: {
    type: Buffer,
    default: null
  }, // front-side binary image data
  idCardMimeType: {
    type: String,
    default: 'image/png'
  },
  idCardBack: { type: String, default: null }, // back-side filename
  idCardBackData: { type: Buffer, default: null },
  idCardBackMimeType: { type: String, default: 'image/png' },
  role: { type: String, enum: ['user', 'staff', 'admin'], default: 'user' },
  isAdmin: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: true }, // Approval flow disabled — users auto-approved
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  identityVerificationStatus: {
    type: String,
    enum: ['VERIFIED', 'FAILED', 'NEEDS_REVIEW', null],
    default: null
  },
  identityVerificationScore: { type: Number, default: null },
  identityVerifiedAt: { type: Date, default: null },
  year: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },

  // Blood donation availability — opt-in, defaults to false ("Not
  // Available") for every existing and new user until they explicitly turn
  // it on from their own Profile page. Reuses the existing bloodGroup field
  // above for the actual blood type; this only tracks willingness to donate
  // right now.
  donationAvailability: { type: Boolean, default: false }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  if (isBcryptHash(this.password)) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);