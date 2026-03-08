const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryHierarchy
} = require('../controllers/categoryController');

const router = express.Router();

// Validation middleware
const createCategoryValidation = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('parent')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Parent category must be a valid MongoDB ID'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code')
];

const updateCategoryValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('parent')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Parent category must be a valid MongoDB ID'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

const getCategoriesValidation = [
  query('parent')
    .optional()
    .custom((value) => {
      if (value === 'null') return true;
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .withMessage('Parent must be a valid MongoDB ID or "null"'),
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive must be a boolean value')
];

const getCategoryHierarchyValidation = [
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive must be a boolean value')
];

// Public routes - anyone can view categories
router.get('/', getCategoriesValidation, getCategories);
router.get('/hierarchy', getCategoryHierarchyValidation, getCategoryHierarchy);
router.get('/:id', param('id').isMongoId().withMessage('Valid category ID is required'), getCategoryById);

// Protected routes - admin only
router.post('/', authenticate, authorize('admin'), createCategoryValidation, createCategory);
router.put('/:id', authenticate, authorize('admin'), updateCategoryValidation, updateCategory);
router.delete('/:id', authenticate, authorize('admin'), param('id').isMongoId().withMessage('Valid category ID is required'), deleteCategory);

module.exports = router;
