const { validationResult } = require('express-validator');
const { User, Shop, Product, Report, Category } = require('../models');
const { getSupabaseAdminClient, isDemoSupabaseProject, readProjectConfig, getActiveSupabaseProject } = require('../config/supabase');

const normalizeShopStatusFilter = (value) => {
  if (!value) return '';
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'changes_requested') return 'pending';
  if (['pending', 'approved', 'rejected', 'suspended', 'all'].includes(normalized)) return normalized;
  return '';
};

const mapSupabaseShopRow = (row = {}) => {
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const normalizedStatus = String(row.status || '').trim().toLowerCase();
  const safeStatus = ['pending', 'approved', 'rejected', 'suspended'].includes(normalizedStatus)
    ? normalizedStatus
    : row.status;
  const owner = row.owner || null;
  return {
    _id: row.id,
    name: row.name,
    status: safeStatus,
    createdAt: row.created_at || row.approved_at || null,
    contact: {
      phone: row.phone || '',
      email: row.email || ''
    },
    address: {},
    location: hasCoords
      ? {
        type: 'Point',
        coordinates: [lng, lat]
      }
      : undefined,
    owner: owner
      ? {
        _id: owner.id,
        email: owner.email || '',
        clerkId: owner.clerk_id || '',
        role: owner.role || ''
      }
      : undefined
  };
};

const fetchSupabaseShops = async ({ supabase, status, page, limit, offset }) => {
  const normalizedStatus = normalizeShopStatusFilter(status);
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20;
  const start = Number.isFinite(Number(offset))
    ? Number(offset)
    : Number.isFinite(Number(page))
      ? (Number(page) - 1) * safeLimit
      : 0;
  const end = start + safeLimit - 1;

  let query = supabase
    .from('shops')
    .select(
      'id, owner_id, name, latitude, longitude, phone, status, created_at',
      { count: 'exact' }
    );

  if (normalizedStatus && normalizedStatus !== 'all') {
    query = query.ilike('status', `${normalizedStatus}%`);
  }

  const { data, error, count } = await query.order('id', { ascending: true }).range(start, end);

  return {
    data: data || [],
    error,
    count: Number(count || 0),
    start,
    end,
    normalizedStatus,
    limit: safeLimit,
    page: Number.isFinite(Number(page)) ? Number(page) : Math.floor(start / safeLimit) + 1
  };
};

const getOverview = async (req, res) => {
  try {
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since8w = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

    const supabase = getSupabaseAdminClient({ project: req.supabaseProject, allowDemo: true });
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const countShops = async (status) => {
      let query = supabase.from('shops').select('id', { count: 'exact' }).limit(1);
      if (status) {
        query = query.ilike('status', `${status}%`);
      }
      const { count, error } = await query;
      if (error) return 0;
      return Number(count || 0);
    };

    const [
      totalUsers,
      totalProducts,
      flaggedProducts,
      activeToday,
      openReports,
      totalShops,
      pendingShops,
      approvedShops
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, moderationStatus: 'flagged' }),
      User.countDocuments({ isActive: true, lastLogin: { $gte: since24h } }),
      Report.countDocuments({ status: 'open' }),
      countShops(),
      countShops('pending'),
      countShops('approved')
    ]);

    const shopsCreatedPerDay = await Shop.aggregate([
      { $match: { createdAt: { $gte: since7d } } },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            m: { $month: '$createdAt' },
            d: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } }
    ]);

    const productsAddedPerWeek = await Product.aggregate([
      { $match: { createdAt: { $gte: since8w } } },
      {
        $group: {
          _id: {
            y: { $isoWeekYear: '$createdAt' },
            w: { $isoWeek: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1, '_id.w': 1 } }
    ]);

    const pendingApprovalsTrend = await Shop.aggregate([
      { $match: { createdAt: { $gte: since7d }, status: { $in: ['pending', 'changes_requested'] } } },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            m: { $month: '$createdAt' },
            d: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } }
    ]);

    const keyOfDay = (id) => `${id.y}-${id.m}-${id.d}`;
    const shopsMap = new Map(shopsCreatedPerDay.map((row) => [keyOfDay(row._id), row.count]));
    const pendingMap = new Map(pendingApprovalsTrend.map((row) => [keyOfDay(row._id), row.count]));

    const getIsoWeek = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return { y: d.getUTCFullYear(), w: weekNum };
    };

    const keyOfWeek = (id) => `${id.y}-W${id.w}`;
    const productsMap = new Map(productsAddedPerWeek.map((row) => [keyOfWeek(row._id), row.count]));

    const shopsPerDay = [];
    const pendingApprovalsPerDay = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const id = { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
      const key = keyOfDay(id);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      shopsPerDay.push({ name: label, shopsCreated: shopsMap.get(key) || 0 });
      pendingApprovalsPerDay.push({ name: label, pendingApprovals: pendingMap.get(key) || 0 });
    }

    const productsPerWeek = [];
    for (let i = 7; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const iso = getIsoWeek(d);
      const key = keyOfWeek(iso);
      const start = new Date(d);
      const day = start.getDay();
      const diff = (day + 6) % 7;
      start.setDate(start.getDate() - diff);
      const label = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      productsPerWeek.push({
        name: `Wk of ${label}`,
        productsAdded: productsMap.get(key) || 0
      });
    }

    res.json({
      cards: {
        totalUsers,
        totalShops,
        pendingShops,
        approvedShops,
        totalProducts,
        flaggedItems: flaggedProducts + openReports,
        activeToday
      },
      charts: {
        shopsPerDay,
        productsPerWeek,
        pendingApprovalsPerDay
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load overview stats' });
  }
};

const listShops = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const supabase = getSupabaseAdminClient({ project: req.supabaseProject, allowDemo: true });
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { data, error, count, start, end, normalizedStatus, limit: safeLimit, page: currentPage } =
      await fetchSupabaseShops({ supabase, status, page, limit });

    console.log('supabase admin shops list', {
      status: normalizedStatus || null,
      range: [start, end],
      count,
      error: error ? error.message : null
    });

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch Supabase shops',
        details: error.message || 'Unknown Supabase error'
      });
    }

    const shops = (data || []).map(mapSupabaseShopRow);

    res.json({
      shops,
      totalPages: Math.ceil(count / safeLimit),
      currentPage,
      total: count
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list shops',
      details: error?.message || 'Unknown error'
    });
  }
};

