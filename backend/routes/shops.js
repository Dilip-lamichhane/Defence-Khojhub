const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { authorize, isOwnerOrAdmin } = require('../middleware/rbac');
const {
  createShop,
  searchShops,
  getShopDetails,
  updateShop,
  deleteShop,
  getMyShops
} = require('../controllers/shopController');

const router = express.Router();
const { getSupabaseClient } = require('../config/supabase');

// Validation rules
const createShopValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Shop name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('location')
    .isObject()
    .withMessage('Location is required'),
  body('location.type')
    .equals('Point')
    .withMessage('Location type must be Point'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of 2 numbers [longitude, latitude]'),
  body('location.coordinates.*')
    .isFloat()
    .withMessage('Coordinates must be valid numbers'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  body('contact.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required'),
  body('businessHours')
    .optional()
    .isObject()
    .withMessage('Business hours must be an object'),
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('Valid logo URL is required')
];

const updateShopValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Shop name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  body('location.type')
    .optional()
    .equals('Point')
    .withMessage('Location type must be Point'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of 2 numbers'),
  body('location.coordinates.*')
    .optional()
    .isFloat()
    .withMessage('Coordinates must be valid numbers'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  body('contact.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required'),
  body('businessHours')
    .optional()
    .isObject()
    .withMessage('Business hours must be an object'),
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('Valid logo URL is required')
];

const searchShopsValidation = [
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 50 })
    .withMessage('Radius must be between 0.1 and 50 km'),
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Valid category ID is required'),
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Minimum rating must be between 0 and 5'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Public routes
// Debug: raw Supabase shops listing (use ?project=DUMMY or header x-supabase-project)
router.get('/debug/supabase/shops', async (req, res) => {
  try {
    const project = req.query.project || req.headers['x-supabase-project'] || undefined;
    const supabase = getSupabaseClient({ project });
    if (!supabase) return res.status(400).json({ error: 'Supabase client not configured' });
    const { data, error } = await supabase
      .from('shops')
      .select('id, name, description, latitude, longitude, status, category')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(5000);

    if (error) return res.status(500).json({ error: error.message || error });
    return res.json({ rows: data });
  } catch (err) {
    console.error('Debug supabase shops error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch supabase shops' });
  }
});

// Public routes
router.get('/search', searchShopsValidation, searchShops);
router.get('/:id', param('id').isMongoId().withMessage('Valid shop ID is required'), getShopDetails);

// Protected routes - require authentication
router.post('/', authenticate, authorize('shopowner'), createShopValidation, createShop);
router.get('/my-shops', authenticate, authorize('shopowner'), getMyShops);
router.put('/:id', authenticate, authorize('shopowner', 'admin'), isOwnerOrAdmin('Shop'), updateShopValidation, updateShop);
router.delete('/:id', authenticate, authorize('shopowner', 'admin'), isOwnerOrAdmin('Shop'), param('id').isMongoId().withMessage('Valid shop ID is required'), deleteShop);

module.exports = router;
