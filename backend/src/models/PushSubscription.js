const mongoose = require('mongoose');

// One document per browser/device a user has enabled push on. `endpoint` is
// unique per browser install (assigned by the browser's push service), so
// re-subscribing the same device upserts rather than duplicating.
const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
