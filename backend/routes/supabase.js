const express = require('express');
const { getSupabaseClient, getSupabaseAdminClient } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const resolveSupabaseProject = (req, res) => {
  const raw = req.header('x-supabase-project');
  const normalized = String(raw || '').toUpperCase();
  if (normalized !== 'REAL' && normalized !== 'DUMMY') {
    res.status(400).json({ error: 'Supabase project header is required' });
    return null;
  }
  return normalized;
};

router.get('/health', async (req, res) => {
  try {
    const project = resolveSupabaseProject(req, res);
    if (!project) return;
    const supabase = getSupabaseClient({ project });

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { error } = await supabase.from('shops').select('id').limit(1);
    if (error) {
      return res.status(500).json({ error: 'Failed to connect to Supabase' });
    }

    return res.json({ status: 'OK', supabase: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to connect to Supabase' });
  }
});

router.post('/shops/register', authenticate, async (req, res) => {
  try {
    const project = resolveSupabaseProject(req, res);
    if (!project) return;
    const supabase = getSupabaseAdminClient({ purpose: 'shop', project });


    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { name, latitude, longitude, phone, panNumber } = req.body || {};
    const ownerId = req.auth?.supabaseUserId;
    const email = req.auth?.email;

    if (!ownerId || !email) {
      return res.status(400).json({ error: 'Owner identity is required' });
    }

    const normalizedName = String(name || '').trim();
    const lat = Number(latitude);
    const lng = Number(longitude);
    const normalizedPhone = String(phone || '').trim();
    const normalizedPan = String(panNumber || '').trim();

    if (!normalizedName) {
      return res.status(400).json({ error: 'Shop name is required' });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Phone is required' });
    }
    if (!normalizedPan) {
      return res.status(400).json({ error: 'PAN number is required' });
    }

    const { data, error } = await supabase
      .from('shops')
      .insert([
        {
          owner_id: ownerId,
          name: normalizedName,
          latitude: lat,
          longitude: lng,
          email,
          phone: normalizedPhone,
          pan_number: normalizedPan,
          status: 'pending'
        }
      ])
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to register shop' });
    }

    return res.json({ shop: data });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to register shop' });
  }
});

router.get('/shops', async (req, res) => {
  try {
    const normalizedProject = resolveSupabaseProject(req, res);
    if (!normalizedProject) return;
    const isDemoProject = normalizedProject === 'DUMMY';
    const supabase = getSupabaseClient({ project: normalizedProject });
    if (!supabase) {


      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const { limit = 50, offset = 0, category, product } = req.query;
    const normalizedProduct = String(product || '').trim();

    if (normalizedProduct) {
      let productQuery = supabase
        .from('products')
        .select('shop_id')
        .ilike('name', `%${normalizedProduct}%`);

      if (!isDemoProject) {
        productQuery = productQuery.eq('status', 'active');
      }

      const { data: productRows, error: productError } = await productQuery.limit(5000);


      if (productError) {
        return res.status(500).json({ error: 'Failed to search products in Supabase' });
      }

      const shopIds = Array.from(
        new Set((productRows || []).map((row) => row.shop_id).filter((id) => id != null))
      );

      if (shopIds.length === 0) {
        return res.json({ shops: [] });
      }

      let shopsQuery = supabase.from('shops').select('*').in('id', shopIds);
      if (!isDemoProject) {
        shopsQuery = shopsQuery.eq('status', 'approved');
      }

      if (category) {
        shopsQuery = shopsQuery.eq('category', category);
      }

      const { data, error } = await shopsQuery
        .order('id', { ascending: true })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch filtered shops from Supabase' });
      }

      return res.json({ shops: data || [] });
    }

    let shopsQuery = supabase.from('shops').select('*');
    if (!isDemoProject) {
      shopsQuery = shopsQuery.eq('status', 'approved');
    }

    if (category) {
      shopsQuery = shopsQuery.eq('category', category);
    }

    const { data, error } = await shopsQuery
      .order('id', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch shops from Supabase' });
    }

    return res.json({ shops: data || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch shops from Supabase' });
  }
});

router.get('/shops/:shopId/products', async (req, res) => {
  try {
    const normalizedProject = resolveSupabaseProject(req, res);
    if (!normalizedProject) return;
    const isDemoProject = normalizedProject === 'DUMMY';
    const supabase = getSupabaseClient({ project: normalizedProject });
    if (!supabase) {

      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    const shopId = String(req.params.shopId || '').trim();
    if (!shopId) {
      return res.status(400).json({ error: 'Invalid shop ID' });
    }

    const query = String(req.query.q || '').trim();

    let productsQuery = supabase
      .from('products')
      .select('*')
      .eq('shop_id', shopId);

    if (!isDemoProject) {
      productsQuery = productsQuery.eq('status', 'active');
    }

    if (query) {
      productsQuery = productsQuery.ilike('name', `%${query}%`);
    }

    const { data, error } = await productsQuery.order('name', { ascending: true }).limit(5000);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch products from Supabase' });
    }

    return res.json({ products: data || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch products from Supabase' });
  }
});

module.exports = router;
