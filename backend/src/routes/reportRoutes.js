const express = require('express');
const multer = require('multer');
const reportController = require('../controllers/reportController');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { MAX_IMAGE_SIZE_BYTES } = require('../services/imageModeration/config');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE_BYTES } });

// User-facing report creation — distinct from /api/admin/reports (view/
// resolve/dismiss), which stays admin-only and untouched. Any logged-in
// user may file a report; isAuthenticated is mandatory here, not optional.
router.post('/', isAuthenticated, upload.array('evidence', 5), reportController.createReport);

module.exports = router;
