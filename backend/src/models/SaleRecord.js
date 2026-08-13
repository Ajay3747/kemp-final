const mongoose = require('mongoose');

const saleRecordSchema = new mongoose.Schema({
  // Product Information
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  salePrice: {
    type: Number,
    required: true,
    min: 0
  },

  // Buyer Information
  buyerName: {
    type: String,
    required: true,
    trim: true
  },
  buyerRollNumber: {
    type: String,
    required: true,
    trim: true
  },
  buyerPhone: {
    type: String,
    trim: true
  },

  // Seller Information
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerName: {
    type: String,
    required: true,
    trim: true
  },
  sellerRollNumber: {
    type: String,
    required: true,
    trim: true
  },

  // Sale Details
  saleDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'bank_transfer', 'other'],
    default: 'cash'
  },
  notes: {
    type: String,
    trim: true
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
saleRecordSchema.index({ sellerId: 1, createdAt: -1 });
saleRecordSchema.index({ saleDate: -1 });

const SaleRecord = mongoose.model('SaleRecord', saleRecordSchema);

module.exports = SaleRecord;
