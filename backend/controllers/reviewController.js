const Review = require('../models/Review');
const Shop = require('../models/Shop');
const User = require('../models/User');
const { getSupabaseAdminClient } = require('../config/supabase');

const isUuid = (s) => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
};

// Create a new review
const createReview = async (req, res) => {
  try {
    const shopId = req.params.shopId || req.body.shopId;
    const { rating, comment } = req.body;
    const clerkId = req.auth?.clerkId;

    if (!clerkId) return res.status(401).json({ error: 'Authentication required' });

    // Validate rating
    const rVal = Number(rating);
    if (!Number.isInteger(rVal) || rVal < 1 || rVal > 5) return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });

    // If shopId looks like a UUID, use Supabase reviews
    if (shopId && isUuid(shopId)) {
      const supabase = getSupabaseAdminClient({ purpose: 'reviews', allowDemo: true });

      // Check shop exists in Supabase
      const { data: shopRow } = await supabase.from('shops').select('id,status').eq('id', shopId).maybeSingle();
      if (!shopRow) return res.status(404).json({ error: 'Shop not found' });
      if (shopRow.status && shopRow.status !== 'approved') return res.status(400).json({ error: 'Shop is not active' });

      // Prevent duplicate review by same user
      const { data: existing } = await supabase.from('reviews').select('id').eq('shop_id', shopId).eq('user_id', clerkId).maybeSingle();
      if (existing) return res.status(400).json({ error: 'You have already reviewed this shop' });

      const payload = {
        shop_id: shopId,
        user_id: clerkId,
        rating: rVal,
        review_text: (comment || '').trim()
      };

      const { data: inserted, error } = await supabase.from('reviews').insert(payload).select('*').single();
      if (error) {
        console.error('Supabase insert review error:', error);
        return res.status(500).json({ error: 'Failed to create review' });
      }

      return res.status(201).json({ message: 'Review created successfully', review: inserted });
    }

    // Fallback to existing Mongo implementation for non-UUID shop IDs
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const existingReview = await Review.findOne({ shop: shopId, author: userId });
    if (existingReview) return res.status(400).json({ error: 'You have already reviewed this shop' });

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (!shop.isActive) return res.status(400).json({ error: 'Shop is not active' });

    const review = new Review({ shop: shopId, author: userId, rating, comment: comment?.trim() || '' });
    await review.save();
    await review.populate('author', 'username');
    await review.populate('shop', 'name');

    return res.status(201).json({ message: 'Review created successfully', review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

// Get all reviews for a shop
const getShopReviews = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 20, sortBy = 'created_at', order = 'desc' } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const pageLimit = Math.min(parseInt(limit, 10) || 20, 100);

    if (shopId && isUuid(shopId)) {
      const supabase = getSupabaseAdminClient({ purpose: 'reviews', allowDemo: true });

      const query = supabase.from('reviews').select('id, shop_id, user_id, rating, review_text, created_at, updated_at');
      query.eq('shop_id', shopId);
      query.order(sortBy, { ascending: order === 'asc' });
      query.range((pageNum - 1) * pageLimit, pageNum * pageLimit - 1);

      const { data, error } = await query;
      if (error) {
        console.error('Supabase fetch reviews error:', error);
        return res.status(500).json({ error: 'Failed to fetch reviews' });
      }

      const reviews = data || [];

      // attach basic user info from users table (if present)
      const userIds = Array.from(new Set(reviews.map(r => r.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, clerk_id, email, username, full_name')
          .in('clerk_id', userIds);

        const usersByClerk = (users || []).reduce((acc, u) => { acc[u.clerk_id] = u; return acc; }, {});
        reviews.forEach(r => { r.user = usersByClerk[r.user_id] || null; });
      }

      return res.json({ reviews, currentPage: pageNum, pageSize: pageLimit, total: reviews.length });
    }

    // Fallback to Mongo
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const reviews = await Review.find({ shop: shopId, isActive: true })
      .populate('author', 'username')
      .sort(sortOptions)
      .limit(pageLimit)
      .skip((pageNum - 1) * pageLimit)
      .exec();

    const total = await Review.countDocuments({ shop: shopId, isActive: true });

    return res.json({ reviews, totalPages: Math.ceil(total / pageLimit), currentPage: pageNum, total });
  } catch (error) {
    console.error('Get shop reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
};

// Update review response (shopkeeper only)
// Update review response (shopkeeper only) - keep Mongo implementation
const updateReviewResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const userId = req.user?.id;

    const review = await Review.findById(id).populate('shop');
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.shop.owner.toString() !== userId) return res.status(403).json({ error: 'You are not authorized to respond to this review' });

    review.response = response?.trim() || '';
    review.responseAt = new Date();
    await review.save();

    return res.json({ message: 'Review response updated successfully', review: { id: review._id, response: review.response, responseAt: review.responseAt } });
  } catch (error) {
    console.error('Update review response error:', error);
    res.status(500).json({ error: 'Failed to update review response' });
  }
};