const getShopDetails = async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient({ project: req.supabaseProject, allowDemo: true });
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const shopId = String(req.params.id || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shopId);
    if (!isUuid) {
      return res.status(400).json({ error: 'Invalid shop id' });
    }

    const { data: shopRow, error: shopError } = await supabase
        .from('shops')
        .select(
          'id, owner_id, name, latitude, longitude, phone, status, created_at'
        )
      .eq('id', shopId)
      .maybeSingle();

    if (shopError) {
      return res.status(500).json({
        error: 'Failed to fetch Supabase shop',
        details: shopError.message || 'Unknown Supabase error'
      });
    }

    if (!shopRow) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const { data: productRows, error: productError } = await supabase
      .from('products')
      .select('id, name, price, status, description')
      .eq('shop_id', shopId)
      .order('id', { ascending: false })
      .limit(100);

    if (productError) {
      return res.status(500).json({
        error: 'Failed to fetch Supabase products',
        details: productError.message || 'Unknown Supabase error'
      });
    }

    const products = (productRows || []).map((row) => ({
      _id: row.id,
      name: row.name,
      price: row.price,
      moderationStatus: row.status || 'active',
      description: row.description || null
    }));

    res.json({ shop: mapSupabaseShopRow(shopRow), products, similarNearby: [] });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get shop details',
      details: error?.message || 'Unknown error'
    });
  }
};

const updateShopInfo = async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient({ project: req.supabaseProject, allowDemo: true });
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const shopId = String(req.params.id || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shopId);
    if (!isUuid) {
      return res.status(400).json({ error: 'Invalid shop id' });
    }

    const { name, contact, location } = req.body || {};
    const updatePayload = {};
    if (name !== undefined) updatePayload.name = String(name);
    if (contact?.email !== undefined) updatePayload.email = String(contact.email || '');
    if (contact?.phone !== undefined) updatePayload.phone = String(contact.phone || '');

    if (location?.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      const lng = Number(location.coordinates[0]);
      const lat = Number(location.coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        updatePayload.latitude = lat;
        updatePayload.longitude = lng;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data: updatedRow, error: updateError } = await supabase
        .from('shops')
        .update(updatePayload)
        .eq('id', shopId)
        .select(
          'id, owner_id, name, latitude, longitude, phone, status, created_at'
        )
      .maybeSingle();

    if (updateError || !updatedRow) {
      return res.status(500).json({
        error: 'Failed to update shop',
        details: updateError?.message || 'Unknown Supabase error'
      });
    }

    res.json({ message: 'Shop updated', shop: mapSupabaseShopRow(updatedRow) });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update shop',
      details: error?.message || 'Unknown error'
    });
  }
};

