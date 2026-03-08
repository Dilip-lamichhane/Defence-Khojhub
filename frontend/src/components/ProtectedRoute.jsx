import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useAppSelector } from '../store/hooks';

const ProtectedRoute = ({ children, requiredRole, requiredRoles }) => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { user: backendUser, isLoading, error } = useAppSelector((state) => state.auth);
  const showOverlay = !isLoaded || isLoading || (isSignedIn && !backendUser && !error);

  if (isLoaded && !isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = Array.isArray(requiredRoles)
    ? requiredRoles
    : requiredRole
      ? [requiredRole]
      : null;

  if (allowedRoles && isLoaded) {
    const clerkRole = user?.publicMetadata?.role || user?.privateMetadata?.role;
    if (clerkRole && !allowedRoles.includes(clerkRole)) {
      return <Navigate to="/map" replace />;
    }
  }

  return (
    <div className="min-h-screen">
      {children}
      {showOverlay && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center bg-white/60">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default ProtectedRoute;
