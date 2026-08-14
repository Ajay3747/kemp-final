const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  type: {
    type: String,
    enum: ['purchase_request', 'review', 'message', 'other', 'staff_report', 'community_post', 'community_like', 'community_comment', 'order_status_update', 'announcement', 'warranty_expiring', 'blood_request', 'listing_expired'],
    default: 'purchase_request'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  buyerDetails: {
    name: String,
    email: String,
    phone: String,
    rollNo: String,
    department: String
  },
  productDetails: {
    title: String,
    price: Number,
    imageUrl: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Every existing call site creates notifications via either Notification.create
// (post('save') fires) or Notification.insertMany (post('save') does NOT fire
// for insertMany — post('insertMany') is the separate hook Mongoose provides
// for that). Together these two cover all 11 current call sites (orderController,
// bloodRequestController, adminController, chatController, communityController,
// warrantyReminderJob) with zero changes needed to any of them — push delivery
// is a property of "a Notification got created," not something each feature
// has to remember to also do.
notificationSchema.post('save', function (doc) {
  const { deliverPush } = require('../services/pushService');
  deliverPush(doc).catch((err) => console.error('Push delivery failed:', err.message));
});

notificationSchema.post('insertMany', function (docs) {
  const { deliverPush } = require('../services/pushService');
  Promise.all(docs.map((doc) => deliverPush(doc).catch((err) => console.error('Push delivery failed:', err.message))));
});

module.exports = mongoose.model('Notification', notificationSchema);
