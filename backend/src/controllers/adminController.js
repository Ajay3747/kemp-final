const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Report = require('../models/Report');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const CommunityPost = require('../models/CommunityPost');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhone = (value) => /^\d{7,15}$/.test(String(value).replace(/\D/g, ''));

// ---------------------------------------------------------------------------
// Dashboard / Analytics
// ---------------------------------------------------------------------------

// Buckets documents into N weekly buckets by createdAt, entirely in JS —
// avoids depending on Mongo-version-specific aggregation date operators for
// what is a small-volume campus marketplace dataset.
async function weeklySeries(Model, matchStage, weeks, sumField) {
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
  const projection = sumField ? { createdAt: 1, [sumField]: 1 } : { createdAt: 1 };
  const docs = await Model.find({ ...matchStage, createdAt: { $gte: since } }, projection).lean();

  const buckets = Array.from({ length: weeks }, (_, i) => ({
    weekStart: new Date(since.getTime() + i * 7 * 24 * 60 * 60 * 1000),
    count: 0,
    value: 0
  }));

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  docs.forEach((doc) => {
    const idx = Math.min(weeks - 1, Math.max(0, Math.floor((new Date(doc.createdAt) - since) / weekMs)));
    buckets[idx].count += 1;
    if (sumField) buckets[idx].value += Number(doc[sumField]) || 0;
  });

  return buckets.map((b) => ({
    label: b.weekStart.toISOString().slice(0, 10),
    count: b.count,
    value: b.value
  }));
}

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalListings,
      activeListings,
      totalDeals,
      completedDeals,
      cancelledDeals,
      pendingReports,
      salesAgg
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      Product.countDocuments({}),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({}),
      Order.countDocuments({ status: 'COMPLETED' }),
      Order.countDocuments({ status: 'CANCELLED' }),
      Report.countDocuments({ status: 'OPEN' }),
      Order.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ])
    ]);

    const [userGrowth, listingGrowth, dealGrowth, salesGrowth] = await Promise.all([
      weeklySeries(User, { role: 'user' }, 8),
      weeklySeries(Product, {}, 8),
      weeklySeries(Order, {}, 8),
      weeklySeries(Order, { status: 'COMPLETED' }, 8, 'price')
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalListings,
      activeListings,
      totalDeals,
      completedDeals,
      cancelledDeals,
      totalSalesValue: salesAgg[0]?.total || 0,
      pendingReports,
      charts: { userGrowth, listingGrowth, dealGrowth, salesGrowth }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const [recentUsers, recentListings, recentDeals, recentReports] = await Promise.all([
      User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(5).select('username collegeEmail department createdAt isActive'),
      Product.find().sort({ createdAt: -1 }).limit(5).select('title sellerName price status isActive createdAt'),
      Order.find().sort({ createdAt: -1 }).limit(5).select('productTitle buyerName sellerName price status createdAt'),
      Report.find().sort({ reportedAt: -1 }).limit(5).select('reportedUsername reportText status reportedAt')
    ]);

    res.json({ recentUsers, recentListings, recentDeals, recentReports });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

exports.listUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const filter = {};

    if (role && ['user', 'admin', 'staff'].includes(role)) filter.role = role;
    if (status === 'active') filter.isActive = { $ne: false };
    if (status === 'inactive') filter.isActive = false;

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ username: regex }, { fullName: regex }, { collegeEmail: regex }, { rollNo: regex }];
    }

    const users = await User.find(filter).select('-password -idCardData -idCardBackData').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid user id.' });

    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    let idCardUrl = null;
    if (user.idCardData && user.idCardData.length > 0) {
      idCardUrl = `data:${user.idCardMimeType || 'image/png'};base64,${user.idCardData.toString('base64')}`;
    }
    let idCardBackUrl = null;
    if (user.idCardBackData && user.idCardBackData.length > 0) {
      idCardBackUrl = `data:${user.idCardBackMimeType || 'image/png'};base64,${user.idCardBackData.toString('base64')}`;
    }

    const plain = user.toObject();
    delete plain.idCardData;
    delete plain.idCardBackData;

    res.json({ ...plain, idCardUrl, idCardBackUrl });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const phone = (req.body.phone || '').trim();
    const registerNo = (req.body.registerNo || '').trim();
    const department = (req.body.department || '').trim();
    const year = (req.body.year || '').trim();
    const password = req.body.password || '';
    const role = req.body.role === 'admin' ? 'admin' : 'user';

    if (!name || !email || !phone || !registerNo || !department || !password) {
      return res.status(400).json({ message: 'Name, email, phone, register number, department, and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: 'Enter a valid phone number.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ $or: [{ username: name }, { collegeEmail: email }, { rollNo: registerNo }] });
    if (existing) {
      if (existing.collegeEmail === email) return res.status(409).json({ message: 'Email is already registered.' });
      if (existing.rollNo === registerNo) return res.status(409).json({ message: 'Register number is already registered.' });
      return res.status(409).json({ message: 'A user with this name already exists.' });
    }

    const user = new User({
      username: name,
      fullName: name,
      password, // hashed automatically by the User pre-save hook
      collegeEmail: email,
      department,
      rollNo: registerNo,
      phone,
      year,
      bloodGroup: 'N/A',
      idCard: 'admin-created',
      role,
      isAdmin: role === 'admin',
      isApproved: true,
      emailVerified: true,
      isActive: true
    });

    await user.save();

    const plain = user.toObject();
    delete plain.password;
    res.status(201).json({ message: 'User created successfully.', user: plain });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid user id.' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const { name, email, phone, registerNo, department, year, role } = req.body;

    if (email && email.trim().toLowerCase() !== user.collegeEmail) {
      const newEmail = email.trim().toLowerCase();
      if (!isValidEmail(newEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
      const clash = await User.findOne({ collegeEmail: newEmail, _id: { $ne: id } });
      if (clash) return res.status(409).json({ message: 'Email is already registered.' });
      user.collegeEmail = newEmail;
    }

    if (registerNo && registerNo.trim() !== user.rollNo) {
      const clash = await User.findOne({ rollNo: registerNo.trim(), _id: { $ne: id } });
      if (clash) return res.status(409).json({ message: 'Register number is already registered.' });
      user.rollNo = registerNo.trim();
    }

    if (phone) {
      if (!isValidPhone(phone)) return res.status(400).json({ message: 'Enter a valid phone number.' });
      user.phone = phone.trim();
    }
    if (name) {
      user.username = name.trim();
      user.fullName = name.trim();
    }
    if (department) user.department = department.trim();
    if (year !== undefined) user.year = year.trim();
    if (role && ['user', 'admin'].includes(role)) {
      user.role = role;
      user.isAdmin = role === 'admin';
    }

    await user.save();
    const plain = user.toObject();
    delete plain.password;
    res.json({ message: 'User updated successfully.', user: plain });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid user id.' });

    const user = await User.findByIdAndUpdate(
      id,
      { identityVerificationStatus: 'VERIFIED', identityVerifiedAt: new Date() },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.json({ message: 'User verified successfully.', user });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.setUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid user id.' });
    if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive (boolean) is required.' });

    if (id === req.adminUser._id.toString() && !isActive) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`, user });
  } catch (error) {
    console.error('Set user active error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid user id.' });

    if (id === req.adminUser._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: 'User not found.' });

    if (target.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last remaining admin account.' });
      }
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully.', deletedUserId: id });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

exports.listAllProducts = async (req, res) => {
  try {
    const { search, category, sellerId, status, availability } = req.query;
    const filter = {};

    if (category && category !== 'All') filter.category = category;
    if (sellerId && isValidObjectId(sellerId)) filter.sellerId = sellerId;
    if (status === 'active') filter.isActive = true;
    if (status === 'removed') filter.isActive = false;
    if (availability && ['AVAILABLE', 'RESERVED', 'SOLD'].includes(availability)) filter.status = availability;
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: regex }, { description: regex }, { sellerName: regex }];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('List all products error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product id.' });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    res.json(product);
  } catch (error) {
    console.error('Get product details error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.removeListing = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product id.' });

    const product = await Product.findByIdAndUpdate(id, { isActive: false, updatedAt: new Date() }, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    res.json({ message: 'Listing removed.', product });
  } catch (error) {
    console.error('Remove listing error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.restoreListing = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product id.' });

    const product = await Product.findByIdAndUpdate(id, { isActive: true, updatedAt: new Date() }, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    res.json({ message: 'Listing restored.', product });
  } catch (error) {
    console.error('Restore listing error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.setProductAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product id.' });
    if (!['AVAILABLE', 'RESERVED', 'SOLD'].includes(status)) {
      return res.status(400).json({ message: 'status must be one of AVAILABLE, RESERVED, SOLD.' });
    }

    const product = await Product.findByIdAndUpdate(id, { status, updatedAt: new Date() }, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    res.json({ message: 'Product availability updated.', product });
  } catch (error) {
    console.error('Set product availability error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Orders / Deals (read-only — see plan: admin monitors, never mutates orders)
// ---------------------------------------------------------------------------

exports.listAllOrders = async (req, res) => {
  try {
    const { status, buyerId, sellerId, dateFrom, dateTo, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (buyerId && isValidObjectId(buyerId)) filter.buyerId = buyerId;
    if (sellerId && isValidObjectId(sellerId)) filter.sellerId = sellerId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ productTitle: regex }, { buyerName: regex }, { sellerName: regex }];
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('List all orders error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

exports.listReports = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ['OPEN', 'RESOLVED', 'DISMISSED'].includes(status)) filter.status = status;

    const reports = await Report.find(filter)
      .populate('reportedUserId', 'username collegeEmail rollNo isActive')
      .populate('reportedProductId', 'title isActive status')
      .populate('resolvedBy', 'username')
      .populate('reporterId', 'username collegeEmail')
      .sort({ reportedAt: -1 });

    res.json(reports);
  } catch (error) {
    console.error('List reports error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getReportDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid report id.' });

    const report = await Report.findById(id)
      .populate('reportedUserId', 'username collegeEmail rollNo isActive')
      .populate('reportedProductId', 'title isActive status')
      .populate('resolvedBy', 'username')
      .populate('reporterId', 'username collegeEmail');
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    res.json(report);
  } catch (error) {
    console.error('Get report details error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNote } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid report id.' });

    const report = await Report.findByIdAndUpdate(
      id,
      { status: 'RESOLVED', resolvedBy: req.adminUser._id, resolvedAt: new Date(), resolutionNote: resolutionNote || '' },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    res.json({ message: 'Report resolved.', report });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.dismissReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNote } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid report id.' });

    const report = await Report.findByIdAndUpdate(
      id,
      { status: 'DISMISSED', resolvedBy: req.adminUser._id, resolvedAt: new Date(), resolutionNote: resolutionNote || '' },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    res.json({ message: 'Report dismissed.', report });
  } catch (error) {
    console.error('Dismiss report error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Blood Donors
// ---------------------------------------------------------------------------

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Only ever returns users who currently have donationAvailability: true —
// a user who switches to "Not Available" stops matching this filter on
// their very next read, with no separate list to keep in sync. Gated by
// requireAdmin at the router level (see adminRoutes.js), same as every
// other endpoint in this file.
exports.listBloodDonors = async (req, res) => {
  try {
    const { bloodGroup, department } = req.query;

    // $ne: false (not a strict isActive: true) also matches legacy user
    // documents that predate the isActive field — same pattern used above
    // in listUsers's "active" filter, for the same reason.
    const filter = { donationAvailability: true, isActive: { $ne: false } };

    if (bloodGroup && BLOOD_GROUPS.includes(bloodGroup)) {
      filter.bloodGroup = bloodGroup;
    }
    if (department && typeof department === 'string' && department.trim()) {
      filter.department = department.trim();
    }

    const donors = await User.find(filter)
      .select('username bloodGroup department year rollNo phone')
      .sort({ username: 1 });

    res.json(donors);
  } catch (error) {
    console.error('List blood donors error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

exports.listCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({ category: new RegExp(`^${escapeRegex(cat.name)}$`, 'i') });
        return { ...cat.toObject(), productCount };
      })
    );
    res.json(withCounts);
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();
    if (!name) return res.status(400).json({ message: 'Category name is required.' });

    const existing = await Category.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
    if (existing) return res.status(409).json({ message: 'A category with this name already exists.' });

    const category = await Category.create({ name, description });
    res.status(201).json({ message: 'Category created.', category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid category id.' });

    const { name, description } = req.body;
    const update = { updatedAt: new Date() };
    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description.trim();

    if (update.name) {
      const clash = await Category.findOne({ name: new RegExp(`^${escapeRegex(update.name)}$`, 'i'), _id: { $ne: id } });
      if (clash) return res.status(409).json({ message: 'A category with this name already exists.' });
    }

    const category = await Category.findByIdAndUpdate(id, update, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found.' });

    res.json({ message: 'Category updated.', category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid category id.' });

    const category = await Category.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });

    res.json({ message: 'Category deleted.', deletedCategoryId: id });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Announcements (reuses the existing Notification model — no new system)
// ---------------------------------------------------------------------------

exports.sendAnnouncement = async (req, res) => {
  try {
    const title = (req.body.title || '').trim();
    const message = (req.body.message || '').trim();
    if (!title || !message) return res.status(400).json({ message: 'Title and message are required.' });

    const students = await User.find({ role: 'user', isActive: { $ne: false } }).select('_id');
    if (students.length === 0) {
      return res.status(200).json({ message: 'No active students to notify.', recipientCount: 0 });
    }

    const announcementId = new mongoose.Types.ObjectId().toString();
    const docs = students.map((student) => ({
      recipientId: student._id,
      senderId: req.adminUser._id,
      type: 'announcement',
      title,
      message,
      metadata: { announcementId }
    }));

    await Notification.insertMany(docs);
    res.status(201).json({ message: 'Announcement sent.', recipientCount: docs.length, announcementId });
  } catch (error) {
    console.error('Send announcement error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.listAnnouncements = async (req, res) => {
  try {
    const announcements = await Notification.aggregate([
      { $match: { type: 'announcement' } },
      {
        $group: {
          _id: '$metadata.announcementId',
          title: { $first: '$title' },
          message: { $first: '$message' },
          senderId: { $first: '$senderId' },
          createdAt: { $first: '$createdAt' },
          recipientCount: { $sum: 1 }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json(announcements);
  } catch (error) {
    console.error('List announcements error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Pinned Community notices — deliberately separate from the broadcast
// announcements above. Those push a Notification to every student; these
// just pin a notice at the top of the Community board itself, for anyone
// who visits it. Backed by CommunityPost (type: 'announcement', isPinned),
// not Notification, so the two systems can't be confused with one another.
// ---------------------------------------------------------------------------

exports.pinAnnouncement = async (req, res) => {
  try {
    const title = (req.body.title || '').trim();
    const content = (req.body.content || '').trim();
    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    const post = await CommunityPost.create({
      userId: req.adminUser._id,
      username: req.adminUser.username,
      title,
      content,
      type: 'announcement',
      isPinned: true
    });

    res.status(201).json({ message: 'Notice pinned to Community board.', post });
  } catch (error) {
    console.error('Pin announcement error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.listPinnedAnnouncements = async (req, res) => {
  try {
    const posts = await CommunityPost.find({ type: 'announcement', isPinned: true })
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error('List pinned announcements error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.unpinAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await CommunityPost.findOneAndDelete({ _id: id, type: 'announcement' });
    if (!post) {
      return res.status(404).json({ message: 'Pinned notice not found.' });
    }
    res.json({ message: 'Notice unpinned.' });
  } catch (error) {
    console.error('Unpin announcement error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
