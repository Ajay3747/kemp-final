const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  username: { type: String, required: true },
  collegeEmail: { type: String, required: true },
  department: { type: String, required: true },
  phone: { type: String },
  bio: { type: String, default: '' },
  productsListed: { type: Number, default: 0 },
  productsSold: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  successfulTransactions: { type: Number, default: 0 },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'unverified'], 
    default: 'pending' 
  },
  profileImage: { type: Buffer },
  profileImageMimeType: { type: String },
  joinDate: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  isBanned: { type: Boolean, default: false },
  totalPurchases: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
