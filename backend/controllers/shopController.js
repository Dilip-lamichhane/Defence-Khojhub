const Shop = require('../models/Shop');
const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { validationResult } = require('express-validator');
const { getSupabaseClient } = require('../config/supabase');

const toRadians = (value) => (value * Math.PI) / 180;

const haversineKm = (from, to) => {
  if (!from || !to) return 0;
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const mapSupabaseShopRow = (row, distanceKm) => ({
  _id: `sb_${row.id}`,
  name: row.name,
  description: null,
  address: row.address || null,
  phone: row.phone || null,
  averageRating: 0,
  reviewCount: 0,
  category: row.category ? { name: row.category } : undefined,
  location: {
    type: 'Point',
    coordinates: [Number(row.longitude), Number(row.latitude)]
  },
  distance: distanceKm
});

// Create a new shop
const createShop = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category, location, address, contact, businessHours } = req.body;

    // Validate coordinates
    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      return res.status(400).json({ error: 'Valid location coordinates are required' });
    }

    const shop = new Shop({
      owner: req.user._id,
      name,
      description,
      category,
      status: 'pending',
      location: {
        type: 'Point',
        coordinates: location.coordinates
      },
      address,
      contact,
      businessHours
    });

    await shop.save();
    await shop.populate('owner', 'username email');
    await shop.populate('category', 'name');

    res.status(201).json({
      message: 'Shop created successfully',
      shop
    });
  } catch (error) {
    console.error('Create shop error:', error);
    res.status(500).json({ error: 'Failed to create shop' });
  }
};

// Search shops with geospatial queries
const searchShops = async (req, res) => {
  try {
    const { lat, lng, radius = 10, category, minRating = 0, page = 1, limit = 20 } = req.query;

    // Build query
    let query = { 
      isActive: true,
      $or: [
        { status: 'approved' },
        { status: { $exists: false }, verified: true }
      ]
    };

    // Geospatial search
    if (lat && lng) {
      query.location = {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radius / 6378.1] // Convert km to radians
        }
      };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Rating filter
    if (minRating > 0) {
      query.averageRating = { $gte: parseFloat(minRating) };
    }

    const shops = await Shop.find(query)
      .populate('owner', 'username email')
      .populate('category', 'name color')
      .sort({ averageRating: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Shop.countDocuments(query);

    if (shops.length === 0 && lat && lng) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const normalizedCategory = category ? String(category) : '';
        let supabaseQuery = supabase
          .from('shops')
          .select('id, name, latitude, longitude, category, status, address, phone')
          .eq('status', 'approved');

        if (normalizedCategory) {
          supabaseQuery = supabaseQuery.eq('category', normalizedCategory);
        }

        const { data, error } = await supabaseQuery.limit(5000);

        if (!error && data) {
          const origin = [Number(lat), Number(lng)];
          const radiusKm = Number(radius) || 10;
          const filtered = data
            .map((row) => {
              const latNum = Number(row.latitude);
              const lngNum = Number(row.longitude);
              if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
              const distanceKm = haversineKm(origin, [latNum, lngNum]);
              if (distanceKm > radiusKm) return null;
              return mapSupabaseShopRow(row, distanceKm);
            })
            .filter(Boolean)
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

          const safeLimit = Number(limit) || 20;
          const safePage = Number(page) || 1;
          const start = (safePage - 1) * safeLimit;
          const paginated = filtered.slice(start, start + safeLimit);

          return res.json({
            shops: paginated,
            totalPages: Math.ceil(filtered.length / safeLimit),
            currentPage: safePage,
            total: filtered.length
          });
        }
      }
    }

    res.json({
      shops,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Search shops error:', error);
    res.status(500).json({ error: 'Failed to search shops' });
  }
};

// Get shop details with products and reviews
const getShopDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const shop = await Shop.findOne({ 
      _id: id, 
      isActive: true,
      $or: [
        { status: 'approved' },
        { status: { $exists: false }, verified: true }
      ]
    })
      .populate('owner', 'username email')
      .populate('category', 'name color');

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Get products
    const products = await Product.find({ shop: id, isActive: true })
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    // Get reviews with pagination
    const { page = 1, limit = 10 } = req.query;
    const reviews = await Review.find({ shop: id, isActive: true })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const totalReviews = await Review.countDocuments({ shop: id, isActive: true });

    res.json({
      shop,
      products,
      reviews: {
        data: reviews,
        totalPages: Math.ceil(totalReviews / limit),
        currentPage: parseInt(page),
        total: totalReviews
      }
    });
  } catch (error) {
    console.error('Get shop details error:', error);
    res.status(500).json({ error: 'Failed to get shop details' });
  }
};

// Update shop
const updateShop = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const shop = await Shop.findOne({ _id: id, owner: req.user._id, isActive: true });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found or you are not the owner' });
    }

    const allowedUpdates = ['name', 'description', 'address', 'contact', 'businessHours', 'logoUrl'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(shop, updates);
    await shop.save();
    await shop.populate('owner', 'username email');
    await shop.populate('category', 'name');

    res.json({
      message: 'Shop updated successfully',
      shop
    });
  } catch (error) {
    console.error('Update shop error:', error);
    res.status(500).json({ error: 'Failed to update shop' });
  }
};

// Delete shop (soft delete)
const deleteShop = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findOne({ _id: id, owner: req.user._id, isActive: true });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found or you are not the owner' });
    }

    // Soft delete shop and related products
    shop.isActive = false;
    await shop.save();

    // Soft delete all products in this shop
    await Product.updateMany({ shop: id }, { isActive: false });

    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    console.error('Delete shop error:', error);
    res.status(500).json({ error: 'Failed to delete shop' });
  }
};

// Get shops owned by the current user
const getMyShops = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user._id, isActive: true })
      .populate('category', 'name color')
      .sort({ createdAt: -1 });

    res.json({ shops });
  } catch (error) {
    console.error('Get my shops error:', error);
    res.status(500).json({ error: 'Failed to get your shops' });
  }
};

module.exports = {
  createShop,
  searchShops,
  getShopDetails,
  updateShop,
  deleteShop,
  getMyShops
};
