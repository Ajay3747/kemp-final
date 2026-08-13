const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { isValidTransition, isTerminalStatus, BUYER_NOTIFICATION_MESSAGES, ALLOWED_TRANSITIONS } = require('../services/orderStatus');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Statuses a seller (or the shared /status route) is allowed to set directly.
// PENDING is the only status the system itself sets, at order creation.
const SELLER_SETTABLE_STATUSES = ['ACCEPTED', 'REJECTED', 'PROCESSING', 'READY_FOR_HANDOVER', 'COMPLETED', 'CANCELLED'];

async function notifyBuyer(order, status) {
  const message = BUYER_NOTIFICATION_MESSAGES[status];
  if (!message) return;

  try {
    await Notification.create({
      recipientId: order.buyerId,
      senderId: order.sellerId,
      productId: order.productId,
      type: 'order_status_update',
      title: `Order ${status.replace(/_/g, ' ')}`,
      message,
      productDetails: {
        title: order.productTitle,
        price: order.price,
        imageUrl: order.productImageUrl
      },
      metadata: { orderId: order._id.toString(), status }
    });
  } catch (err) {
    // Notification failure must never roll back a status update that already
    // persisted correctly in MongoDB — log and move on.
    console.error('Failed to create buyer notification:', err);
  }
}

async function notifySeller(order, title, message) {
  try {
    await Notification.create({
      recipientId: order.sellerId,
      senderId: order.buyerId,
      productId: order.productId,
      type: 'order_status_update',
      title,
      message,
      productDetails: {
        title: order.productTitle,
        price: order.price,
        imageUrl: order.productImageUrl
      },
      metadata: { orderId: order._id.toString(), status: order.status }
    });
  } catch (err) {
    console.error('Failed to create seller notification:', err);
  }
}

