const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Admin = require('../models/Admin');
const OTP = require('../models/OTP');
const upload = require('../middleware/upload');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/emailService');

const router = express.Router();

// Generate a random 6-digit string OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

// Register user or worker
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address, profession, location, hourlyRate, skills, experience } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
    }

    if (!['user', 'worker'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      phone,
      address: role === 'user' ? address : undefined,
      profession: role === 'worker' ? profession : undefined,
      location: role === 'worker' ? location : undefined,
      hourlyRate: role === 'worker' ? (parseFloat(hourlyRate) || 0) : undefined,
      skills: role === 'worker' ? (Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : [])) : undefined,
      experience: role === 'worker' ? experience : undefined,
      isVerified: false, // requires OTP verification
      verified: role === 'worker' ? false : true, // workers require admin approval
      availability: role === 'worker' ? false : true
    });

    await user.save();

    // Generate & store OTP (5 minutes expiration)
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ email: email.toLowerCase() });
    await OTP.create({
      email: email.toLowerCase(),
      otp: hashOTP(otpCode),
      expiresAt
    });

    // Send OTP email
    await sendOTPEmail(email.toLowerCase(), otpCode);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email using the OTP sent to your inbox.',
      email: user.email,
      requiresOtp: true
    });
  } catch (error) {
    next(error);
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const otpRecord = await OTP.findOne({ email: email.toLowerCase(), otp: hashOTP(otp.trim()) });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Mark user email as verified
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isVerified = true;
    await user.save();

    // Delete OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    // Send Welcome email
    await sendWelcomeEmail(user.email, user.name);

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'jwt_secret_dev_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    const { password: _, ...userData } = user.toObject();

    res.json({
      success: true,
      message: 'Email verified successfully!',
      user: userData,
      token
    });
  } catch (error) {
    next(error);
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ email: email.toLowerCase() });
    await OTP.create({
      email: email.toLowerCase(),
      otp: hashOTP(otpCode),
      expiresAt
    });

    await sendOTPEmail(email.toLowerCase(), otpCode);

    res.json({
      success: true,
      message: 'A new OTP has been sent to your email.'
    });
  } catch (error) {
    next(error);
  }
});

// Login for all roles (user, worker, admin)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    let isAdminUser = false;

    if (!user) {
      user = await Admin.findOne({ email: email.toLowerCase() });
      isAdminUser = true;
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if email is verified (if user is not admin)
    if (!isAdminUser && user.isVerified === false) {
      // Auto-resend OTP for convenience
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await OTP.deleteMany({ email: email.toLowerCase() });
      await OTP.create({ email: email.toLowerCase(), otp: hashOTP(otpCode), expiresAt });
      await sendOTPEmail(email.toLowerCase(), otpCode);

      return res.status(403).json({
        success: false,
        requiresOtp: true,
        email: user.email,
        message: 'Your email address is not verified. A new OTP has been sent to your inbox.'
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role || 'admin' },
      process.env.JWT_SECRET || 'jwt_secret_dev_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    const { password: _, ...userData } = user.toObject();

    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token
    });
  } catch (error) {
    next(error);
  }
});

// Current User Profile
router.get('/me', protect, async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
});

// Update Profile
router.put('/profile', protect, async (req, res, next) => {
  try {
    const editableFields = req.user.role === 'admin'
      ? ['name']
      : req.user.role === 'worker'
      ? ['name', 'phone', 'address', 'profession', 'location', 'hourlyRate', 'skills', 'experience', 'availability']
      : ['name', 'phone', 'address'];
    const updates = Object.fromEntries(
      editableFields
        .filter((field) => Object.prototype.hasOwnProperty.call(req.body, field))
        .map((field) => [field, req.body[field]])
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No editable profile fields provided' });
    }

    if (req.user.role === 'worker' && updates.hourlyRate !== undefined) {
      const hourlyRate = Number(updates.hourlyRate);
      if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
        return res.status(400).json({ success: false, message: 'Hourly rate must be a non-negative number' });
      }
      updates.hourlyRate = hourlyRate;
    }

    const ProfileModel = req.user.role === 'admin' ? Admin : User;
    const user = await ProfileModel.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    next(error);
  }
});

// Upload Profile Avatar
router.post('/profile/upload-avatar', protect, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const avatarUrl = `/uploads/profiles/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true }).select('-password');

    res.json({ success: true, message: 'Profile avatar updated', avatar: avatarUrl, user });
  } catch (error) {
    next(error);
  }
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({ success: false, message: 'Google OAuth not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ success: false, message: 'Google OAuth not configured' });
    }
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login` })(req, res, next);
  },
  (req, res) => {
    try {
      const token = jwt.sign(
        { id: req.user._id, role: req.user.role },
        process.env.JWT_SECRET || 'jwt_secret_dev_key',
        { expiresIn: '30d' }
      );
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${token}`);
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
    }
  }
);

module.exports = router;
