const express = require('express');
const authController = require('../controllers/authController');
const multer = require('multer');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Student signup uploads a front+back ID card pair.
const idCardUpload = upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]);

router.post('/login', authController.login);
router.post('/send-phone-otp', idCardUpload, authController.sendPhoneOtp);
router.post('/verify-phone-otp', authController.verifyPhoneOtp);
router.post('/resend-phone-otp', authController.resendPhoneOtp);
router.post('/send-otp', idCardUpload, authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/resend-login-otp', authController.resendLoginOtp);
router.post('/verify-login-otp', authController.verifyLoginOtp);
router.post('/signup', idCardUpload, authController.signup);
router.get('/user/:id', authController.getUser);
router.patch('/donation-availability', isAuthenticated, authController.updateDonationAvailability);
router.get('/idcard/:id', authController.getIdCard);
router.get('/idcard-back/:id', authController.getIdCardBack);
router.get('/check-user/:id', authController.checkUserData);

// SSO routes (Google, Microsoft)
router.get('/sso/:provider', authController.ssoRedirect);
router.get('/sso/:provider/callback', authController.ssoCallback);

// Public stats endpoint
router.get('/stats', authController.getPublicStats);

module.exports = router;
