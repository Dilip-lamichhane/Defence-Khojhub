const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  createReview,
  getShopReviews,
  updateReviewResponse,
  deleteReview,
  getMyReviews
} = require('../controllers/reviewController');
const { updateReview } = require('../controllers/reviewController');

const router = express.Router();

// Validation middleware
const createReviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters')
];

const updateReviewResponseValidation = [
  body('response')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Response is required and cannot exceed 500 characters')
];

const deleteReviewValidation = [];

const getShopReviewsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

const getMyReviewsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

const updateReviewValidation = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters')
];

// Public routes
router.get('/shop/:shopId', getShopReviewsValidation, getShopReviews);

// Protected routes - require authentication
// Accept POST /reviews/shop/:shopId for compatibility with frontend
router.post('/shop/:shopId', authenticate, createReviewValidation, createReview);
router.post('/', authenticate, createReviewValidation, createReview);
router.get('/my-reviews', authenticate, getMyReviewsValidation, getMyReviews);
router.get('/my', authenticate, getMyReviewsValidation, getMyReviews);

// Protected routes - require authentication and specific roles
router.put('/:id/respond', authenticate, authorize('shopowner'), updateReviewResponseValidation, updateReviewResponse);
router.delete('/:id', authenticate, deleteReviewValidation, deleteReview);
router.put('/:id', authenticate, updateReviewValidation, updateReview);

module.exports = router;
