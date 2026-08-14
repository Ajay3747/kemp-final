const express = require('express');
const pushController = require('../controllers/pushController');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/vapid-public-key', pushController.getVapidPublicKey);
router.post('/subscribe', isAuthenticated, pushController.subscribe);
router.post('/unsubscribe', isAuthenticated, pushController.unsubscribe);

module.exports = router;
