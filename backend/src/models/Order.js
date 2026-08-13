const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'PROCESSING',
  'READY_FOR_HANDOVER',
  'COMPLETED',
  'CANCELLED'
];

const orderSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ORDER_STATUSES, default: 'PENDING', index: true },

  // Snapshots taken at order-creation time so the order stays meaningful even
  // if the product/user records change later.
  productTitle: { type: String },
  productImageUrl: { type: String },
  buyerName: { type: String },
  buyerEmail: { type: String },
  buyerPhone: { type: String },
  buyerRollNo: { type: String },
  sellerName: { type: String },
  sellerEmail: { type: String },
  sellerPhone: { type: String },

  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  cancelledAt: { type: Date, default: null },
  // Set the moment the seller accepts — the seller's phone number is only
  // ever revealed to the buyer once this is set, regardless of later status.
  acceptedAt: { type: Date, default: null },

  // Per-side "removed from history" flags. This is a visibility toggle only —
  // it never touches status/product fields, so a deleted history record still
  // exists in full for the other party and the order's real lifecycle is untouched.
  hiddenFromBuyerHistory: { type: Boolean, default: false },
  hiddenFromSellerHistory: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

orderSchema.index({ buyerId: 1, productId: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
