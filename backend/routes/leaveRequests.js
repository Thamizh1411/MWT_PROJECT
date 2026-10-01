const express = require('express');
const { protect, isAdmin } = require('../middleware/auth');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendLeaveStatusEmail } = require('../utils/emailService');

const router = express.Router();

router.use(protect);

// Get leave requests (worker: own; admin: all)
router.get('/', async (req, res, next) => {
  try {
    const role = req.user.role;
    let leaveRequests;

    if (role === 'admin') {
      leaveRequests = await LeaveRequest.find({})
        .populate('workerId', 'name email profession')
        .sort({ appliedAt: -1 });
    } else if (role === 'worker') {
      leaveRequests = await LeaveRequest.find({ workerId: req.user._id })
        .sort({ appliedAt: -1 });
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json(leaveRequests);
  } catch (error) {
    next(error);
  }
});

// Create new leave request (Worker only)
router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({ success: false, message: 'Only workers can create leave requests' });
    }

    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Start date, end date, and reason are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    if (start > end) {
      return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
    }

    // Check for overlapping leave requests for this worker
    const overlapping = await LeaveRequest.findOne({
      workerId: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active or pending leave request for this date range'
      });
    }

    const leaveRequest = new LeaveRequest({
      workerId: req.user._id,
      startDate: start,
      endDate: end,
      reason
    });

    await leaveRequest.save();
    res.status(201).json(leaveRequest);
  } catch (error) {
    next(error);
  }
});

// Admin Approve Leave Request
router.put('/admin/:id/approve', protect, isAdmin, async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Leave request is already ${leaveRequest.status}` });
    }

    leaveRequest.status = 'approved';
    await leaveRequest.save();

    // Create notification
    await Notification.create({
      recipientId: leaveRequest.workerId,
      senderId: req.user._id,
      message: `Your leave request from ${leaveRequest.startDate.toDateString()} to ${leaveRequest.endDate.toDateString()} has been APPROVED.`,
      type: 'leave'
    });

    // Send email
    const worker = await User.findById(leaveRequest.workerId);
    if (worker && worker.email) {
      sendLeaveStatusEmail(worker.email, worker.name, 'APPROVED', leaveRequest.startDate, leaveRequest.endDate);
    }

    res.json(leaveRequest);
  } catch (error) {
    next(error);
  }
});

// Admin Reject Leave Request
router.put('/admin/:id/reject', protect, isAdmin, async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Leave request is already ${leaveRequest.status}` });
    }

    leaveRequest.status = 'rejected';
    await leaveRequest.save();

    // Create notification
    await Notification.create({
      recipientId: leaveRequest.workerId,
      senderId: req.user._id,
      message: `Your leave request from ${leaveRequest.startDate.toDateString()} to ${leaveRequest.endDate.toDateString()} has been REJECTED.`,
      type: 'leave'
    });

    // Send email
    const worker = await User.findById(leaveRequest.workerId);
    if (worker && worker.email) {
      sendLeaveStatusEmail(worker.email, worker.name, 'REJECTED', leaveRequest.startDate, leaveRequest.endDate);
    }

    res.json(leaveRequest);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
