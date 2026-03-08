const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
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
  price: {
    type: Number,
    min: 0,
    validate: {
      validator: function(price) {
        return !price || price >= 0;
      },
      message: 'Price must be a positive number'
    }
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  stockStatus: {
    type: String,
    enum: ['in_stock', 'out_of_stock', 'limited'],
    required: true,
    default: 'in_stock'
  },
  stockQuantity: {
    type: Number,
    min: 0,
    default: 0
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
  specifications: {
    type: Map,
    of: String
  },
  moderationStatus: {
    type: String,
    enum: ['active', 'hidden', 'flagged'],
    default: 'active',
    index: true
  },
  moderationReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  moderatedAt: {
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

// Update stock status based on quantity
productSchema.pre('save', function(next) {
  if (this.stockQuantity === 0) {
    this.stockStatus = 'out_of_stock';
  } else if (this.stockQuantity <= 5) {
    this.stockStatus = 'limited';
  } else {
    this.stockStatus = 'in_stock';
  }
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
productSchema.index({ shop: 1, category: 1, isActive: 1 });
productSchema.index({ stockStatus: 1 });
productSchema.index({ moderationStatus: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
