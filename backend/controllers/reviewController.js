const Review = require('../models/Review');
const Shop = require('../models/Shop');
const User = require('../models/User');

// Create a new review
const createReview = async (req, res) => {
  try {
    const { shopId, rating, comment } = req.body;
    const userId = req.user.id;

    // Check if user has already reviewed this shop
    const existingReview = await Review.findOne({ shop: shopId, author: userId });
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this shop' });
    }

    // Check if shop exists and is active
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (!shop.isActive) {
      return res.status(400).json({ error: 'Shop is not active' });
    }

    // Create review
    const review = new Review({
      shop: shopId,
      author: userId,
      rating,
      comment: comment?.trim() || ''
    });

    await review.save();

    // Populate the review with shop and author details
    await review.populate('author', 'username');
    await review.populate('shop', 'name');

    res.status(201).json({
      message: 'Review created successfully',
      review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

// Get all reviews for a shop
const getShopReviews = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Validate shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const reviews = await Review.find({ shop: shopId, isActive: true })
      .populate('author', 'username')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Review.countDocuments({ shop: shopId, isActive: true });

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get shop reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
};

// Update review response (shopkeeper only)
const updateReviewResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const userId = req.user.id;

    const review = await Review.findById(id).populate('shop');
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user is the shop owner
    if (review.shop.owner.toString() !== userId) {
      return res.status(403).json({ error: 'You are not authorized to respond to this review' });
    }

    review.response = response?.trim() || '';
    review.responseAt = new Date();

    await review.save();

    res.json({
      message: 'Review response updated successfully',
      review: {
        id: review._id,
        response: review.response,
        responseAt: review.responseAt
      }
    });
  } catch (error) {
    console.error('Update review response error:', error);
    res.status(500).json({ error: 'Failed to update review response' });
  }
};

// Delete review (soft delete)
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(id).populate('shop');
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check authorization - author or shop owner or admin
    const isAuthor = review.author.toString() === userId;
    const isShopOwner = review.shop.owner.toString() === userId;
    const isAdmin = req.auth?.role === 'admin';

    if (!isAuthor && !isShopOwner && !isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to delete this review' });
    }

    // Soft delete
    review.isActive = false;
    await review.save();

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
    }
};

// Get user's reviews
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const reviews = await Review.find({ author: userId, isActive: true })
      .populate('shop', 'name logoUrl')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Review.countDocuments({ author: userId, isActive: true });

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
};

module.exports = {
  createReview,
  getShopReviews,
  updateReviewResponse,
  deleteReview,
  getMyReviews
};
