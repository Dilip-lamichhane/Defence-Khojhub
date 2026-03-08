import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignIn, useAuth, useUser } from '@clerk/clerk-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { syncUserWithBackend, getProfile, clearError } from '../store/slices/authSlice';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  const { isSignedIn, user: clerkUser, isLoaded } = useUser();
  
  const { isLoading, error } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [dispatch, error]);

  useEffect(() => {
    const syncUser = async () => {
      if (isSignedIn && clerkUser && isLoaded) {
        try {
          const token = await getToken();
          if (!token) return;
          await dispatch(syncUserWithBackend({ token })).unwrap();
          await dispatch(getProfile({ token })).unwrap();

          const from = location.state?.from?.pathname;
          if (from && from !== '/login' && from !== '/register') {
            navigate(from, { replace: true });
          } else {
            navigate('/profile', { replace: true });
          }
        } catch (error) {
          console.error('Failed to sync user with backend:', error);
        }
      }
    };

    syncUser();
  }, [isSignedIn, clerkUser, isLoaded, dispatch, navigate, location, getToken]);

  // Show loading while Clerk is initializing
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // If already signed in, show loading while syncing
  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <a
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </a>
          </p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SignIn 
            routing="path"
            path="/login"
            signUpUrl="/register"
            afterSignInUrl="/profile"
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
                footerActionLink: 'text-blue-600 hover:text-blue-500',
                formFieldInput: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
              },
            }}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            By signing in, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
