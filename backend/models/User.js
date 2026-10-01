const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String },
  // OAuth fields
  oauthId: { type: String },
  oauthProvider: { type: String },
  role: { type: String, enum: ['user', 'worker', 'admin'], required: true, index: true },
  phone: { type: String, trim: true },
  address: { type: String }, // for users
  avatar: { type: String },
  isVerified: { type: Boolean, default: false }, // email verification status
  // Worker specific fields
  profession: { type: String, index: true },
  location: { type: String, index: true },
  hourlyRate: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  totalJobs: { type: Number, default: 0 },
  verified: { type: Boolean, default: false, index: true }, // admin approval status for workers
  skills: [{ type: String }],
  experience: { type: String },
  availability: { type: Boolean, default: true, index: true },
  documents: [{
    name: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
