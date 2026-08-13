const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Product = require('../models/Product');
const User = require('../models/User');
const Notification = require('../models/Notification');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// POST /api/chat/conversations — "Chat with Seller" on the product page
exports.getOrCreateConversation = async (req, res) => {
  try {
    const buyerId = req.user.userId;
    const { sellerId, productId } = req.body;

    if (!sellerId || !isValidObjectId(sellerId)) {
      return res.status(400).json({ message: 'A valid sellerId is required.' });
    }
    if (sellerId === buyerId) {
      return res.status(400).json({ message: 'You cannot start a chat with yourself.' });
    }

    const seller = await User.findById(sellerId).select('username');
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found.' });
    }

    let product = null;
    if (productId) {
      if (!isValidObjectId(productId)) {
        return res.status(400).json({ message: 'Invalid productId.' });
      }
      product = await Product.findById(productId).select('title imageUrl');
    }

    const filter = {
      buyerId,
      sellerId,
      productId: product ? product._id : null
    };

    let conversation = await Conversation.findOne(filter);
    if (!conversation) {
      conversation = await Conversation.create({
        ...filter,
        productTitle: product?.title || '',
        productImageUrl: product?.imageUrl || ''
      });
    }

    res.status(200).json({ conversation });
  } catch (error) {
    console.error('Get or create conversation error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// GET /api/chat/conversations — list the caller's conversations
exports.listConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      $or: [{ buyerId: userId }, { sellerId: userId }]
    })
      .sort({ lastMessageAt: -1 })
      .populate('buyerId', 'username')
      .populate('sellerId', 'username')
      .lean();

    const conversationIds = conversations.map((c) => c._id);
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          read: false,
          senderId: { $ne: new mongoose.Types.ObjectId(userId) }
        }
      },
      { $group: { _id: '$conversationId', count: { $sum: 1 } } }
    ]);
    const unreadMap = new Map(unreadCounts.map((u) => [u._id.toString(), u.count]));

    const result = conversations.map((c) => ({
      ...c,
      otherParty: c.buyerId?._id?.toString() === userId ? c.sellerId : c.buyerId,
      unreadCount: unreadMap.get(c._id.toString()) || 0
    }));

    res.json(result);
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// GET /api/chat/conversations/:conversationId/messages
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const userId = req.user.userId;
    const isBuyer = conversation.buyerId.toString() === userId;
    const isSeller = conversation.sellerId.toString() === userId;
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'You are not part of this conversation.' });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    // Opening the thread marks the other party's messages as read.
    await Message.updateMany(
      { conversationId, senderId: { $ne: userId }, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// POST /api/chat/conversations/:conversationId/messages
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const userId = req.user.userId;
    const isBuyer = conversation.buyerId.toString() === userId;
    const isSeller = conversation.sellerId.toString() === userId;
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'You are not part of this conversation.' });
    }

    const message = await Message.create({
      conversationId,
      senderId: userId,
      text: text.trim()
    });

    conversation.lastMessageText = message.text;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    const recipientId = isBuyer ? conversation.sellerId : conversation.buyerId;

    try {
      const sender = await User.findById(userId).select('username');
      await Notification.create({
        recipientId,
        senderId: userId,
        productId: conversation.productId,
        type: 'message',
        title: `New message from ${sender?.username || 'a user'}`,
        message: message.text.length > 80 ? `${message.text.slice(0, 80)}...` : message.text,
        productDetails: {
          title: conversation.productTitle,
          imageUrl: conversation.productImageUrl
        },
        metadata: { conversationId: conversation._id.toString() }
      });
    } catch (notifyErr) {
      console.error('Failed to notify recipient of new message:', notifyErr);
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
