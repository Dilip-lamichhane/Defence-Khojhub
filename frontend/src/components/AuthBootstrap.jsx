import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { syncUserWithBackend, setSupabaseMode } from '../store/slices/authSlice';
import { getActiveSupabaseProject, isDemoMode } from '../config/supabase';

const AuthBootstrap = () => {
  const dispatch = useAppDispatch();
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { user: backendUser, isLoading, error } = useAppSelector((state) => state.auth);
  const retryCount = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    dispatch(
      setSupabaseMode({
        project: getActiveSupabaseProject(),
        isDemoMode: isDemoMode()
      })
    );
  }, [dispatch]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !clerkUser) {
      retryCount.current = 0;
      return;
    }
    if (backendUser) return;
    if (isLoading) return;
    if (retryCount.current >= 3) return;

    retryCount.current += 1;
    getToken()
      .then((tokenValue) => {
        if (!tokenValue) return;
        dispatch(syncUserWithBackend({ token: tokenValue }));
      })
      .catch(() => {});
  }, [backendUser, clerkUser, dispatch, isLoaded, isLoading, isSignedIn, getToken, error]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !backendUser) return;
    const currentPath = location.pathname || '/';
    const shouldRedirect = currentPath === '/login' || currentPath === '/register';
    if (!shouldRedirect) return;

    const role =
      clerkUser?.publicMetadata?.role ||
      clerkUser?.privateMetadata?.role ||
      backendUser?.role;
    if (role === 'shopowner' || role === 'shopkeeper' || role === 'merchant' || role === 'shop_owner') {
      navigate('/shop', { replace: true });
      return;
    }
    navigate('/map', { replace: true });
  }, [backendUser, isLoaded, isSignedIn, location.pathname, navigate]);

  return null;
};

export default AuthBootstrap;
