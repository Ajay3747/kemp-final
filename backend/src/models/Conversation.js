const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },

  // Snapshots taken when the conversation is created, so the chat list still
  // shows something meaningful even if the product is later edited/removed.
  productTitle: { type: String, default: '' },
  productImageUrl: { type: String, default: '' },

  lastMessageText: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

conversationSchema.index({ buyerId: 1, sellerId: 1, productId: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
