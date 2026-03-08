const Product = require('../models/Product');
const Shop = require('../models/Shop');
const { validationResult } = require('express-validator');

// Create a new product
const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, category, stock, images } = req.body;
    
    // Verify shop exists and belongs to the user
    const shop = await Shop.findOne({ 
      _id: req.body.shop, 
      owner: req.user.id,
      isActive: true 
    });
    
    if (!shop) {
      return res.status(404).json({ 
        error: 'Shop not found or you do not have permission to add products to this shop' 
      });
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      stock,
      images: images || [],
      shop: req.body.shop,
      isActive: true
    });

    await product.save();
    
    // Update shop's product count
    await Shop.findByIdAndUpdate(req.body.shop, { $inc: { productCount: 1 } });

    res.status(201).json({
      message: 'Product created successfully',
      product: await Product.findById(product._id).populate('category', 'name')
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      error: 'Failed to create product',
      details: error.message 
    });
  }
};

// Get all products with filtering
const getProducts = async (req, res) => {
  try {
    const { 
      category, 
      shop, 
      minPrice, 
      maxPrice, 
      inStock, 
      search, 
      lat, 
      lng, 
      radius,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = { isActive: true };
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Shop filter
    if (shop) {
      query.shop = shop;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    // Stock filter
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    } else if (inStock === 'false') {
      query.stock = 0;
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Location-based filtering
    if (lat && lng && radius) {
      // Find shops within radius
      const shopsInRadius = await Shop.find({
        location: {
          $geoWithin: {
            $centerSphere: [[parseFloat(lng), parseFloat(lat)], parseFloat(radius) / 6378.1]
          }
        },
        isActive: true
      }).select('_id');
      
      const shopIds = shopsInRadius.map(shop => shop._id);
      query.shop = { $in: shopIds };
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('shop', 'name location address')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error.message 
    });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id, 
      isActive: true 
    })
      .populate('category', 'name description')
      .populate('shop', 'name location address contactInfo rating')
      .populate({
        path: 'shop',
        populate: {
          path: 'owner',
          select: 'username email'
        }
      });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product',
      details: error.message 
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).populate('shop');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user owns the shop or is admin
    if (product.shop.owner.toString() !== req.user.id && req.auth?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'You do not have permission to update this product' 
      });
    }

    const { name, description, price, category, stock, images } = req.body;
    
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.stock = stock !== undefined ? stock : product.stock;
    product.images = images || product.images;

    await product.save();

    res.json({
      message: 'Product updated successfully',
      product: await Product.findById(product._id).populate('category', 'name')
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ 
      error: 'Failed to update product',
      details: error.message 
    });
  }
};

// Delete product (soft delete)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).populate('shop');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user owns the shop or is admin
    if (product.shop.owner.toString() !== req.user.id && req.auth?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'You do not have permission to delete this product' 
      });
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    // Update shop's product count
    await Shop.findByIdAndUpdate(product.shop._id, { $inc: { productCount: -1 } });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      error: 'Failed to delete product',
      details: error.message 
    });
  }
};

// Update product stock
const updateStock = async (req, res) => {
  try {
    const { stock } = req.body;
    
    if (stock === undefined || stock < 0) {
      return res.status(400).json({ error: 'Invalid stock value' });
    }

    const product = await Product.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).populate('shop');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user owns the shop or is admin
    if (product.shop.owner.toString() !== req.user.id && req.auth?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'You do not have permission to update this product' 
      });
    }

    product.stock = stock;
    await product.save();

    res.json({
      message: 'Stock updated successfully',
      product: {
        id: product._id,
        name: product.name,
        stock: product.stock
      }
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ 
      error: 'Failed to update stock',
      details: error.message 
    });
  }
};

// Get products by shop
const getProductsByShop = async (req, res) => {
  try {
    const { page = 1, limit = 20, inStock } = req.query;
    
    let query = { shop: req.params.shopId, isActive: true };
    
    // Stock filter
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    } else if (inStock === 'false') {
      query.stock = 0;
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get products by shop error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error.message 
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock,
  getProductsByShop
};
