import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getActiveSupabaseProject, isDemoMode } from '../../config/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const initialSupabaseProject = getActiveSupabaseProject();
const initialIsDemoMode = isDemoMode();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// Async thunks for Clerk integration
export const syncUserWithBackend = createAsyncThunk(
  'auth/syncUserWithBackend',
  async ({ token }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        '/clerk-auth/clerk-sync',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { user } = response.data;
      return { user };
    } catch (error) {
      const details = error.response?.data?.details;
      return rejectWithValue(details || error.response?.data?.error || 'Failed to sync user');
    }
  }
);

export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async ({ token }, { rejectWithValue }) => {
    try {
      const response = await api.get('/clerk-auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.user;
    } catch (error) {
      const details = error.response?.data?.details;
      return rejectWithValue(details || error.response?.data?.error || 'Failed to fetch profile');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    return null;
  }
);

export const updateRole = createAsyncThunk(
  'auth/updateRole',
  async ({ role, token }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        '/auth/role',
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.user;
    } catch (error) {
      const details = error.response?.data?.details;
      return rejectWithValue(details || error.response?.data?.error || 'Failed to update role');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async ({ profileData, token }, { rejectWithValue }) => {
    try {
      const response = await api.put('/clerk-auth/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.user;
    } catch (error) {
      const details = error.response?.data?.details;
      return rejectWithValue(details || error.response?.data?.error || 'Failed to update profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    clerkUser: null,
    activeSupabaseProject: initialSupabaseProject,
    isDemoMode: initialIsDemoMode,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setClerkUser: (state, action) => {
      state.clerkUser = action.payload;
    },
    setSupabaseMode: (state, action) => {
      state.activeSupabaseProject = action.payload?.project || state.activeSupabaseProject;
      state.isDemoMode = Boolean(action.payload?.isDemoMode);
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.clerkUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sync User with Backend
      .addCase(syncUserWithBackend.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(syncUserWithBackend.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(syncUserWithBackend.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.user = null;
        state.isAuthenticated = false;
      })
      // Get Profile
      .addCase(getProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.user = null;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.clerkUser = null;
        state.error = null;
      })
      // Update Role
      .addCase(updateRole.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update User Profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setUser, setClerkUser, setSupabaseMode, clearAuth } = authSlice.actions;
export default authSlice.reducer;
