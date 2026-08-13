const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Create purchase notification
router.post('/purchase', notificationController.createPurchaseNotification);

// Get all notifications for a user
router.get('/user/:userId', notificationController.getUserNotifications);

// Get unread count
router.get('/unread/:userId', notificationController.getUnreadCount);

// Mark as read
router.put('/read/:notificationId', notificationController.markAsRead);

// Delete notification
router.delete('/:notificationId', notificationController.deleteNotification);

module.exports = router;
