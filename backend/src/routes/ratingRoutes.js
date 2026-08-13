const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.post('/', isAuthenticated, ratingController.createRating);
router.put('/:ratingId', isAuthenticated, ratingController.updateRating);
router.get('/mine', isAuthenticated, ratingController.getMyRatings);
router.get('/summary', ratingController.getSellersRatingSummary);
router.get('/seller/:sellerId', ratingController.getSellerRatings);

module.exports = router;
