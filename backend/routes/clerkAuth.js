const express = require('express');
const User = require('../models/User');
const { getSupabaseAdminClient } = require('../config/supabase');
const { requireClerkAuth, requireSupabaseUser, getClerkEmail } = require('../middleware/clerkSupabaseAuth');
const router = express.Router();

const sanitizeHeaders = (headers = {}) => {
  const copy = { ...headers };
  if (copy.authorization) copy.authorization = 'Bearer [REDACTED]';
  if (copy.cookie) copy.cookie = '[REDACTED]';
  return copy;
};

// Clerk authentication sync endpoint
router.post('/clerk-sync', requireClerkAuth, async (req, res) => {
  try {
    console.log('clerk-sync request', {
      path: req.originalUrl,
      headers: sanitizeHeaders(req.headers),
      body: req.body,
      auth: req.auth,
      clerkSecretPresent: Boolean(process.env.CLERK_SECRET_KEY)
    });
    const clerkId = req.auth?.clerkId;
    if (!clerkId) {
      return res.status(400).json({ error: 'Missing Clerk user ID' });
    }
    const emailFromToken = req.auth?.email;
    let resolvedEmail = emailFromToken;
    if (!resolvedEmail) {
      try {
        resolvedEmail = await getClerkEmail(clerkId);
      } catch (emailError) {
        resolvedEmail = '';
      }
    }
    resolvedEmail = resolvedEmail || `clerk-${clerkId}@no-email.local`;
    const normalizedEmail = resolvedEmail.toLowerCase();

    let user = null;
    let username = '';
    try {
      user = await User.findOne({ clerkId });
      if (!user) {
        const byEmail = await User.findOne({ email: normalizedEmail });
        if (byEmail) {
          byEmail.clerkId = clerkId;
          user = byEmail;
        }
      }
      const usernameBase = normalizedEmail.split('@')[0] || `user${Date.now()}`;
      username = usernameBase;
      let suffix = 1;
      while (await User.findOne({ username })) {
        username = `${usernameBase}${suffix}`;
        suffix += 1;
      }

      if (user) {
        user.email = normalizedEmail;
        user.username = user.username || username;
        user.lastLogin = new Date();
      } else {
        user = new User({
          clerkId,
          email: normalizedEmail,
          username,
          firstName: '',
          lastName: '',
          role: 'customer',
          isActive: true,
          lastLogin: new Date()
        });
      }
      try {
        await user.save();
      } catch (saveError) {
        if (saveError?.code === 11000 && saveError?.keyPattern?.email) {
          const existingByEmail = await User.findOne({ email: normalizedEmail });
          if (existingByEmail && existingByEmail.clerkId !== clerkId) {
            existingByEmail.clerkId = clerkId;
            existingByEmail.lastLogin = new Date();
            await existingByEmail.save();
            user = existingByEmail;
          }
        } else {
          throw saveError;
        }
      }
    } catch (mongoError) {
      console.error('clerk-sync mongo error', mongoError);
      user = null;
      if (!username) {
        username = normalizedEmail.split('@')[0] || `user${Date.now()}`;
      }
    }

    let supabaseAdmin = null;
    try {
      supabaseAdmin = getSupabaseAdminClient({ purpose: 'admin', allowDemo: true });
    } catch (adminError) {
      console.error('clerk-sync supabase admin error', adminError);
      return res.status(500).json({
        error: 'Supabase admin client unavailable',
        details: adminError?.message || 'Unknown Supabase admin error'
      });
    }
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase is not configured', details: 'Missing Supabase credentials' });
    }

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('id, role, email, clerk_id')
      .eq('clerk_id', clerkId)
      .maybeSingle();
    console.log('clerk-sync supabase lookup', {
      clerkId,
      existingUser: existingUser || null,
      error: existingUserError || null
    });

    const { data: existingByEmail, error: existingByEmailError } = await supabaseAdmin
      .from('users')
      .select('id, role, clerk_id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    console.log('clerk-sync supabase email lookup', {
      email: normalizedEmail,
      existingByEmail: existingByEmail || null,
      error: existingByEmailError || null
    });

    if (existingByEmail && existingByEmail.clerk_id && existingByEmail.clerk_id !== clerkId) {
      return res.status(409).json({ error: 'Email is already linked to another account' });
    }

    if (existingByEmail && !existingByEmail.clerk_id) {
      const { data: linkData, error: linkError } = await supabaseAdmin
        .from('users')
        .update({ clerk_id: clerkId })
        .eq('id', existingByEmail.id)
        .select('id, role, email, clerk_id')
        .maybeSingle();
      console.log('clerk-sync supabase link', {
        response: linkData || null,
        error: linkError || null
      });
    }

    const desiredRole = existingUser?.role || existingByEmail?.role || 'user';
    const { data: upsertedUser, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        clerk_id: clerkId,
        email: normalizedEmail,
        role: desiredRole
      }, { onConflict: 'clerk_id' })
      .select('id, role, email, clerk_id')
      .maybeSingle();
    console.log('clerk-sync supabase upsert', {
      response: upsertedUser || null,
      error: upsertError || null
    });

    if (upsertError || !upsertedUser) {
      return res.status(500).json({
        error: 'Failed to sync user with Supabase',
        details: upsertError?.message || 'Unknown Supabase error'
      });
    }

    const supabaseRole = upsertedUser.role || desiredRole || 'user';

    req.user = user;
    const responseUser = user
      ? {
          _id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: supabaseRole,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      : {
          _id: null,
          email: normalizedEmail,
          username,
          firstName: '',
          lastName: '',
          role: supabaseRole,
          isActive: true,
          createdAt: new Date()
        };
    res.status(200).json({
      user: responseUser
    });
  } catch (error) {
    console.error('Clerk sync error:', error);
    res.status(500).json({ 
      error: 'Failed to sync user with backend',
      details: error?.message || 'Unknown error'
    });
  }
});

