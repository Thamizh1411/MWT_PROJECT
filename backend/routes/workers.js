const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

// Search & Filter verified and available workers
router.get('/', async (req, res, next) => {
  try {
    const { profession, location, minRating, search } = req.query;
    let query = { role: 'worker', verified: true, availability: true };

    if (profession) {
      query.profession = { $regex: profession, $options: 'i' };
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { profession: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const workers = await User.find(query)
      .select('-password')
      .sort({ rating: -1, totalJobs: -1 });

    res.json(workers);
  } catch (error) {
    next(error);
  }
});

// Get all verified workers without filters
router.get('/all', async (req, res, next) => {
  try {
    const workers = await User.find({ role: 'worker', verified: true })
      .select('-password')
      .sort({ rating: -1 });

    res.json(workers);
  } catch (error) {
    next(error);
  }
});

// Upload Worker Verification Documents (Aadhaar, Certificate, etc.)
router.post('/upload-documents', authorize('worker'), upload.array('documents', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No document files provided' });
    }

    const worker = await User.findById(req.user._id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const uploadedDocs = req.files.map(file => ({
      name: file.originalname,
      path: `/uploads/documents/${file.filename}`,
      uploadedAt: new Date()
    }));

    worker.documents = [...(worker.documents || []), ...uploadedDocs];
    await worker.save();

    res.json({
      success: true,
      message: `${uploadedDocs.length} document(s) uploaded successfully for verification review.`,
      documents: worker.documents
    });
  } catch (error) {
    next(error);
  }
});

// Get single worker by ID
router.get('/:id', async (req, res, next) => {
  try {
    const worker = await User.findOne({ _id: req.params.id, role: 'worker' })
      .select('-password');

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    res.json(worker);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
