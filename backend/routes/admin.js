const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizePermissions, authorizeShopAction, PERMISSIONS } = require('../middleware/rbac');
const {
  getOverview,
  listShops,
  getShopDetails,
  updateShopStatus,
  updateShopInfo,
  transferShopOwnership,
  listProducts,
  moderateProduct,
  listUsers,
  updateUserStatus,
  updateUserRole,
  listReports,
  updateReport,
  listSupabaseShops,
  updateSupabaseShopStatus
} = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate);

router.get('/overview', authorizePermissions(PERMISSIONS.ANALYTICS_VIEW), getOverview);

router.get('/shops', authorizePermissions(PERMISSIONS.SHOP_VIEW), listShops);
router.get('/shops/:id', authorizePermissions(PERMISSIONS.SHOP_VIEW), getShopDetails);
router.patch('/shops/:id/status', authorizeShopAction(), updateShopStatus);
router.patch('/shops/:id', authorizePermissions(PERMISSIONS.SHOP_APPROVE), updateShopInfo);
router.patch('/shops/:id/owner', authorizePermissions(PERMISSIONS.SHOP_APPROVE), transferShopOwnership);
router.get('/supabase/shops', authorizePermissions(PERMISSIONS.SHOP_VIEW), listSupabaseShops);
router.patch('/supabase/shops/:id/status', authorizePermissions(PERMISSIONS.SHOP_APPROVE, PERMISSIONS.SHOP_REJECT, PERMISSIONS.SHOP_SUSPEND), updateSupabaseShopStatus);

router.get('/products', authorizePermissions(PERMISSIONS.PRODUCT_MODERATE), listProducts);
router.patch('/products/:id/moderate', authorizePermissions(PERMISSIONS.PRODUCT_MODERATE), moderateProduct);

router.get('/users', authorizePermissions(PERMISSIONS.USER_BAN), listUsers);
router.patch('/users/:id/status', authorizePermissions(PERMISSIONS.USER_BAN), updateUserStatus);
router.patch('/users/:id/role', authorizePermissions(PERMISSIONS.USER_ROLE), updateUserRole);
router.post('/change-role', authorizePermissions(PERMISSIONS.USER_ROLE), updateUserRole);

router.get('/reports', authorizePermissions(PERMISSIONS.REPORTS_ACCESS), listReports);
router.patch('/reports/:id', authorizePermissions(PERMISSIONS.REPORTS_ACCESS), updateReport);

module.exports = router;
