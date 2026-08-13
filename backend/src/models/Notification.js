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
    enum: ['purchase_request', 'review', 'message', 'other', 'staff_report', 'community_post', 'community_like', 'community_comment', 'order_status_update', 'announcement'],
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

module.exports = mongoose.model('Notification', notificationSchema);
