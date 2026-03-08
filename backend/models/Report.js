const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  entityType: {
    type: String,
    enum: ['shop', 'product'],
    required: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: ['fake_shop', 'wrong_location', 'offensive_product', 'spam', 'other'],
    required: true,
    index: true
  },
  details: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['open', 'dismissed', 'action_taken'],
    default: 'open',
    index: true
  },
  adminNote: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

reportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Report', reportSchema);

