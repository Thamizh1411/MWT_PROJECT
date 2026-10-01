const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const { sendBookingStatusEmail } = require('../utils/emailService');

const router = express.Router();

router.use(protect);

// Helper function to create notification safely
const createNotification = async (recipientId, senderId, message, type = 'booking') => {
  try {
    await Notification.create({
      recipientId,
      senderId,
      message,
      type
    });
  } catch (err) {
    console.error('[Notification Error]', err.message);
  }
};

// Get user's bookings (users: their created bookings; workers: jobs assigned to them; admin: all)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let bookings;
    if (role === 'admin') {
      bookings = await Booking.find({})
        .populate('userId', 'name email phone address')
        .populate('workerId', 'name profession hourlyRate rating phone')
        .sort({ createdAt: -1 });
    } else if (role === 'user') {
      bookings = await Booking.find({ userId })
        .populate('workerId', 'name profession hourlyRate rating phone avatar')
        .sort({ createdAt: -1 });
    } else if (role === 'worker') {
      bookings = await Booking.find({ workerId: userId })
        .populate('userId', 'name email phone address avatar')
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

// Create new booking (User only)
router.post('/', authorize('user'), async (req, res, next) => {
  try {
    const { workerId, startTime, urgent, description, location } = req.body;

    if (!workerId || !startTime || !description || !location) {
      return res.status(400).json({ success: false, message: 'Worker, start time, description, and location are required' });
    }

    const bookingStartTime = new Date(startTime);
    if (isNaN(bookingStartTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start time date format' });
    }

    if (bookingStartTime < new Date()) {
      return res.status(400).json({ success: false, message: 'Booking time cannot be in the past' });
    }

    // 1. Validate worker exists, is verified and available
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (!worker.verified) {
      return res.status(400).json({ success: false, message: 'This worker is not yet verified by Admin' });
    }

    if (!worker.availability) {
      return res.status(400).json({ success: false, message: 'This worker is currently unavailable for bookings' });
    }

    // 2. Double-booking check: Check if worker has an approved leave during this time
    const bookingDate = bookingStartTime;
    const bookingDayStart = new Date(bookingDate);
    bookingDayStart.setHours(0, 0, 0, 0);
    const bookingDayEnd = new Date(bookingDate);
    bookingDayEnd.setHours(23, 59, 59, 999);
    const leaveConflict = await LeaveRequest.findOne({
      workerId,
      status: 'approved',
      startDate: { $lte: bookingDayEnd },
      endDate: { $gte: bookingDayStart }
    });

    if (leaveConflict) {
      return res.status(400).json({
        success: false,
        message: `Worker is on approved leave from ${leaveConflict.startDate.toDateString()} to ${leaveConflict.endDate.toDateString()}`
      });
    }

    // 3. Double-booking check: Check if worker has existing pending/accepted booking within 2 hours window
    const windowStart = new Date(bookingStartTime.getTime() - 2 * 60 * 60 * 1000);
    const windowEnd = new Date(bookingStartTime.getTime() + 2 * 60 * 60 * 1000);

    const existingBooking = await Booking.findOne({
      workerId,
      status: { $in: ['pending', 'accepted'] },
      startTime: { $gte: windowStart, $lte: windowEnd }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This worker already has a booking scheduled around this time slot. Please choose another time.'
      });
    }

    const calculatedAmount = worker.hourlyRate ? worker.hourlyRate * 2 : 50;

    const booking = new Booking({
      userId: req.user._id,
      workerId,
      workerName: worker.name,
      profession: worker.profession || 'Service Specialist',
      startTime: bookingStartTime,
      urgent: Boolean(urgent),
      amount: calculatedAmount,
      description,
      location,
      status: 'pending'
    });

    await booking.save();

    // Create notification & send email to worker
    await createNotification(
      workerId,
      req.user._id,
      `New booking request from ${req.user.name} for ${description}`,
      'booking'
    );

    sendBookingStatusEmail(
      worker.email,
      worker.name,
      `New Booking Request received from ${req.user.name}`,
      `Date: ${bookingStartTime.toLocaleString()} | Location: ${location} | Job: ${description}`
    );

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

// Worker Accept Booking
router.put('/:id/accept', authorize('worker'), async (req, res, next) => {
  try {
    const { arrivalMessage } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.workerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to accept this booking' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking status is '${booking.status}' and cannot be accepted` });
    }

    booking.status = 'accepted';
    if (arrivalMessage) booking.arrivalMessage = arrivalMessage;
    await booking.save();

    // Notify user
    await createNotification(
      booking.userId,
      req.user._id,
      `${req.user.name} accepted your booking${arrivalMessage ? `. ${arrivalMessage}` : ''}`,
      'booking'
    );

    const user = await User.findById(booking.userId);
    if (user && user.email) {
      sendBookingStatusEmail(
        user.email,
        user.name,
        `${req.user.name} has ACCEPTED your service booking request.`,
        arrivalMessage ? `Note from Worker: "${arrivalMessage}"` : undefined
      );
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

// Worker Reject Booking (FIXED: Route added to resolve 404 issue)
router.put('/:id/reject', authorize('worker'), async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.workerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this booking' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Booking cannot be rejected' });
    }

    booking.status = 'rejected';
    await booking.save();

    // Notify user
    await createNotification(
      booking.userId,
      req.user._id,
      `${req.user.name} was unable to accept your booking request.`,
      'booking'
    );

    res.json({ success: true, message: 'Booking request rejected', booking });
  } catch (error) {
    next(error);
  }
});

// Worker Complete Booking
router.put('/:id/complete', authorize('worker'), async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.workerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to complete this booking' });
    }

    if (booking.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Only accepted bookings can be marked complete' });
    }

    booking.endTime = new Date();
    booking.status = 'completed';
    await booking.save();

    // Notify user
    await createNotification(
      booking.userId,
      req.user._id,
      `${req.user.name} has completed your service job. Please leave a rating and feedback!`,
      'booking'
    );

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

// User Rate and Review Worker
router.put('/:id/rate', authorize('user'), async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;
    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to rate this booking' });
    }

    if (booking.status !== 'completed' && booking.status !== 'rated') {
      return res.status(400).json({ success: false, message: 'Booking must be completed before rating' });
    }

    booking.rating = numericRating;
    booking.feedback = feedback || '';
    booking.status = 'rated';
    await booking.save();

    // Recalculate worker rating & totalJobs
    const worker = await User.findById(booking.workerId);
    if (worker) {
      const allRatedBookings = await Booking.find({ workerId: booking.workerId, status: 'rated' });
      const sum = allRatedBookings.reduce((acc, b) => acc + (b.rating || 0), 0);
      const avg = allRatedBookings.length > 0 ? (sum / allRatedBookings.length).toFixed(1) : numericRating;

      worker.rating = parseFloat(avg);
      worker.totalJobs = allRatedBookings.length;
      await worker.save();
    }

    res.json({ success: true, message: 'Rating submitted successfully', booking });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