// Delete review (soft delete)
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const clerkId = req.auth?.clerkId;
    const isAdmin = req.auth?.role === 'admin';

    if (id && isUuid(id)) {
      const supabase = getSupabaseAdminClient({ purpose: 'reviews', allowDemo: true });

      // Fetch existing review
      const { data: existing } = await supabase.from('reviews').select('*').eq('id', id).maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Review not found' });

      const isAuthor = existing.user_id === clerkId;
      if (!isAuthor && !isAdmin) return res.status(403).json({ error: 'You are not authorized to delete this review' });

      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) {
        console.error('Supabase delete review error:', error);
        return res.status(500).json({ error: 'Failed to delete review' });
      }

      return res.json({ message: 'Review deleted successfully' });
    }

    // Fallback to Mongo soft delete
    const userId = req.user?.id;
    const review = await Review.findById(id).populate('shop');
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const isAuthor = review.author.toString() === userId;
    const isShopOwner = review.shop.owner.toString() === userId;
    if (!isAuthor && !isShopOwner && !isAdmin) return res.status(403).json({ error: 'You are not authorized to delete this review' });

    review.isActive = false;
    await review.save();
    return res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

// Get user's reviews
const getMyReviews = async (req, res) => {
  try {
    const clerkId = req.auth?.clerkId;
    const { page = 1, limit = 50 } = req.query;

    // If user has a Clerk id, fetch from Supabase
    if (clerkId) {
      const supabase = getSupabaseAdminClient({ purpose: 'reviews', allowDemo: true });
      const pageNum = parseInt(page, 10) || 1;
      const pageLimit = Math.min(parseInt(limit, 10) || 50, 200);

      const { data, error } = await supabase
        .from('reviews')
        .select('id, shop_id, user_id, rating, review_text, created_at, updated_at')
        .eq('user_id', clerkId)
        .order('created_at', { ascending: false })
        .range((pageNum - 1) * pageLimit, pageNum * pageLimit - 1);

      if (error) {
        console.error('Supabase getMyReviews error:', error);
        return res.status(500).json({ error: 'Failed to get your reviews' });
      }

      return res.json({ reviews: data || [], currentPage: pageNum, pageSize: pageLimit, total: (data || []).length });
    }

    // Fallback to Mongo
    const userId = req.user.id;
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

// Update a review (user can edit their own review)
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const clerkId = req.auth?.clerkId;

    if (!clerkId) return res.status(401).json({ error: 'Authentication required' });
    if (!id) return res.status(400).json({ error: 'Review id required' });

    if (isUuid(id)) {
      const supabase = getSupabaseAdminClient({ purpose: 'reviews', allowDemo: true });
      const { data: existing } = await supabase.from('reviews').select('*').eq('id', id).maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Review not found' });
      if (existing.user_id !== clerkId) return res.status(403).json({ error: 'You can only edit your own review' });

      const updates = {};
      if (rating !== undefined) {
        const r = Number(rating);
        if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
        updates.rating = r;
      }
      if (comment !== undefined) updates.review_text = (comment || '').trim();
      updates.updated_at = new Date();

      const { data: updated, error } = await supabase.from('reviews').update(updates).eq('id', id).select('*').single();
      if (error) {
        console.error('Supabase update review error:', error);
        return res.status(500).json({ error: 'Failed to update review' });
      }

      return res.json({ message: 'Review updated', review: updated });
    }

    // Fallback to Mongo
    const userId = req.user.id;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.author.toString() !== userId) return res.status(403).json({ error: 'You can only edit your own review' });

    if (rating !== undefined) {
      const r = Number(rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
      review.rating = r;
    }
    if (comment !== undefined) review.comment = (comment || '').trim();
    review.updatedAt = new Date();
    await review.save();

    return res.json({ message: 'Review updated', review });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
};

module.exports = {
  createReview,
  getShopReviews,
  updateReviewResponse,
  deleteReview,
  getMyReviews,
  updateReview
};
