import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';


const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { activeSupabaseProject, isDemoMode, user } = useAppSelector((state) => state.auth);
  const modeLabel = isDemoMode ? 'Demo DB' : 'Real DB';
  const role = user?.role;

  return (

    <header className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-xl font-bold text-gray-800">KhojHub</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Home
            </Link>
            <Link to="/map" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Map
            </Link>
            {(role === 'shopowner' || role === 'shopkeeper') && (
              <Link to="/shop" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                My Shop
              </Link>
            )}
            {role === 'admin' && (
              <Link to="/admin" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Admin Dashboard
              </Link>
            )}
            <Link to="/about" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              About
            </Link>
          </nav>

          {/* Supabase Mode Indicator */}
          <div className="hidden md:flex items-center">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isDemoMode
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
              title={`Active Supabase project: ${activeSupabaseProject}`}
            >
              {modeLabel}
            </span>
          </div>

          {/* Location Indicator */}
          <div className="hidden lg:flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">

            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm text-gray-700">Current Location</span>
            <span className="text-sm font-medium text-blue-600">Mumbai, India</span>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-3">
            <Link 
              to="/login" 
              className="hidden md:block text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Login
            </Link>
            <Link 
              to="/register" 
              className="hidden md:block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Register
            </Link>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-3 space-y-2">
            <Link 
              to="/" 
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/map" 
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Map
            </Link>
            {(role === 'shopowner' || role === 'shopkeeper') && (
              <Link 
                to="/shop" 
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                My Shop
              </Link>
            )}
            {role === 'admin' && (
              <Link 
                to="/admin" 
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin Dashboard
              </Link>
            )}
            <Link 
              to="/about" 
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <Link 
                to="/login" 
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="block px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors mt-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;