// POST /api/orders — buyer clicks "Deal Now"
exports.createOrder = async (req, res) => {
  try {
    const buyerId = req.user.userId;
    const { productId } = req.body;

    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({ message: 'A valid productId is required.' });
    }

    // Atomically flip AVAILABLE -> RESERVED. This is the actual duplicate-order
    // guard: if two buyers click Deal Now at the same instant, only the update
    // that finds status still AVAILABLE succeeds — the loser gets product=null
    // here and is rejected below, before any order is ever created.
    const product = await Product.findOneAndUpdate(
      { _id: productId, isActive: true, status: 'AVAILABLE' },
      { $set: { status: 'RESERVED', updatedAt: new Date() } },
      { new: true }
    );

    if (!product) {
      const exists = await Product.exists({ _id: productId });
      if (!exists) {
        return res.status(404).json({ message: 'Product not found.' });
      }
      return res.status(409).json({ message: 'This product is no longer available.' });
    }

    // From here on, any early return must release the reservation we just
    // took — otherwise the product is stuck RESERVED with no order behind it.
    const releaseReservation = () => Product.findByIdAndUpdate(productId, { status: 'AVAILABLE', updatedAt: new Date() }).catch((err) => {
      console.error('Failed to release product reservation:', err);
    });

    const sellerId = product.sellerId.toString();
    if (sellerId === buyerId) {
      await releaseReservation();
      return res.status(400).json({ message: 'You cannot deal on your own product.' });
    }

    try {
      const [buyer, seller] = await Promise.all([
        User.findById(buyerId),
        User.findById(sellerId)
      ]);
      if (!buyer) {
        await releaseReservation();
        return res.status(404).json({ message: 'Buyer account not found.' });
      }
      if (!seller) {
        await releaseReservation();
        return res.status(404).json({ message: 'Seller account not found.' });
      }

      const order = await Order.create({
        productId: product._id,
        buyerId,
        sellerId,
        price: product.price, // price is taken from MongoDB, never from the request body
        status: 'PENDING',
        productTitle: product.title,
        productImageUrl: product.imageUrl,
        buyerName: buyer.username,
        buyerEmail: buyer.collegeEmail,
        buyerPhone: buyer.phone,
        buyerRollNo: buyer.rollNo,
        sellerName: seller.username,
        sellerEmail: seller.collegeEmail,
        sellerPhone: seller.phone
      });

      // Notify the seller — reuses the same Notification model/shape the
      // existing (frontend-triggered) purchase notification used. Kept as a
      // plain alert (no buyer/price details in the title or message) since the
      // full order — buyer contact, price, accept/reject — lives in
      // My Orders -> Selling History, not in the notification itself.
      try {
        await Notification.create({
          recipientId: sellerId,
          senderId: buyerId,
          productId: product._id,
          type: 'purchase_request',
          title: `🛒 New Deal Request`,
          message: `Someone wants to buy your "${product.title}".`,
          buyerDetails: {
            name: buyer.username,
            email: buyer.collegeEmail,
            phone: buyer.phone,
            rollNo: buyer.rollNo,
            department: buyer.department
          },
          productDetails: {
            title: product.title,
            price: product.price,
            imageUrl: product.imageUrl
          },
          metadata: { orderId: order._id.toString(), status: 'PENDING' }
        });
      } catch (notifyErr) {
        console.error('Failed to notify seller of new order:', notifyErr);
      }

      res.status(201).json({ message: 'Deal created successfully', order });
    } catch (innerError) {
      await releaseReservation();
      throw innerError;
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// The seller's phone is only ever visible to the buyer on their own order,
// and only once the seller has accepted it. Mutates a plain object (never the
// live Mongoose document), so callers must pass the result of .toObject()/.lean().
function withBuyerPhoneGate(plainOrder) {
  if (!plainOrder.acceptedAt) {
    delete plainOrder.sellerPhone;
  }
  return plainOrder;
}

// GET /api/orders/buyer — orders placed by the logged-in user
exports.getBuyerOrders = async (req, res) => {
  try {
    const buyerId = req.user.userId;
    const orders = await Order.find({ buyerId, hiddenFromBuyerHistory: { $ne: true } })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(orders.map(withBuyerPhoneGate));
  } catch (error) {
    console.error('Get buyer orders error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// GET /api/orders/seller — orders received by the logged-in user's listings
exports.getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const orders = await Order.find({ sellerId, hiddenFromSellerHistory: { $ne: true } }).sort({ updatedAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// GET /api/orders/:orderId
exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const userId = req.user.userId;
    const isBuyer = order.buyerId.toString() === userId;
    const isSeller = order.sellerId.toString() === userId;
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'You are not authorized to view this order.' });
    }

    // Sellers see their own phone number regardless — only gate it for buyers.
    res.json(isBuyer ? withBuyerPhoneGate(order) : order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// PATCH /api/orders/:orderId/status — seller-only, dynamic status update
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }

    if (!status || !SELLER_SETTABLE_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${SELLER_SETTABLE_STATUSES.join(', ')}` });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Only the seller associated with this specific order may change its status.
    if (order.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only the seller of this order can update its status.' });
    }

    if (!isValidTransition(order.status, status)) {
      return res.status(400).json({
        message: `Cannot transition order from ${order.status} to ${status}.`,
        allowedNextStatuses: ALLOWED_TRANSITIONS[order.status] || []
      });
    }

    order.status = status;
    order.updatedAt = new Date();
    if (status === 'CANCELLED') {
      order.cancelledBy = req.user.userId;
      order.cancelledAt = new Date();
    }
    if (status === 'ACCEPTED') {
      // Marks the point the seller's phone number becomes visible to the
      // buyer on this order — sticky even if the order is later cancelled.
      order.acceptedAt = new Date();
    }
    await order.save();

    // COMPLETED -> permanently SOLD, stays hidden from the store.
    // REJECTED/CANCELLED (seller-initiated) -> release the reservation so the
    // product reappears in the Dealing listing for other buyers.
    if (status === 'COMPLETED') {
      await Product.findByIdAndUpdate(order.productId, {
        status: 'SOLD',
        isActive: false,
        updatedAt: new Date()
      });
    } else if (status === 'REJECTED' || status === 'CANCELLED') {
      await Product.findByIdAndUpdate(order.productId, {
        status: 'AVAILABLE',
        isActive: true,
        updatedAt: new Date()
      });
    }

    await notifyBuyer(order, status);

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// PATCH /api/orders/:orderId/cancel — buyer-initiated cancel ("Cancel Deal")
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order id.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const userId = req.user.userId;
    if (order.buyerId.toString() !== userId) {
      return res.status(403).json({ message: 'Only the buyer who placed this deal can cancel it.' });
    }

    if (isTerminalStatus(order.status)) {
      return res.status(400).json({ message: `This order is already ${order.status.toLowerCase()} and cannot be cancelled.` });
    }

    order.status = 'CANCELLED';
    order.cancelledBy = userId;
    order.cancelledAt = new Date();
    order.updatedAt = new Date();
    await order.save();

    // Release the reservation Deal Now took, so the product reappears in the
    // Dealing listing for other buyers. Product is only ever SOLD after
    // COMPLETED, which is terminal and unreachable here — the guard covers
    // RESERVED (the normal case) and is a harmless no-op otherwise.
    const product = await Product.findById(order.productId);
    if (product && product.status !== 'AVAILABLE' && product.status !== 'SOLD') {
      product.status = 'AVAILABLE';
      product.isActive = true;
      product.updatedAt = new Date();
      await product.save();
    }

    await notifySeller(order, 'Deal cancelled by buyer', `${order.buyerName || 'The buyer'} cancelled the deal for "${order.productTitle}".`);

    res.json({ message: 'Deal cancelled successfully', order });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// POST /api/orders/history/delete — remove selected records from the
// caller's own Selling History / Purchase History view (bulk, "Select All").
// This only flips a per-side visibility flag — it never touches order
// status, cancellation, or product availability, and the order still exists
// in full for whichever party did not delete it.
exports.deleteHistoryRecords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'orderIds must be a non-empty array.' });
    }

    const validIds = orderIds.filter(isValidObjectId);
    if (validIds.length === 0) {
      return res.status(400).json({ message: 'No valid order ids were provided.' });
    }

    const orders = await Order.find({ _id: { $in: validIds } }, { buyerId: 1, sellerId: 1 });

    const buyerSideIds = [];
    const sellerSideIds = [];
    for (const order of orders) {
      if (order.buyerId.toString() === userId) {
        buyerSideIds.push(order._id);
      } else if (order.sellerId.toString() === userId) {
        sellerSideIds.push(order._id);
      }
      // Orders the caller is neither buyer nor seller on are silently
      // skipped — never touched, never reported as deleted.
    }

    if (buyerSideIds.length) {
      await Order.updateMany({ _id: { $in: buyerSideIds } }, { $set: { hiddenFromBuyerHistory: true } });
    }
    if (sellerSideIds.length) {
      await Order.updateMany({ _id: { $in: sellerSideIds } }, { $set: { hiddenFromSellerHistory: true } });
    }

    const deletedIds = [...buyerSideIds, ...sellerSideIds].map((id) => id.toString());
    res.json({ message: 'History records removed.', deletedIds });
  } catch (error) {
    console.error('Delete history records error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
