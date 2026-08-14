// Delivers a browser push notification for a Notification document, to
// every subscribed device of its recipient. Called from Notification.js's
// post('save')/post('insertMany') hooks — nothing in the 6 controllers/job
// that create notifications needs to know push exists.
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

let configured = null; // null = not checked yet, true/false = cached result

function ensureConfigured() {
  if (configured !== null) return configured;

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    configured = false;
    return false;
  }

  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@kemp.local', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

// Mirrors the click-through routing frontend/src/pages/Notifications.jsx's
// handleOpenNotification already does client-side — duplicated here because
// this runs server-side, before any page has loaded.
function buildClickThroughUrl(doc) {
  const meta = doc.metadata || {};
  if (meta.bloodRequestId) return `/blood-requests/${meta.bloodRequestId}`;
  if (meta.warrantyOrderId) return `/my-orders?tab=warranties`;
  if (meta.orderId) return `/my-orders?orderId=${meta.orderId}`;
  if (doc.type === 'message' && meta.conversationId) return `/chat/${meta.conversationId}`;
  return '/notifications';
}

async function deliverPush(notificationDoc) {
  if (!ensureConfigured()) return; // push not configured on this server — in-app notification still works
  if (!notificationDoc || !notificationDoc.recipientId) return;

  const subscriptions = await PushSubscription.find({ userId: notificationDoc.recipientId });
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: notificationDoc.title,
    body: notificationDoc.message,
    url: buildClickThroughUrl(notificationDoc)
  });

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Browser un-registered this subscription (uninstalled, cleared data, etc.) — stop trying.
        await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
      } else {
        console.error('Push send failed:', err.message);
      }
    }
  }));
}

module.exports = { deliverPush, ensureConfigured };
