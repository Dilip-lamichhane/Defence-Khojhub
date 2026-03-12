import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const initialState = {
  reviews: [],
  currentReview: null,
  loading: false,
  error: null,
};

const normalizeReview = (r) => {
  if (!r) return r;
  // Supabase shape uses id, review_text, created_at, user
  if (r.id && !r._id) {
    return {
      _id: r.id,
      id: r.id,
      comment: r.review_text || r.comment || '',
      createdAt: r.created_at || r.createdAt,
      rating: r.rating,
      user: r.user || null,
      shop_id: r.shop_id || r.shop
    };
  }
  // Mongo shape
  return {
    _id: r._id || r.id,
    id: r.id || r._id,
    comment: r.comment || r.review_text || '',
    createdAt: r.createdAt || r.created_at || r.created_at,
    rating: r.rating,
    user: r.author || r.user || null,
    shop_id: r.shop || r.shop_id
  };
};

// Fetch reviews for a shop
export const fetchReviews = createAsyncThunk(
  'reviews/fetchReviews',
  async (shopId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reviews/shop/${shopId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch reviews');
    }
  }
);

// Create a review
export const createReview = createAsyncThunk(
  'reviews/createReview',
  async ({ shopId, reviewData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/reviews/shop/${shopId}`, reviewData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create review');
    }
  }
);

// Update a review
export const updateReview = createAsyncThunk(
  'reviews/updateReview',
  async ({ reviewId, reviewData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/reviews/${reviewId}`, reviewData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update review');
    }
  }
);

// Delete a review
export const deleteReview = createAsyncThunk(
  'reviews/deleteReview',
  async (reviewId, { rejectWithValue }) => {
    try {
      await api.delete(`/reviews/${reviewId}`);
      return reviewId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete review');
    }
  }
);

// Fetch my reviews
export const fetchMyReviews = createAsyncThunk(
  'reviews/fetchMyReviews',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/reviews/my');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch your reviews');
    }
  }
);

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearReviews: (state) => {
      state.reviews = [];
      state.currentReview = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch reviews
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload.reviews || action.payload;
        state.reviews = (Array.isArray(payload) ? payload : []).map(normalizeReview);
        state.error = null;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create review
      .addCase(createReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.loading = false;
        const r = normalizeReview(action.payload.review || action.payload);
        if (r) state.reviews.unshift(r);
        state.error = null;
      })
      .addCase(createReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update review
      .addCase(updateReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        state.loading = false;
        const updated = normalizeReview(action.payload.review || action.payload);
        const index = state.reviews.findIndex(review => review._id === updated._id || review.id === updated.id);
        if (index !== -1) {
          state.reviews[index] = updated;
        }
        state.error = null;
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete review
      .addCase(deleteReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = state.reviews.filter(review => (review._id || review.id) !== action.payload);
        state.error = null;
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
    // Fetch my reviews
    builder
      .addCase(fetchMyReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyReviews.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload.reviews || action.payload;
        state.reviews = (Array.isArray(payload) ? payload : []).map(normalizeReview);
        state.error = null;
      })
      .addCase(fetchMyReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearReviews } = reviewsSlice.actions;
export default reviewsSlice.reducer;