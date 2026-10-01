const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workerName: { type: String, required: true },
  profession: { type: String, required: true },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'completed', 'rated', 'cancelled', 'rejected'], 
    default: 'pending',
    index: true 
  },
  urgent: { type: Boolean, default: false },
  amount: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String },
  description: { type: String, required: true },
  location: { type: String, required: true },
  arrivalMessage: { type: String }
}, { timestamps: true });

// Compound index for worker booking slot conflict checks
bookingSchema.index({ workerId: 1, startTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
