const express = require('express');
const bloodRequestController = require('../controllers/bloodRequestController');
const { isAuthenticated, requireStaffOrAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', requireStaffOrAdmin, bloodRequestController.createRequest);
router.get('/', requireStaffOrAdmin, bloodRequestController.listRequests);
router.get('/:id', isAuthenticated, bloodRequestController.getRequest);
router.get('/:id/responders', isAuthenticated, bloodRequestController.getResponders);
router.post('/:id/respond', isAuthenticated, bloodRequestController.respond);
router.patch('/:id/status', requireStaffOrAdmin, bloodRequestController.updateStatus);

module.exports = router;
