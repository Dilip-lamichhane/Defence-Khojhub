import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ShopDetailsPage from './pages/ShopDetailsPage.jsx';
import ShopkeeperDashboard from './pages/ShopkeeperDashboard.jsx';
import AdminPortal from './pages/AdminPortal.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ShopDashboard from './pages/ShopDashboard.jsx';
import CategoryMapPageScrollable from './pages/CategoryMapPageScrollable.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AuthBootstrap from './components/AuthBootstrap.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
          <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-lg text-center">
            <h2 className="text-xl font-semibold text-gray-900">Admin UI failed to render</h2>
            <p className="mt-2 text-sm text-gray-600">Please refresh the page or try again.</p>
            <button
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              onClick={() => this.setState({ hasError: false })}
            >
              Reload UI
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <Router>
      <AuthBootstrap />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/shop/:id" element={<ShopDetailsPage />} />
        <Route path="/map" element={<CategoryMapPageScrollable />} />
        <Route
          path="/shop"
          element={
            <ProtectedRoute requiredRoles={["shopowner", "shopkeeper", "merchant", "shop_owner", "admin"]}>
              <ShopDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shopkeeper"
          element={<Navigate to="/shop" replace />}
        />
        <Route
          path="/admin"
          element={
            <ErrorBoundary>
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            </ErrorBoundary>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ErrorBoundary>
              <ProtectedRoute requiredRole="admin">
                <AdminPortal />
              </ProtectedRoute>
            </ErrorBoundary>
          }
        />
      </Routes>
    </Router>
  );
}
