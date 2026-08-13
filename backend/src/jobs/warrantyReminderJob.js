// KEMP's first periodic/scheduled task. No cron library exists in the
// project yet, and a days-scale reminder window doesn't need one — a plain
// daily interval is precise enough. Kept dependency-free on purpose.

const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const { computeWarrantyInfo } = require('../utils/warrantyMath');

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30 * 1000;

async function checkExpiringWarranties() {
  try {
    const orders = await Order.find({ status: 'COMPLETED' })
      .select('_id buyerId productId productTitle completedAt updatedAt')
      .lean();
    if (orders.length === 0) return;

    const productIds = orders.map((o) => o.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds }, warrantyAvailable: true })
      .select('warrantyDuration')
      .lean();
    const productById = {};
    products.forEach((p) => { productById[p._id.toString()] = p; });

    const now = new Date();

    for (const order of orders) {
      const product = order.productId ? productById[order.productId.toString()] : null;
      if (!product) continue;

      const purchaseDate = order.completedAt || order.updatedAt;
      const info = computeWarrantyInfo(new Date(purchaseDate), product.warrantyDuration, now);
      if (info.status !== 'Expiring Soon') continue;

      // One reminder per order — checked against existing Notification rows
      // rather than a new "reminded" flag, so nothing on Order/Product needs
      // to change to support this.
      const alreadySent = await Notification.exists({
        recipientId: order.buyerId,
        type: 'warranty_expiring',
        'metadata.orderId': order._id.toString()
      });
      if (alreadySent) continue;

      try {
        await Notification.create({
          recipientId: order.buyerId,
          // No "system" sender concept exists in this schema (senderId is
          // required) — the buyer's own id is used as a self-notification
          // placeholder, same as the system has no other option here.
          senderId: order.buyerId,
          productId: order.productId,
          type: 'warranty_expiring',
          title: 'Warranty expiring soon',
          message: `The warranty on "${order.productTitle}" is expiring soon.`,
          metadata: { orderId: order._id.toString(), warrantyOrderId: order._id.toString() }
        });
      } catch (err) {
        console.error('Failed to create warranty-expiry notification:', err);
      }
    }
  } catch (error) {
    console.error('Warranty reminder job failed:', error);
  }
}

function startWarrantyReminderJob() {
  // Delayed first run covers warranties that entered the "expiring soon"
  // window while the server was down; daily after that is plenty for a
  // window measured in days.
  setTimeout(checkExpiringWarranties, STARTUP_DELAY_MS);
  setInterval(checkExpiringWarranties, CHECK_INTERVAL_MS);
}

module.exports = { startWarrantyReminderJob, checkExpiringWarranties };