const transferShopOwnership = async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient({ project: req.supabaseProject, allowDemo: true });
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { ownerId, ownerEmail } = req.body || {};
    if (!ownerId && !ownerEmail) {
      return res.status(400).json({ error: 'New ownerId or ownerEmail is required' });
    }

    let newOwnerId = ownerId ? String(ownerId).trim() : '';
    if (!newOwnerId && ownerEmail) {
      const normalizedEmail = String(ownerEmail || '').trim().toLowerCase();
      const { data: ownerRow, error: ownerError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (ownerError) {
        return res.status(500).json({
          error: 'Failed to find owner',
          details: ownerError.message || 'Unknown Supabase error'
        });
      }

      if (!ownerRow) {
        return res.status(404).json({ error: 'New owner not found' });
      }

      newOwnerId = ownerRow.id;
    }

    const shopId = String(req.params.id || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shopId);
    if (!isUuid) {
      return res.status(400).json({ error: 'Invalid shop id' });
    }

    const { data: updatedRow, error: updateError } = await supabase
        .from('shops')
        .update({ owner_id: newOwnerId })
        .eq('id', shopId)
        .select(
          'id, owner_id, name, latitude, longitude, phone, status, created_at'
        )
      .maybeSingle();

    if (updateError || !updatedRow) {
      return res.status(500).json({
        error: 'Failed to transfer ownership',
        details: updateError?.message || 'Unknown Supabase error'
      });
    }

    res.json({ message: 'Ownership transferred', shop: mapSupabaseShopRow(updatedRow) });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to transfer ownership',
      details: error?.message || 'Unknown error'
    });
  }
};

const updateShopStatus = async (req, res) => {
  return updateSupabaseShopStatus(req, res);
};

const listProducts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (status && status !== 'all') {
      query.moderationStatus = status;
    }

    const products = await Product.find(query)
      .populate({
        path: 'shop',
        select: 'name status',
        populate: { path: 'owner', select: 'username email' }
      })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list products' });
  }
};

