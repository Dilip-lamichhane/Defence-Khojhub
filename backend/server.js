const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { initializeSupabase } = require('./config/supabase');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const clerkAuthRoutes = require('./routes/clerkAuth');
const shopRoutes = require('./routes/shops');
const productRoutes = require('./routes/products');
const reviewRoutes = require('./routes/reviews');
const categoryRoutes = require('./routes/categories');
const supabaseRoutes = require('./routes/supabase');
const adminRoutes = require('./routes/admin');

// Routes
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'KhojHub API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clerk-auth', clerkAuthRoutes);
app.use('/api/v1/shops', shopRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/supabase', supabaseRoutes);
app.use('/api/v1/admin/enterprise', (req, res, next) => {
  req.supabaseProject = 'REAL';
  next();
}, adminRoutes);

app.use('/api/v1/admin/dev', (req, res, next) => {
  req.supabaseProject = 'DUMMY';
  next();
}, adminRoutes);

app.get('/api/v1/geocode/reverse', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'KhojHub/1.0 (localhost)'
        }
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to reverse geocode' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reverse geocode' });
  }
});

app.get('/api/v1/geocode/search', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    const limit = Number(req.query.limit || 6);
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=${Number.isFinite(limit) ? limit : 6}&q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'KhojHub/1.0 (localhost)'
        }
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to search locations' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to search locations' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/khojhub');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await connectDB();

  const { activeProject, missing } = initializeSupabase();
  if (missing.length) {
    console.warn(`⚠️ Supabase (${activeProject}) missing config: ${missing.join(', ')}`);
  } else {
    console.log(`✅ Supabase active project: ${activeProject}`);
  }

  app.listen(PORT, () => {
    console.log(`🚀 KhojHub API server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

module.exports = app;
