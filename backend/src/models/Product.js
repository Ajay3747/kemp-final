const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  condition: { type: String, enum: ['new', 'like-new', 'used', 'fair'], default: 'used' },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerName: { type: String, required: true },
  sellerEmail: { type: String, required: true },
  sellerPhone: { type: String },
  imageUrl: { type: String },
  imageData: { type: Buffer },
  imageMimeType: { type: String },
  stockAvailable: { type: Number, default: 1 },
  warrantyAvailable: { type: Boolean, default: false },
  warrantyDuration: { type: String, default: null },
  status: { type: String, enum: ['AVAILABLE', 'RESERVED', 'SOLD'], default: 'AVAILABLE' },
  // Auto-expiry: listings still AVAILABLE past this date are soft-deactivated
  // by listingExpiryJob. autoExpired distinguishes that from a seller's own
  // manual delete, so only auto-expired listings can be one-click relisted.
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  autoExpired: { type: Boolean, default: false },
  // Bundle/lot listings: sold as one unit (one Deal Now, one Order), priced
  // as the sum of its items. `price`/`imageUrl` above stay the bundle total
  // and cover photo (first item's) so every existing card/list/detail view
  // that only reads those two fields keeps working unmodified.
  isBundle: { type: Boolean, default: false },
  bundleItems: [
    {
      title: { type: String, required: true },
      description: { type: String, default: '' },
      price: { type: Number, required: true },
      imageUrl: { type: String },
      imageMimeType: { type: String }
    }
  ],
  reviews: [
    {
      buyerId: mongoose.Schema.Types.ObjectId,
      buyerName: String,
      rating: Number,
      comment: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
