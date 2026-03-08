const { verifyToken, clerkClient } = require('@clerk/clerk-sdk-node');
const { getSupabaseAdminClient } = require('../config/supabase');
const User = require('../models/User');

const sanitizeHeaders = (headers = {}) => {
  const copy = { ...headers };
  if (copy.authorization) copy.authorization = 'Bearer [REDACTED]';
  if (copy.cookie) copy.cookie = '[REDACTED]';
  return copy;
};

const requireClerkAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'Clerk is not configured', details: 'Missing CLERK_SECRET_KEY' });
    }

    const payload = await verifyToken(token, { secretKey });
    if (!payload?.sub) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const resolvedEmail = payload.email || payload.email_address || payload?.claims?.email || payload?.claims?.email_address || null;
    req.auth = {
      clerkId: payload.sub,
      email: resolvedEmail,
      tokenClaims: {
        sub: payload.sub,
        email: resolvedEmail
      }
    };
    next();
  } catch (error) {
    console.error('Clerk auth error', {
      path: req.originalUrl,
      headers: sanitizeHeaders(req.headers),
      error: error?.message || 'Unknown error'
    });
    return res.status(401).json({ error: 'Invalid session' });
  }
};

const requireSupabaseUser = async (req, res, next) => {
  try {
    if (!req.auth?.clerkId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, clerk_id, email, role')
      .eq('clerk_id', req.auth.clerkId)
      .maybeSingle();

    let resolvedUser = data;
    if ((!resolvedUser || error) && req.auth?.email) {
      const normalizedEmail = String(req.auth.email).toLowerCase();
      const { data: byEmail } = await supabase
        .from('users')
        .select('id, clerk_id, email, role')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (byEmail && !byEmail.clerk_id) {
        await supabase.from('users').update({ clerk_id: req.auth.clerkId }).eq('id', byEmail.id);
      }
      resolvedUser = byEmail || null;
    }

    if (!resolvedUser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.auth = {
      ...req.auth,
      email: resolvedUser.email,
      role: resolvedUser.role,
      supabaseUserId: resolvedUser.id
    };

    const mongoUser = await User.findOne({ clerkId: req.auth.clerkId }).select('-password');
    req.user = mongoUser || null;

    next();
  } catch (error) {
    console.error('Supabase auth error', {
      path: req.originalUrl,
      headers: sanitizeHeaders(req.headers),
      error: error?.message || 'Unknown error'
    });
    return res.status(500).json({ error: 'Authorization failed', details: error?.message || 'Unknown error' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.auth?.role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

const getClerkEmail = async (clerkId) => {
  try {
    const user = await clerkClient.users.getUser(clerkId);
    const primaryEmailId = user?.primaryEmailAddressId;
    const primaryEmail = user?.emailAddresses?.find((entry) => entry.id === primaryEmailId)?.emailAddress;
    const fallbackEmail = user?.emailAddresses?.[0]?.emailAddress;
    const externalEmail = user?.externalAccounts?.find((entry) => entry?.emailAddress)?.emailAddress;
    return primaryEmail || fallbackEmail || externalEmail || '';
  } catch (error) {
    return '';
  }
};

module.exports = { requireClerkAuth, requireSupabaseUser, requireRole, getClerkEmail };
