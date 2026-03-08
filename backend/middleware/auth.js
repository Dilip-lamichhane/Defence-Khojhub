const { verifyToken } = require('@clerk/clerk-sdk-node');
const { User } = require('../models');
const { getSupabaseAdminClient, getActiveSupabaseProject } = require('../config/supabase');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    if (!payload?.sub) {
      return res.status(401).json({ error: 'Invalid session.' });
    }
    const tokenEmail = payload.email || payload.email_address || payload?.claims?.email || payload?.claims?.email_address || null;

    const supabase = getSupabaseAdminClient({ purpose: 'auth', allowDemo: true });
    if (!supabase) {
      const activeProject = getActiveSupabaseProject();
      const missing = [];
      if (!process.env[`${activeProject}_SUPABASE_URL`]) {
        missing.push(`${activeProject}_SUPABASE_URL`);
      }
      if (
        !process.env[`${activeProject}_SUPABASE_SERVICE_KEY`] &&
        !process.env[`${activeProject}_SUPABASE_SERVICE_ROLE_KEY`] &&
        !process.env[`${activeProject}_SUPABASE_ANON_KEY`] &&
        !process.env[`${activeProject}_SUPABASE_PUBLISHABLE_KEY`] &&
        !process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.SUPABASE_ANON_KEY &&
        !process.env.SUPABASE_PUBLISHABLE_KEY
      ) {
        missing.push(`${activeProject}_SUPABASE_SERVICE_KEY or ${activeProject}_SUPABASE_ANON_KEY`);
      }
      return res.status(500).json({
        error: 'Supabase is not configured',
        details: missing.length ? `Missing ${missing.join(', ')}` : 'Missing Supabase client'
      });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, clerk_id, email, role')
      .eq('clerk_id', payload.sub)
      .maybeSingle();

    let resolvedUser = data;
    if ((!resolvedUser || error) && tokenEmail) {
      const normalizedEmail = String(tokenEmail).toLowerCase();
      const { data: byEmail } = await supabase
        .from('users')
        .select('id, clerk_id, email, role')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (byEmail && !byEmail.clerk_id) {
        await supabase.from('users').update({ clerk_id: payload.sub }).eq('id', byEmail.id);
      }
      resolvedUser = byEmail || null;
    }

    if (!resolvedUser) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const user = await User.findOne({ clerkId: payload.sub }).select('-password');
    if (user && user.isActive === false) {
      return res.status(401).json({ error: 'Account is deactivated.' });
    }

    req.user = user || null;
    req.auth = {
      clerkId: payload.sub,
      email: resolvedUser.email,
      role: resolvedUser.role,
      supabaseUserId: resolvedUser.id
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Authentication failed.',
      details: error?.message || 'Unknown error'
    });
  }
};

module.exports = { authenticate };
