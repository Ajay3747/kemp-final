const express = require('express');
const productController = require('../controllers/productController');
const multer = require('multer');
const { MAX_IMAGE_SIZE_BYTES } = require('../services/imageModeration/config');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE_BYTES } });
const { isAuthenticated, attachUserIfPresent } = require('../middleware/authMiddleware');

// Product endpoints
router.post('/create', upload.single('image'), productController.createProduct);
router.post('/moderate-image', isAuthenticated, upload.single('image'), productController.moderateImage);
router.get('/all', attachUserIfPresent, productController.getAllProducts);
router.get('/seller/:sellerId', productController.getProductsBySeller);
router.get('/:productId', productController.getProduct);
router.put('/:productId', isAuthenticated, productController.updateProduct);
router.delete('/:productId', isAuthenticated, productController.deleteProduct);
router.post('/:productId/review', productController.addReview);

// User profile endpoints
router.get('/profile/:userId', productController.getUserProfile);
router.put('/profile/:userId', productController.updateUserProfile);

module.exports = router;
