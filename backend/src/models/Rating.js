const mongoose = require('mongoose');

// One rating per completed order — orderId is unique so a buyer can't rate
// the same deal twice; they update the existing rating instead.
const ratingSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Snapshots so a review still reads sensibly if the product/buyer changes later.
  buyerName: { type: String },
  productTitle: { type: String },

  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, default: '', trim: true, maxlength: 1000 },
}, { timestamps: true });

ratingSchema.index({ sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('Rating', ratingSchema);
