const PushSubscription = require('../models/PushSubscription');
const { ensureConfigured } = require('../services/pushService');

// GET /api/push/vapid-public-key — public. The frontend needs this before it
// can call pushManager.subscribe(...).
exports.getVapidPublicKey = (req, res) => {
  if (!ensureConfigured()) {
    return res.status(503).json({ message: 'Push notifications are not configured on this server.' });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// POST /api/push/subscribe — saves (or refreshes) this browser's subscription
// for the logged-in user. Upserted by endpoint so re-subscribing the same
// device never creates a duplicate row.
exports.subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'A valid push subscription (endpoint + keys) is required.' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId: req.user.userId, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'Subscribed to push notifications.' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// POST /api/push/unsubscribe
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'endpoint is required.' });
    }
    await PushSubscription.deleteOne({ endpoint, userId: req.user.userId });
    res.json({ message: 'Unsubscribed from push notifications.' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
