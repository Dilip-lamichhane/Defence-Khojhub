const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates format. Expected [longitude, latitude]'
      }
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  businessHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  logoUrl: {
    type: String,
    validate: {
      validator: function(url) {
        return !url || /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid URL format'
    }
  },
  images: [{
    url: {
      type: String,
      validate: {
        validator: function(url) {
          return /^https?:\/\/.+/.test(url);
        },
        message: 'Invalid image URL format'
      }
    },
    alt: String
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'changes_requested', 'suspended'],
    default: 'pending',
    index: true
  },
  statusReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  requestedChanges: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  aiRiskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  statusUpdatedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index
shopSchema.index({ location: '2dsphere' });

// Create compound index for search optimization
shopSchema.index({ category: 1, isActive: 1, status: 1, verified: 1 });

// Calculate visibility radius based on rating (higher rating = larger radius)
shopSchema.methods.getVisibilityRadius = function() {
  const baseRadius = 5; // 5km base radius
  const ratingMultiplier = this.averageRating > 0 ? 1 + (this.averageRating - 3) * 0.5 : 1;
  return Math.max(baseRadius * ratingMultiplier, 1); // Minimum 1km radius
};

// Update updatedAt timestamp
shopSchema.pre('save', function(next) {
  if (!this.status) {
    this.status = this.verified ? 'approved' : 'pending';
  }
  if (this.status === 'approved') {
    this.verified = true;
  }
  if (this.status !== 'approved') {
    this.verified = false;
  }

  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Shop', shopSchema);
