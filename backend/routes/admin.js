const express = require('express');
const { protect, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const { sendWorkerApprovalEmail } = require('../utils/emailService');

const router = express.Router();

router.use(protect, isAdmin);

// Approve Worker
router.post('/approve-worker/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ success: false, message: 'Invalid worker ID' });
    }

    const worker = await User.findById(id);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    worker.verified = true;
    worker.availability = true;
    await worker.save();

    // Create notification
    await Notification.create({
      recipientId: worker._id,
      senderId: req.user._id,
      message: 'Congratulations! Your worker profile has been verified and approved by Admin.',
      type: 'system'
    });

    // Send email notification
    sendWorkerApprovalEmail(worker.email, worker.name, true);

    res.json({ success: true, message: 'Worker approved successfully', worker });
  } catch (error) {
    next(error);
  }
});

// Reject Worker
router.post('/reject-worker/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ success: false, message: 'Invalid worker ID' });
    }

    const worker = await User.findById(id);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    worker.verified = false;
    worker.availability = false;
    await worker.save();

    await Notification.create({
      recipientId: worker._id,
      senderId: req.user._id,
      message: 'Your worker verification request was rejected by Admin.',
      type: 'system'
    });

    sendWorkerApprovalEmail(worker.email, worker.name, false);

    res.json({ success: true, message: 'Worker verification rejected', worker });
  } catch (error) {
    next(error);
  }
});

// Get pending workers
router.get('/pending-workers', async (req, res, next) => {
  try {
    const workers = await User.find({ role: 'worker', verified: false }).select('-password');
    res.json(workers);
  } catch (error) {
    next(error);
  }
});

// Get all workers
router.get('/workers', async (req, res, next) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('-password');
    res.json(workers);
  } catch (error) {
    next(error);
  }
});

// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password');
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Get all admins
router.get('/admins', async (req, res, next) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (error) {
    next(error);
  }
});

// Delete user or worker (for admin cleanup)
router.delete('/users/:id', async (req, res, next) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get all bookings for admin
router.get('/bookings', async (req, res, next) => {
  try {
    const bookings = await Booking.find({})
      .populate('userId', 'name email phone')
      .populate('workerId', 'name profession rating')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

// Get all leave requests for admin
router.get('/leave-requests', async (req, res, next) => {
  try {
    const leaveRequests = await LeaveRequest.find({})
      .populate('workerId', 'name email profession')
      .sort({ appliedAt: -1 });
    res.json(leaveRequests);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
