const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/User');
const Product = require('../models/Product');
const { validateListingImage } = require('../services/imageModeration/imageValidation');

// Kept in one place so the frontend's <select> options and this backend
// validation can never silently drift apart.
const REPORT_REASONS = [
  'Scam/Fraud',
  'Fake Listing',
  'Harassment/Abuse',
  'Inappropriate Content',
  'Prohibited Item',
  'Misleading Information',
  'Other'
];

const MAX_EVIDENCE_FILES = 5;

// User-facing "Report User" submission. Any authenticated user (see
// isAuthenticated on the route) may call this — unlike the admin-only
// resolve/dismiss endpoints in adminController.js, which stay gated behind
// requireAdmin and are untouched by this feature.
exports.createReport = async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { reportedUserId, reason, description, listingId } = req.body;

    if (!reportedUserId || !mongoose.isValidObjectId(reportedUserId)) {
      return res.status(400).json({ message: 'A valid reported user is required.' });
    }

    // Never trust a frontend-side "you can't report yourself" check alone —
    // enforced here regardless of how the request was made.
    if (reportedUserId === reporterId) {
      return res.status(400).json({ message: 'You cannot report yourself.' });
    }

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ message: 'Please select a valid report reason.' });
    }

    const trimmedDescription = typeof description === 'string' ? description.trim() : '';
    if (!trimmedDescription) {
      return res.status(400).json({ message: 'Please describe the issue.' });
    }

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ message: 'Reported user not found.' });
    }

    let listing = null;
    if (listingId) {
      if (!mongoose.isValidObjectId(listingId)) {
        return res.status(400).json({ message: 'Invalid listing id.' });
      }
      listing = await Product.findById(listingId);
      if (!listing) {
        return res.status(404).json({ message: 'Listing not found.' });
      }
    }

    const files = req.files || [];
    if (files.length > MAX_EVIDENCE_FILES) {
      return res.status(400).json({ message: `You can attach up to ${MAX_EVIDENCE_FILES} evidence images.` });
    }

    // Reuses the exact same magic-byte/size/format validation as listing
    // image uploads — see services/imageModeration/imageValidation.js —
    // rather than a second, parallel file-type check for evidence.
    const evidence = [];
    for (const file of files) {
      const validation = validateListingImage(file);
      if (!validation.valid) {
        return res.status(400).json({ message: `Evidence file "${file.originalname}": ${validation.reason}` });
      }
      evidence.push(`data:${validation.detectedMime};base64,${file.buffer.toString('base64')}`);
    }

    const report = new Report({
      reporterId,
      reportedUserId,
      reportedProductId: listing ? listing._id : null,
      reportedUsername: reportedUser.username,
      reportedEmail: reportedUser.collegeEmail,
      reportedDepartment: reportedUser.department,
      reportedPhone: reportedUser.phone,
      reportedRollNo: reportedUser.rollNo,
      reason,
      reportText: trimmedDescription,
      evidence,
      status: 'OPEN'
    });

    await report.save();

    res.status(201).json({
      message: 'Report submitted successfully. Our team will review the report.',
      report: {
        _id: report._id,
        status: report.status,
        reason: report.reason,
        reportedAt: report.reportedAt
      }
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.REPORT_REASONS = REPORT_REASONS;
