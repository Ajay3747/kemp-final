// Same dependency-free daily-interval pattern as warrantyReminderJob.js —
// no cron library needed for a days-scale window.

const Product = require('../models/Product');
const UserProfile = require('../models/UserProfile');
const Notification = require('../models/Notification');

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 60 * 1000;

async function expireStaleListings() {
  try {
    const now = new Date();
    const staleListings = await Product.find({
      isActive: true,
      status: 'AVAILABLE',
      expiresAt: { $lte: now }
    }).select('_id title price imageUrl sellerId');

    for (const product of staleListings) {
      try {
        product.isActive = false;
        product.autoExpired = true;
        product.updatedAt = now;
        await product.save();

        await UserProfile.findOneAndUpdate(
          { userId: product.sellerId },
          { $inc: { productsListed: -1 }, updatedAt: now }
        );

        await Notification.create({
          recipientId: product.sellerId,
          // No "system" sender concept exists in this schema (senderId is
          // required) — same self-notification placeholder used by
          // warrantyReminderJob.
          senderId: product.sellerId,
          productId: product._id,
          type: 'listing_expired',
          title: 'Your listing expired',
          message: `"${product.title}" was automatically taken down after 30 days with no activity. You can relist it anytime from My Listings.`,
          productDetails: { title: product.title, price: product.price, imageUrl: product.imageUrl },
          metadata: { productId: product._id.toString() }
        });
      } catch (err) {
        console.error(`Failed to expire listing ${product._id}:`, err);
      }
    }
  } catch (error) {
    console.error('Listing expiry job failed:', error);
  }
}

function startListingExpiryJob() {
  setTimeout(expireStaleListings, STARTUP_DELAY_MS);
  setInterval(expireStaleListings, CHECK_INTERVAL_MS);
}

module.exports = { startListingExpiryJob, expireStaleListings };
