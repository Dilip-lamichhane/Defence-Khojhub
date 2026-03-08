import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const hexToBytes = (hex) => {
  const clean = String(hex || '').trim();
  if (!clean || clean.length % 2 !== 0) return null;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
};

const parseWkbPoint = (hex) => {
  const bytes = hexToBytes(hex);
  if (!bytes || bytes.length < 21) return null;
  const view = new DataView(bytes.buffer);
  const littleEndian = view.getUint8(0) === 1;
  let offset = 1;
  const type = view.getUint32(offset, littleEndian);
  offset += 4;
  const hasSrid = (type & 0x20000000) !== 0;
  if (hasSrid) {
    offset += 4;
  }
  if (bytes.length < offset + 16) return null;
  const x = view.getFloat64(offset, littleEndian);
  const y = view.getFloat64(offset + 8, littleEndian);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { lng: x, lat: y };
};

const mapSupabaseShopRow = (row) => {
  const locationHex = typeof row.location === 'string' ? row.location : null;
  const parsedPoint = locationHex ? parseWkbPoint(locationHex) : null;

  const lat =
    row.latitude ??
    row.lat ??
    row.location?.lat ??
    row.location?.latitude ??
    row.location_lat ??
    row.geo_lat ??
    row.location?.coordinates?.[1] ??
    row.geometry?.coordinates?.[1] ??
    row.coordinates?.[1] ??
    row.location?.coords?.[1] ??
    parsedPoint?.lat;

  const lng =
    row.longitude ??
    row.lng ??
    row.lon ??
    row.location?.lng ??
    row.location?.longitude ??
    row.location_lng ??
    row.geo_lng ??
    row.location?.coordinates?.[0] ??
    row.geometry?.coordinates?.[0] ??
    row.coordinates?.[0] ??
    row.location?.coords?.[0] ??
    parsedPoint?.lng;

  return {
    _id: `sb_${row.id}`,
    name: row.name,
    description: row.description ?? null,
    image: row.image_url ?? null,
    address: row.address,
    phone: row.phone ?? null,
    rating: 0,
    reviewCount: 0,
    category: row.category ? { name: row.category } : null,
    operatingHours: null,
    open_time: row.open_time ?? null,
    close_time: row.close_time ?? null,
    status: row.status ?? null,
    distance: undefined,
    location: {
      type: 'Point',
      coordinates: [Number(lng), Number(lat)],
    },
  };
};


// Async thunks
export const fetchShops = createAsyncThunk(
  'shops/fetchShops',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/shops/search');
      const { shops = [], totalPages = 1, currentPage = 1, total = shops.length } = response.data || {};
      return {
        shops,
        pagination: {
          page: currentPage,
          limit: shops.length,
          total,
          pages: totalPages,
        },
      };
    } catch (error) {
      try {
        const response = await api.get('/supabase/shops');
        const shops = (response.data?.shops || []).map(mapSupabaseShopRow);
        return {
          shops,
          pagination: {
            page: 1,
            limit: shops.length,
            total: shops.length,
            pages: 1,
          },
        };
      } catch (fallbackError) {
        return rejectWithValue(
          error.response?.data?.error ||
          fallbackError.response?.data?.error ||
          'Failed to fetch shops'
        );
      }
    }
  }
);