const moderateProduct = async (req, res) => {
  try {
    const { action, reason, updates } = req.body || {};
    const product = await Product.findOne({ _id: req.params.id });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    if (action === 'hide') {
      product.moderationStatus = 'hidden';
      product.moderationReason = reason ? String(reason) : undefined;
    } else if (action === 'flag') {
      product.moderationStatus = 'flagged';
      product.moderationReason = reason ? String(reason) : undefined;
    } else if (action === 'unflag') {
      product.moderationStatus = 'active';
      product.moderationReason = undefined;
    } else if (action === 'delete') {
      product.isActive = false;
    } else if (action === 'edit') {
      const patch = updates && typeof updates === 'object' ? updates : {};
      if (patch.name !== undefined) product.name = String(patch.name);
      if (patch.description !== undefined) product.description = String(patch.description);
      if (patch.price !== undefined) product.price = Number(patch.price);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    product.moderatedAt = new Date();
    await product.save();

    res.json({ message: 'Product updated', product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to moderate product' });
  }
};

const listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;



    const supabaseAdmin = getSupabaseAdminClient({ project: req.supabaseProject, allowDemo: true });
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    let usersQuery = supabaseAdmin
      .from('users')
      .select('id, clerk_id, email, role, created_at')
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (role) usersQuery = usersQuery.eq('role', role);

    const { data: supabaseUsers, error } = await usersQuery;
    if (error) {
      return res.status(500).json({
        error: 'Failed to list users',
        details: error.message || 'Unknown Supabase error'
      });
    }

    let countQuery = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });
    if (role) countQuery = countQuery.eq('role', role);

    const { count } = await countQuery
      .maybeSingle()
      .then((response) => ({ count: response.count || 0 }))
      .catch(() => ({ count: 0 }));

    const clerkIds = (supabaseUsers || []).map((user) => user.clerk_id);
    const mongoUsers = await User.find({ clerkId: { $in: clerkIds } }).select('-password');
    const mongoByClerk = new Map();
    mongoUsers.forEach((user) => {
      mongoByClerk.set(user.clerkId, user);
    });

    const usersWithRoles = (supabaseUsers || []).map((user) => {
      const mongoUser = mongoByClerk.get(user.clerk_id);
      return {
        _id: user.clerk_id,
        clerkId: user.clerk_id,
        email: user.email,
        role: user.role,
        isActive: mongoUser?.isActive ?? true,
        firstName: mongoUser?.firstName || '',
        lastName: mongoUser?.lastName || '',
        username: mongoUser?.username || '',
        createdAt: mongoUser?.createdAt || user.created_at,
        ownedShop: null,
        ownedShopCount: 0
      };
    });

    res.json({
      users: usersWithRoles,
      totalPages: Math.ceil(count / Number(limit)),
      currentPage: Number(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list users',
      details: error?.message || 'Unknown error'
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { action } = req.body || {};
    const user = await User.findOne({ clerkId: req.params.id }).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (action === 'ban') {
      user.isActive = false;
    } else if (action === 'unban') {
      user.isActive = true;
    } else if (action === 'reset') {
      user.isActive = true;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await user.save();
    res.json({ message: 'User updated', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role, confirm, clerkId } = req.body || {};
    if (!confirm) {
      return res.status(400).json({ error: 'Role change requires explicit confirmation' });
    }

    if (!['user', 'shopowner', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const targetClerkId = clerkId || req.params.id;
    const supabaseAdmin = getSupabaseAdminClient({ project: req.supabaseProject, allowDemo: true });
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('clerk_id', targetClerkId)
      .select('id, clerk_id, email, role')
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        error: 'Failed to update role',
        details: error.message || 'Unknown Supabase error'
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Role updated', user: data });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update role',
      details: error?.message || 'Unknown error'
    });
  }
};

const listReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const reports = await Report.find(query)
      .populate('reporter', 'username email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list reports' });
  }
};

const updateReport = async (req, res) => {
  try {
    const { status, adminNote } = req.body || {};
    if (!['open', 'dismissed', 'action_taken'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await Report.findOne({ _id: req.params.id });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = status;
    report.adminNote = adminNote ? String(adminNote) : report.adminNote;
    report.updatedAt = new Date();
    await report.save();

    res.json({ message: 'Report updated', report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report' });
  }
};

const listSupabaseShops = async (req, res) => {
  try {
    const { status = 'pending', limit = 20, offset, page } = req.query;



    const supabase = getSupabaseAdminClient({ project: req.supabaseProject, allowDemo: true });
    if (!supabase) {
      const config = readProjectConfig(getActiveSupabaseProject());
      const missing = [];
      if (!config.url) missing.push('URL');
      if (!config.serviceKey && !config.anonKey) missing.push('Keys');
      return res.status(500).json({
        error: 'Supabase is not configured',
        details: missing.length ? `Missing ${missing.join(', ')}` : 'Missing Supabase admin client'
      });
    }

    const { data, error, count, start, end, normalizedStatus } = await fetchSupabaseShops({
      supabase,
      status,
      limit,
      offset,
      page
    });

    console.log('supabase admin supabase-shops list', {
      status: normalizedStatus || null,
      range: [start, end],
      count,
      error: error ? error.message : null
    });

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch Supabase shops',
        details: error.message || 'Unknown Supabase error'
      });
    }

    res.json({
      shops: data || [],
      total: count
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch Supabase shops',
      details: error?.message || 'Unknown error'
    });
  }
};

const updateSupabaseShopStatus = async (req, res) => {
  const sanitizeHeaders = (headers = {}) => {
    const copy = { ...headers };
    if (copy.authorization) copy.authorization = 'Bearer [REDACTED]';
    if (copy.cookie) copy.cookie = '[REDACTED]';
    return copy;
  };

  try {


    console.log('supabase shop status request', {
      path: req.originalUrl,
      params: req.params,
      headers: sanitizeHeaders(req.headers),
      body: req.body,
      auth: req.auth,
      user: req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : null
    });

    if (!req.auth?.role || req.auth.role !== 'admin') {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const supabase = getSupabaseAdminClient({ project: req.supabaseProject, allowDemo: true });
    if (!supabase) {
      return res.status(500).json({
        error: 'Supabase is not configured',
        details: 'Missing ACTIVE_SUPABASE_PROJECT keys or URL'
      });
    }

    const shopId = String(req.params.id || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shopId);
    if (!isUuid) {
      return res.status(400).json({ error: 'Invalid shop id' });
    }

    const { action } = req.body || {};
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      suspend: 'suspended',
      unsuspend: 'approved',
      re_review: 'pending',
      revoke: 'pending',
      request_changes: 'pending'
    };
    const status = statusMap[action];
    if (!status) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const { data: supabaseShop, error: supabaseShopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .maybeSingle();

    console.log('supabase shop fetch', {
      shopId,
      response: supabaseShop || null,
      error: supabaseShopError || null
    });

    if (supabaseShopError) {
      return res.status(500).json({
        error: 'Failed to fetch Supabase shop',
        details: supabaseShopError.message || 'Unknown Supabase error'
      });
    }
    if (!supabaseShop) {
      return res.status(404).json({ error: 'Supabase shop not found' });
    }

    const updatePayload = { status };

    const { data: updatedShop, error: updateError } = await supabase
      .from('shops')
      .update(updatePayload)
      .eq('id', shopId)
      .select('*')
      .maybeSingle();

    console.log('supabase shop update', {
      shopId,
      response: updatedShop || null,
      error: updateError || null
    });

    if (updateError || !updatedShop) {
      return res.status(500).json({
        error: 'Failed to update Supabase shop',
        details: updateError?.message || 'Unknown Supabase error'
      });
    }

    res.json({ shop: updatedShop });
  } catch (error) {
    console.error('supabase shop status error', {
      path: req.originalUrl,
      error: error?.message || 'Unknown error'
    });
    res.status(500).json({
      error: 'Failed to update Supabase shop',
      details: error?.message || 'Unknown error'
    });
  }
};

module.exports = {
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
};
