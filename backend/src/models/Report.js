const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  reportingStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // The authenticated user who filed the report, for the general
  // user-to-user "Report User" flow (distinct from reportingStaffId above,
  // which predates it and is reserved for staff-initiated reports).
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reason: {
    type: String,
    enum: [
      'Scam/Fraud',
      'Fake Listing',
      'Harassment/Abuse',
      'Inappropriate Content',
      'Prohibited Item',
      'Misleading Information',
      'Other'
    ],
    default: null
  },
  // Evidence images, stored the same way listing photos already are in this
  // project (base64 data URI) — no cloud storage exists elsewhere to reuse.
  evidence: { type: [String], default: [] },
  reportedUsername: { type: String, required: true },
  reportedEmail: { type: String, default: '' },
  reportedDepartment: { type: String, default: '' },
  reportedPhone: { type: String, default: '' },
  reportedRollNo: { type: String, default: '' },
  reportingStaffUsername: { type: String, default: '' },
  reportText: { type: String, required: true },
  reportedAt: { type: Date, default: Date.now },

  // Admin resolution — reports move from OPEN to RESOLVED/DISMISSED, never deleted.
  status: { type: String, enum: ['OPEN', 'RESOLVED', 'DISMISSED'], default: 'OPEN' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
  resolutionNote: { type: String, default: '' }
});

module.exports = mongoose.model('Report', reportSchema);
