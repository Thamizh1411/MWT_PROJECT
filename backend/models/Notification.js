const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
  read: { type: Boolean, default: false, index: true },
  type: { type: String, enum: ['booking', 'leave', 'system', 'auth'], default: 'system' }
});

module.exports = mongoose.model('Notification', notificationSchema);