export const fetchSupabaseShops = createAsyncThunk(
  'shops/fetchSupabaseShops',
  async (params = {}, { rejectWithValue }) => {
    try {
      const normalizedParams = params && typeof params === 'object' ? params : {};
      const product = String(normalizedParams.product || '').trim();
      const category = String(normalizedParams.category || '').trim();
      const project = String(normalizedParams.project || 'REAL').toUpperCase();
      const headers = { 'x-supabase-project': project };

      const pageSize = 500;
      const maxPages = 20;
      let offset = 0;
      let rows = [];

      for (let page = 0; page < maxPages; page += 1) {
        const response = await api.get('/supabase/shops', {
          params: {
            limit: pageSize,
            offset,
            ...(product ? { product } : {}),
            ...(category ? { category } : {}),
          },
          headers,
        });

        const batch = response.data?.shops || [];
        rows = rows.concat(batch);

        if (batch.length < pageSize) break;
        offset += pageSize;
      }

      const shops = rows
        .map(mapSupabaseShopRow)
        .filter(
          (shop) =>
            Number.isFinite(shop.location?.coordinates?.[0]) &&
            Number.isFinite(shop.location?.coordinates?.[1])
        );

      return {
        shops,
        pagination: {
          page: 1,
          limit: shops.length,
          total: shops.length,
          pages: 1,
        },
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch Supabase shops');
    }
  }
);

export const fetchSupabaseShopProducts = createAsyncThunk(
  'shops/fetchSupabaseShopProducts',
  async ({ shopId, q, project } = {}, { rejectWithValue }) => {
    try {
      const headers = { 'x-supabase-project': String(project || 'REAL').toUpperCase() };
      const response = await api.get(`/supabase/shops/${shopId}/products`, {
        params: q ? { q } : undefined,
        headers,
      });

      return {
        shopId: String(shopId),
        products: response.data?.products || [],
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch shop catalog');
    }
  }
);

export const searchShops = createAsyncThunk(
  'shops/searchShops',
  async ({ lat, lng, radius, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await api.get('/shops/search', {
        params: { lat, lng, radius, page, limit }
      });
      const { shops = [], totalPages = 1, currentPage = page, total = shops.length } = response.data || {};
      return {
        shops,
        pagination: {
          page: currentPage,
          limit,
          total,
          pages: totalPages,
        },
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to search shops');
    }
  }
);

export const getShopDetails = createAsyncThunk(
  'shops/getShopDetails',
  async (shopId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/shops/${shopId}`);
      return response.data.shop;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch shop details');
    }
  }
);

export const createShop = createAsyncThunk(
  'shops/createShop',
  async (shopData, { rejectWithValue }) => {
    try {
      const response = await api.post('/shops', shopData);
      return response.data.shop;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create shop');
    }
  }
);

export const updateShop = createAsyncThunk(
  'shops/updateShop',
  async ({ shopId, shopData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/shops/${shopId}`, shopData);
      return response.data.shop;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update shop');
    }
  }
);

export const deleteShop = createAsyncThunk(
  'shops/deleteShop',
  async (shopId, { rejectWithValue }) => {
    try {
      await api.delete(`/shops/${shopId}`);
      return shopId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete shop');
    }
  }
);

const shopsSlice = createSlice({
  name: 'shops',
  initialState: {
    shops: [],
    currentShop: null,
    loading: false,
    error: null,
    supabaseCatalog: {
      byShopId: {},
      loadingByShopId: {},
      errorByShopId: {},
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      pages: 1
    },
    searchParams: {
      lat: null,
      lng: null,
      radius: 5
    }
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentShop: (state, action) => {
      state.currentShop = action.payload;
    },
    setSearchParams: (state, action) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    clearShops: (state) => {
      state.shops = [];
      state.currentShop = null;
      state.pagination = {
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch shops
      .addCase(fetchShops.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShops.fulfilled, (state, action) => {
        state.loading = false;
        state.shops = action.payload.shops;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchShops.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSupabaseShops.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.shops = [];
      })
      .addCase(fetchSupabaseShops.fulfilled, (state, action) => {
        state.loading = false;
        state.shops = action.payload.shops;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchSupabaseShops.rejected, (state, action) => {
        state.loading = false;
        state.shops = [];
        state.pagination = {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1
        };
        state.error = action.payload;
      })
      .addCase(fetchSupabaseShopProducts.pending, (state, action) => {
        const shopId = String(action.meta.arg?.shopId ?? '');
        if (shopId) {
          state.supabaseCatalog.loadingByShopId[shopId] = true;
          state.supabaseCatalog.errorByShopId[shopId] = null;
        }
      })
      .addCase(fetchSupabaseShopProducts.fulfilled, (state, action) => {
        const shopId = String(action.payload?.shopId ?? '');
        if (shopId) {
          state.supabaseCatalog.loadingByShopId[shopId] = false;
          state.supabaseCatalog.byShopId[shopId] = action.payload.products || [];
          state.supabaseCatalog.errorByShopId[shopId] = null;
        }
      })
      .addCase(fetchSupabaseShopProducts.rejected, (state, action) => {
        const shopId = String(action.meta.arg?.shopId ?? '');
        if (shopId) {
          state.supabaseCatalog.loadingByShopId[shopId] = false;
          state.supabaseCatalog.errorByShopId[shopId] = action.payload || 'Failed to fetch shop catalog';
        }
      })
      // Search shops
      .addCase(searchShops.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchShops.fulfilled, (state, action) => {
        state.loading = false;
        state.shops = action.payload.shops;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(searchShops.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get shop details
      .addCase(getShopDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getShopDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentShop = action.payload;
        state.error = null;
      })
      .addCase(getShopDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create shop
      .addCase(createShop.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createShop.fulfilled, (state, action) => {
        state.loading = false;
        state.shops.unshift(action.payload);
        state.error = null;
      })
      .addCase(createShop.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update shop
      .addCase(updateShop.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateShop.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.shops.findIndex(shop => shop._id === action.payload._id);
        if (index !== -1) {
          state.shops[index] = action.payload;
        }
        if (state.currentShop && state.currentShop._id === action.payload._id) {
          state.currentShop = action.payload;
        }
        state.error = null;
      })
      .addCase(updateShop.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete shop
      .addCase(deleteShop.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteShop.fulfilled, (state, action) => {
        state.loading = false;
        state.shops = state.shops.filter(shop => shop._id !== action.payload);
        if (state.currentShop && state.currentShop._id === action.payload) {
          state.currentShop = null;
        }
        state.error = null;
      })
      .addCase(deleteShop.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setCurrentShop, setSearchParams, clearShops } = shopsSlice.actions;
export default shopsSlice.reducer;
