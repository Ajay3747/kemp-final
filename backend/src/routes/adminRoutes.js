const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Every route in this file is an Admin API — requireAdmin re-verifies the
// caller's role against the User document on every request.
router.use(requireAdmin);

// Dashboard / Analytics
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/recent-activity', adminController.getRecentActivity);

// Users
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserDetails);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/verify', adminController.verifyUser);
router.patch('/users/:id/status', adminController.setUserActive);
router.delete('/users/:id', adminController.deleteUser);

// Listings
router.get('/products', adminController.listAllProducts);
router.get('/products/:id', adminController.getProductDetails);
router.patch('/products/:id/remove', adminController.removeListing);
router.patch('/products/:id/restore', adminController.restoreListing);
router.patch('/products/:id/availability', adminController.setProductAvailability);

// Orders / Deals (read-only)
router.get('/orders', adminController.listAllOrders);

// Reports
router.get('/reports', adminController.listReports);
router.get('/reports/:id', adminController.getReportDetails);
router.patch('/reports/:id/resolve', adminController.resolveReport);
router.patch('/reports/:id/dismiss', adminController.dismissReport);

// Blood Donors
router.get('/blood-donors', adminController.listBloodDonors);

// Categories
router.get('/categories', adminController.listCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Announcements
router.post('/announcements', adminController.sendAnnouncement);
router.get('/announcements', adminController.listAnnouncements);

// Pinned Community notices (separate mechanism from the broadcast above)
router.post('/pinned-posts', adminController.pinAnnouncement);
router.get('/pinned-posts', adminController.listPinnedAnnouncements);
router.delete('/pinned-posts/:id', adminController.unpinAnnouncement);

module.exports = router;
