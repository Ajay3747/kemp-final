const mongoose = require('mongoose');
const Rating = require('../models/Rating');
const Order = require('../models/Order');

// Buyer rates the seller of one of their completed orders. One rating per
// order (enforced by the unique index on Rating.orderId) — resubmitting for
// the same order should hit updateRating instead.
const createRating = async (req, res) => {
  try {
    const { orderId, rating, review } = req.body;
    const buyerId = req.user.userId;

    const ratingValue = Number(rating);
    if (!orderId || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ message: 'A valid orderId and rating (1-5) are required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.buyerId.toString() !== buyerId) {
      return res.status(403).json({ message: 'Only the buyer of this order can rate it' });
    }
    if (order.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'You can only rate a seller after the order is completed' });
    }
    if (order.sellerId.toString() === buyerId) {
      return res.status(400).json({ message: 'You cannot rate yourself' });
    }

    const newRating = await Rating.create({
      orderId: order._id,
      productId: order.productId,
      buyerId,
      sellerId: order.sellerId,
      buyerName: order.buyerName,
      productTitle: order.productTitle,
      rating: ratingValue,
      review: (review || '').trim()
    });

    res.status(201).json({ message: 'Rating submitted successfully', rating: newRating });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already rated this order. Update your existing rating instead.' });
    }
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Buyer updates a rating they previously submitted.
const updateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { rating, review } = req.body;
    const buyerId = req.user.userId;

    const ratingValue = Number(rating);
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ message: 'Rating must be a whole number between 1 and 5' });
    }

    const existing = await Rating.findById(ratingId);
    if (!existing) {
      return res.status(404).json({ message: 'Rating not found' });
    }
    if (existing.buyerId.toString() !== buyerId) {
      return res.status(403).json({ message: 'You can only update your own rating' });
    }

    existing.rating = ratingValue;
    existing.review = (review || '').trim();
    await existing.save();

    res.json({ message: 'Rating updated successfully', rating: existing });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Ratings the current user (as buyer) has submitted — lets the UI show
// "Rate Seller" vs "Edit Rating" per order without one lookup per row.
const getMyRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ buyerId: req.user.userId })
      .select('orderId rating review sellerId createdAt updatedAt');
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Public: average rating, total count, and recent reviews for one seller —
// average/total are always computed fresh from the Rating collection.
const getSellerRatings = async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ message: 'Invalid sellerId' });
    }
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const [agg] = await Rating.aggregate([
      { $match: { sellerId: sellerObjectId } },
      { $group: { _id: '$sellerId', averageRating: { $avg: '$rating' }, totalRatings: { $sum: 1 } } }
    ]);

    const ratings = await Rating.find({ sellerId: sellerObjectId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      averageRating: agg ? Math.round(agg.averageRating * 10) / 10 : 0,
      totalRatings: agg ? agg.totalRatings : 0,
      ratings
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// Public: batch average/total for many sellers at once, e.g. { "<id>": { averageRating, totalRatings } }
// so the store grid isn't making one request per store card.
const getSellersRatingSummary = async (req, res) => {
  try {
    const idsParam = req.query.sellerIds || '';
    const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
    const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return res.json({});
    }

    const agg = await Rating.aggregate([
      { $match: { sellerId: { $in: objectIds } } },
      { $group: { _id: '$sellerId', averageRating: { $avg: '$rating' }, totalRatings: { $sum: 1 } } }
    ]);

    const summary = {};
    agg.forEach((entry) => {
      summary[entry._id.toString()] = {
        averageRating: Math.round(entry.averageRating * 10) / 10,
        totalRatings: entry.totalRatings
      };
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

module.exports = {
  createRating,
  updateRating,
  getMyRatings,
  getSellerRatings,
  getSellersRatingSummary
};
