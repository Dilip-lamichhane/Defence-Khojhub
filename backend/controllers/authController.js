const { User } = require('../models');
const { getSupabaseAdminClient } = require('../config/supabase');

const register = async (req, res) => {
  try {
    res.status(403).json({ error: 'Clerk authentication is required' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      details: error.message 
    });
  }
};

const login = async (req, res) => {
  try {
    res.status(403).json({ error: 'Clerk authentication is required' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      details: error.message 
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const clerkId = req.auth?.clerkId;
    if (!clerkId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { data: supabaseUser, error } = await supabase
      .from('users')
      .select('id, clerk_id, email, role, created_at')
      .eq('clerk_id', clerkId)
      .maybeSingle();

    if (error || !supabaseUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const mongoUser = await User.findOne({ clerkId }).select('-password');
    const usernameFallback = String(supabaseUser.email || '').split('@')[0] || `user${Date.now()}`;

    res.json({
      user: mongoUser
        ? {
            _id: mongoUser._id,
            id: supabaseUser.id,
            username: mongoUser.username,
            email: mongoUser.email || supabaseUser.email,
            firstName: mongoUser.firstName || '',
            lastName: mongoUser.lastName || '',
            phone: mongoUser.phone || '',
            address: mongoUser.address || '',
            role: supabaseUser.role,
            createdAt: mongoUser.createdAt
          }
        : {
            _id: null,
            id: supabaseUser.id,
            username: usernameFallback,
            email: supabaseUser.email,
            firstName: '',
            lastName: '',
            phone: '',
            address: '',
            role: supabaseUser.role,
            createdAt: supabaseUser.created_at
          }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      details: error.message 
    });
  }
};

module.exports = {
  register,
  login,
  getProfile
};
