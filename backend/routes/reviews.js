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

const router = express.Router();

// Validation middleware
const createReviewValidation = [
  body('shopId')
    .isMongoId()
    .withMessage('Valid shop ID is required'),
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
  param('id')
    .isMongoId()
    .withMessage('Valid review ID is required'),
  body('response')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Response is required and cannot exceed 500 characters')
];

const deleteReviewValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid review ID is required')
];

const getShopReviewsValidation = [
  param('shopId')
    .isMongoId()
    .withMessage('Valid shop ID is required'),
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

// Public routes
router.get('/shop/:shopId', getShopReviewsValidation, getShopReviews);

// Protected routes - require authentication
router.post('/', authenticate, createReviewValidation, createReview);
router.get('/my-reviews', authenticate, getMyReviewsValidation, getMyReviews);

// Protected routes - require authentication and specific roles
router.put('/:id/respond', authenticate, authorize('shopowner'), updateReviewResponseValidation, updateReviewResponse);
router.delete('/:id', authenticate, deleteReviewValidation, deleteReview);

module.exports = router;
