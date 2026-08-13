const express = require('express');
const orderController = require('../controllers/orderController');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', isAuthenticated, orderController.createOrder);
router.get('/buyer', isAuthenticated, orderController.getBuyerOrders);
router.get('/seller', isAuthenticated, orderController.getSellerOrders);
router.get('/:orderId', isAuthenticated, orderController.getOrder);
router.patch('/:orderId/status', isAuthenticated, orderController.updateOrderStatus);
router.patch('/:orderId/cancel', isAuthenticated, orderController.cancelOrder);
router.post('/history/delete', isAuthenticated, orderController.deleteHistoryRecords);

module.exports = router;