router.get('/debug-token', requireClerkAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.clerkId;
    const emailFromToken = req.auth?.email || null;
    const resolvedEmail = emailFromToken || await getClerkEmail(clerkId);
    const normalizedEmail = resolvedEmail ? resolvedEmail.toLowerCase() : null;
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { data: byClerkId } = await supabaseAdmin
      .from('users')
      .select('id, clerk_id, email, role')
      .eq('clerk_id', clerkId)
      .maybeSingle();

    const { data: byEmail } = normalizedEmail
      ? await supabaseAdmin
        .from('users')
        .select('id, clerk_id, email, role')
        .eq('email', normalizedEmail)
        .maybeSingle()
      : { data: null };

    res.json({
      clerkId,
      emailFromToken,
      resolvedEmail: normalizedEmail,
      supabaseByClerkId: byClerkId || null,
      supabaseByEmail: byEmail || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to inspect token', details: error?.message || 'Unknown error' });
  }
});

// Get current user (protected route)
router.get('/me', requireClerkAuth, requireSupabaseUser, async (req, res) => {
  try {
    const mongoUser = req.user || await User.findOne({ clerkId: req.auth.clerkId }).select('-password');
    if (mongoUser) {
      return res.json({ user: { ...mongoUser.toObject(), role: req.auth.role } });
    }

    const usernameFallback = String(req.auth?.email || '').split('@')[0] || `user${Date.now()}`;
    res.json({
      user: {
        _id: null,
        email: req.auth?.email || '',
        username: usernameFallback,
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        role: req.auth?.role || 'user',
        isActive: true,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information', details: error?.message || 'Unknown error' });
  }
});

// Update user profile (protected route)
router.put('/profile', requireClerkAuth, requireSupabaseUser, async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    
    let user = await User.findOne({ clerkId: req.auth.clerkId });
    if (!user) {
      const email = String(req.auth?.email || '').toLowerCase();
      const usernameBase = email.split('@')[0] || `user${Date.now()}`;
      let username = usernameBase;
      let suffix = 1;
      while (await User.findOne({ username })) {
        username = `${usernameBase}${suffix}`;
        suffix += 1;
      }

      user = new User({
        clerkId: req.auth.clerkId,
        email: email || `clerk-${req.auth.clerkId}@no-email.local`,
        username,
        firstName: '',
        lastName: '',
        role: 'customer',
        isActive: true
      });
    }

    // Update allowed fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;

    await user.save();

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        role: req.auth.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error?.message || 'Unknown error' });
  }
});

// Get all users (admin only)
router.get('/users', requireClerkAuth, requireSupabaseUser, async (req, res) => {
  try {
    if (req.auth.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, clerk_id, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to get users' });
    }

    res.json({ users: data || [] });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

module.exports = router;
