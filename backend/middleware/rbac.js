const PERMISSIONS = {
  SHOP_APPROVE: 'shops:approve',
  SHOP_REJECT: 'shops:reject',
  SHOP_SUSPEND: 'shops:suspend',
  SHOP_VIEW: 'shops:view',
  PRODUCT_MODERATE: 'products:moderate',
  USER_BAN: 'users:ban',
  USER_ROLE: 'users:role',
  ANALYTICS_VIEW: 'analytics:view',
  REPORTS_ACCESS: 'reports:access'
};

const ROLE_PERMISSIONS = {
  admin: [
    PERMISSIONS.SHOP_APPROVE,
    PERMISSIONS.SHOP_REJECT,
    PERMISSIONS.SHOP_SUSPEND,
    PERMISSIONS.SHOP_VIEW,
    PERMISSIONS.PRODUCT_MODERATE,
    PERMISSIONS.USER_BAN,
    PERMISSIONS.USER_ROLE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_ACCESS
  ],
  superadmin: [
    PERMISSIONS.SHOP_APPROVE,
    PERMISSIONS.SHOP_REJECT,
    PERMISSIONS.SHOP_SUSPEND,
    PERMISSIONS.SHOP_VIEW,
    PERMISSIONS.PRODUCT_MODERATE,
    PERMISSIONS.USER_BAN,
    PERMISSIONS.USER_ROLE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_ACCESS
  ]
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const currentRole = req.auth.role;
    if (!roles.includes(currentRole)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        required: roles,
        current: currentRole
      });
    }

    next();
  };
};

const authorizePermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const allowed = ROLE_PERMISSIONS[req.auth.role] || [];
    const hasAll = permissions.every((permission) => allowed.includes(permission));
    if (!hasAll) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        required: permissions,
        current: req.auth.role
      });
    }

    next();
  };
};

const authorizeShopAction = () => {
  return (req, res, next) => {
    const { action } = req.body || {};
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    let permission = null;
    if (action === 'approve') permission = PERMISSIONS.SHOP_APPROVE;
    if (action === 'reject' || action === 'request_changes' || action === 're_review') permission = PERMISSIONS.SHOP_REJECT;
    if (action === 'suspend' || action === 'unsuspend' || action === 'revoke') permission = PERMISSIONS.SHOP_SUSPEND;

    if (!permission) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    return authorizePermissions(permission)(req, res, next);
  };
};

const isOwnerOrAdmin = (resourceField = 'owner') => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.auth?.role === 'admin') {
      return next();
    }

    if (!req.user) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Check if user is the owner of the resource
    const resourceOwner = req[resourceField] || req.body[resourceField] || req.params[resourceField];
    
    if (req.user?.id !== resourceOwner && req.user?._id !== resourceOwner) {
      return res.status(403).json({ 
        error: 'Access denied. You can only access your own resources.' 
      });
    }

    next();
  };
};

const isShopOwner = async (req, res, next) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.auth.role === 'admin') {
      return next();
    }

    if (!req.user) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { Shop } = require('../models');
    const shopId = req.params.shopId || req.body.shop || req.params.id;
    
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required.' });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found.' });
    }

    if (shop.owner.toString() !== req.user?.id && req.user?._id !== shop.owner.toString()) {
      return res.status(403).json({ 
        error: 'Access denied. You can only access your own shop.' 
      });
    }

    req.shop = shop;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed.' });
  }
};

module.exports = {
  authorize,
  authorizePermissions,
  authorizeShopAction,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  isOwnerOrAdmin,
  isShopOwner
};
