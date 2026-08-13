const mongoose = require('mongoose');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['ACTIVE', 'FULFILLED', 'CANCELLED'];

const bloodRequestSchema = new mongoose.Schema({
  bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
  unitsRequired: { type: Number, required: true, min: 1 },
  urgency: { type: String, enum: URGENCY_LEVELS, default: 'MEDIUM' },
  location: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },

  // Who a responding donor should actually contact — this is the point of
  // the request, so it's shown to any donor who views it, unlike donor
  // identities below.
  contactName: { type: String, required: true, trim: true },
  contactPhone: { type: String, required: true, trim: true },
  contactEmail: { type: String, default: '', trim: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: STATUSES, default: 'ACTIVE' },

  // Donors who tapped "I Can Help". Never serialized to a non-manager —
  // see bloodRequestController's canManage gate on getRequest/getResponders.
  responders: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    respondedAt: { type: Date, default: Date.now }
  }],
  notifiedCount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bloodRequestSchema.index({ status: 1, bloodGroup: 1 });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
module.exports.BLOOD_GROUPS = BLOOD_GROUPS;
module.exports.URGENCY_LEVELS = URGENCY_LEVELS;
module.exports.STATUSES = STATUSES;
