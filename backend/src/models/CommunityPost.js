const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const communityPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  type: { type: String, enum: ['general', 'lostfound', 'announcement'], default: 'general' },
  // 'found' is retained only so pre-existing documents keep validating —
  // the composer/API no longer allow creating new 'found' posts.
  lostFoundStatus: { type: String, enum: ['lost', 'found', 'resolved'], default: null },
  location: { type: String, default: '' },
  // Admin-only pinned notices (see adminController.pinAnnouncement) — a
  // separate, lightweight mechanism from the broadcast-to-everyone
  // Notification-based announcement system in adminController.
  isPinned: { type: Boolean, default: false },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommunityPost', communityPostSchema);
