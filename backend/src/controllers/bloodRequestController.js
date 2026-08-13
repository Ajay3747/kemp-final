const mongoose = require('mongoose');
const BloodRequest = require('../models/BloodRequest');
const { BLOOD_GROUPS, URGENCY_LEVELS } = require('../models/BloodRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Only ACTIVE -> FULFILLED and ACTIVE -> CANCELLED are allowed; both are
// terminal, same shape as Order's status lifecycle.
const VALID_STATUS_TRANSITIONS = { ACTIVE: ['FULFILLED', 'CANCELLED'], FULFILLED: [], CANCELLED: [] };

// POST /api/blood-requests — staff/admin only. Creates the request, matches
// donors the exact same way adminController.listBloodDonors does
// (donationAvailability: true + matching bloodGroup), and fans out one
// Notification per matching donor via the same insertMany pattern
// adminController.sendAnnouncement uses for broadcast announcements.
exports.createRequest = async (req, res) => {
  try {
    const { bloodGroup, unitsRequired, urgency, location, description, contactName, contactPhone, contactEmail } = req.body;

    if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ message: `bloodGroup must be one of: ${BLOOD_GROUPS.join(', ')}` });
    }
    const units = Number(unitsRequired);
    if (!Number.isFinite(units) || units < 1) {
      return res.status(400).json({ message: 'unitsRequired must be a positive number.' });
    }
    const urgencyValue = urgency || 'MEDIUM';
    if (!URGENCY_LEVELS.includes(urgencyValue)) {
      return res.status(400).json({ message: `urgency must be one of: ${URGENCY_LEVELS.join(', ')}` });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ message: 'location is required.' });
    }
    if (!contactName || !contactName.trim()) {
      return res.status(400).json({ message: 'contactName is required.' });
    }
    if (!contactPhone || !contactPhone.trim()) {
      return res.status(400).json({ message: 'contactPhone is required.' });
    }

    const request = await BloodRequest.create({
      bloodGroup,
      unitsRequired: units,
      urgency: urgencyValue,
      location: location.trim(),
      description: (description || '').trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: (contactEmail || '').trim(),
      createdBy: req.privilegedUser._id
    });

    const donors = await User.find({ donationAvailability: true, bloodGroup, isActive: { $ne: false } }).select('_id');
    if (donors.length > 0) {
      const docs = donors.map((donor) => ({
        recipientId: donor._id,
        senderId: req.privilegedUser._id,
        type: 'blood_request',
        title: `🩸 Urgent: ${bloodGroup} blood needed`,
        message: `${units} unit${units === 1 ? '' : 's'} needed at ${request.location}. Tap to see details and respond.`,
        metadata: { bloodRequestId: request._id.toString(), urgency: urgencyValue }
      }));
      await Notification.insertMany(docs);
      request.notifiedCount = docs.length;
      await request.save();
    }

    res.status(201).json({ message: `Request created — ${donors.length} matching donor${donors.length === 1 ? '' : 's'} notified.`, request });
  } catch (error) {
    console.error('Create blood request error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// GET /api/blood-requests — staff/admin management list. Never includes
// donor identities — just a count — same "don't expose donor PII by
// default" posture as the single-request view.
exports.listRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find().sort({ createdAt: -1 }).lean();
    const userId = req.user.userId;
    const isAdmin = req.privilegedUser.role === 'admin';

    const shaped = requests.map((r) => ({
      _id: r._id,
      bloodGroup: r.bloodGroup,
      unitsRequired: r.unitsRequired,
      urgency: r.urgency,
      location: r.location,
      description: r.description,
      contactName: r.contactName,
      contactPhone: r.contactPhone,
      contactEmail: r.contactEmail,
      status: r.status,
      createdAt: r.createdAt,
      notifiedCount: r.notifiedCount || 0,
      responderCount: (r.responders || []).length,
      canManage: isAdmin || r.createdBy.toString() === userId
    }));

    res.json(shaped);
  } catch (error) {
    console.error('List blood requests error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

async function computeCanManage(request, userId) {
  if (request.createdBy.toString() === userId) return true;
  const user = await User.findById(userId).select('role');
  return !!user && (user.role === 'admin' || user.role === 'staff');
}

// GET /api/blood-requests/:id — any authenticated user (a donor clicking
// through from their notification). Never returns the responders array
// itself, only a count — donor identities are gated behind canManage.
exports.getRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid request id.' });
    }

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const userId = req.user.userId;
    const canManage = await computeCanManage(request, userId);
    const hasResponded = request.responders.some((r) => r.userId.toString() === userId);

    res.json({
      _id: request._id,
      bloodGroup: request.bloodGroup,
      unitsRequired: request.unitsRequired,
      urgency: request.urgency,
      location: request.location,
      description: request.description,
      contactName: request.contactName,
      contactPhone: request.contactPhone,
      contactEmail: request.contactEmail,
      status: request.status,
      createdAt: request.createdAt,
      notifiedCount: request.notifiedCount || 0,
      responderCount: request.responders.length,
      hasResponded,
      canManage
    });
  } catch (error) {
    console.error('Get blood request error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// GET /api/blood-requests/:id/responders — the request creator or any
// admin/staff only. Reuses the exact field whitelist adminController's
// listBloodDonors already uses (no email), for the same "don't expose
// donor PII beyond what's already the existing pattern" reason.
exports.getResponders = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid request id.' });
    }

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const userId = req.user.userId;
    const canManage = await computeCanManage(request, userId);
    if (!canManage) {
      return res.status(403).json({ message: 'Only the request creator or an admin/staff member can view responders.' });
    }

    const responderIds = request.responders.map((r) => r.userId);
    const donors = await User.find({ _id: { $in: responderIds } })
      .select('username bloodGroup department year rollNo phone');
    const donorById = {};
    donors.forEach((d) => { donorById[d._id.toString()] = d; });

    const responders = request.responders.map((r) => {
      const donor = donorById[r.userId.toString()];
      return {
        _id: r.userId,
        username: donor?.username || 'Unknown',
        bloodGroup: donor?.bloodGroup,
        department: donor?.department,
        year: donor?.year,
        rollNo: donor?.rollNo,
        phone: donor?.phone,
        respondedAt: r.respondedAt
      };
    });

    res.json(responders);
  } catch (error) {
    console.error('Get blood request responders error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// POST /api/blood-requests/:id/respond — "I Can Help". Any authenticated
// user; idempotent (can't respond twice), and closed once the request is
// no longer ACTIVE — this is what "stop further notifications when
// fulfilled/cancelled" means in practice, since responses are the only
// ongoing donor-facing action a request can still receive after creation.
exports.respond = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid request id.' });
    }

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }
    if (request.status !== 'ACTIVE') {
      return res.status(400).json({ message: `This request is ${request.status.toLowerCase()} and can no longer accept responses.` });
    }

    const userId = req.user.userId;
    const alreadyResponded = request.responders.some((r) => r.userId.toString() === userId);
    if (alreadyResponded) {
      return res.status(409).json({ message: "You've already offered to help with this request." });
    }

    request.responders.push({ userId, respondedAt: new Date() });
    await request.save();

    try {
      const responder = await User.findById(userId).select('username');
      await Notification.create({
        recipientId: request.createdBy,
        senderId: userId,
        type: 'blood_request',
        title: 'A donor responded',
        message: `${responder?.username || 'A donor'} can help with the ${request.bloodGroup} blood request.`,
        metadata: { bloodRequestId: request._id.toString() }
      });
    } catch (err) {
      console.error('Failed to notify blood request creator:', err);
    }

    res.json({ message: 'Thanks for offering to help!', responderCount: request.responders.length });
  } catch (error) {
    console.error('Respond to blood request error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// PATCH /api/blood-requests/:id/status — staff/admin only, and only the
// request's own creator or a full admin (a staff member can't close another
// staff member's request).
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid request id.' });
    }
    if (!['FULFILLED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'status must be FULFILLED or CANCELLED.' });
    }

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const isOwner = request.createdBy.toString() === req.user.userId;
    if (!isOwner && req.privilegedUser.role !== 'admin') {
      return res.status(403).json({ message: 'Only the request creator or an admin can update this request.' });
    }

    const allowed = VALID_STATUS_TRANSITIONS[request.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Cannot change a ${request.status.toLowerCase()} request to ${status.toLowerCase()}.` });
    }

    request.status = status;
    request.updatedAt = new Date();
    await request.save();

    res.json({ message: `Request marked ${status.toLowerCase()}.`, request });
  } catch (error) {
    console.error('Update blood request status error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
