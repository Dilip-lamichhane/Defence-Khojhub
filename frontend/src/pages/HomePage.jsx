import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchShops } from '../store/slices/shopsSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton,
  useAuth,
  useUser
} from '@clerk/clerk-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Glassmorphism Navigation Component
const Navigation = () => {
  const { user: backendUser } = useAppSelector((state) => state.auth);
  const role = backendUser?.role;
  const [isScrolled, setIsScrolled] = useState(false);
  const [locationLabel, setLocationLabel] = useState(() => {
    if (typeof navigator === 'undefined') return 'Detecting location...';
    return navigator.geolocation ? 'Detecting location...' : 'Location unavailable';
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let isActive = true;
    if (!navigator.geolocation) {
      return () => {};
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          const response = await fetch(
            `${API_BASE_URL}/geocode/reverse?lat=${latitude}&lon=${longitude}`
          );
          if (response.ok) {
            const data = await response.json();
            const address = data?.address || {};
            const city = address.city || address.town || address.village || address.state;
            const country = address.country;
            if (city && country) {
              label = `${city}, ${country}`;
            } else if (country) {
              label = country;
            }
          }
        } catch {
          label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }

        if (isActive) {
          setLocationLabel(label);
        }
      },
      () => {
        if (isActive) {
          setLocationLabel('Location unavailable');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold bg-linear-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                KhojHub
              </span>
              <span className="text-xs text-gray-600 font-medium">Discover Local</span>
            </div>
          </div>

          {/* Location Indicator */}
          <div className="hidden md:flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30 shadow-sm hover:bg-white/80 transition-all duration-200 cursor-pointer">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex flex-col">
              <span className="text-xs text-blue-600 font-medium">Current Location</span>
              <span className="text-sm font-semibold text-blue-800">{locationLabel}</span>
            </div>
          </div>

          {/* Auth Controls */}
          <div className="flex items-center space-x-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2 rounded-xl hover:bg-white/60 backdrop-blur-sm transition-all duration-200">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="bg-linear-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link 
                to="/map" 
                className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2 rounded-xl hover:bg-white/60 backdrop-blur-sm transition-all duration-200"
              >
                Map
              </Link>
              {(role === 'shopowner' || role === 'shopkeeper') && (
                <Link 
                  to="/shop" 
                  className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2 rounded-xl hover:bg-white/60 backdrop-blur-sm transition-all duration-200"
                >
                  My Shop
                </Link>
              )}
              {role === 'admin' && (
                <Link 
                  to="/admin" 
                  className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2 rounded-xl hover:bg-white/60 backdrop-blur-sm transition-all duration-200"
                >
                  Admin Portal
                </Link>
              )}
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10 rounded-xl shadow-lg"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Premium Hero Section
const HeroSection = ({ searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, selectedRadius, setSelectedRadius, categories, onStartExploring }) => {
  return (
    <section className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-linear-to-br from-blue-100/30 via-purple-100/30 to-pink-100/30"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-linear-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6 leading-tight">
            Discover Amazing
            <span className="block bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Local Businesses
            </span>
          </h1>
          
          {/* Subtext */}
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Connect with trusted local shops, restaurants, and services in your area. 
            Real reviews, real experiences, real connections.
          </p>
          
          {/* Search Bar */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30 max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search for restaurants, shops, services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 text-lg"
                  />
                </div>
              </div>
              
              {/* Category Dropdown */}
              <div className="lg:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 text-lg appearance-none bg-white"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Radius Selector */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {[1, 5, 10, 25].map(radius => (
                <button
                  key={radius}
                  onClick={() => setSelectedRadius(radius)}
                  className={`px-6 py-3 rounded-2xl font-medium transition-all duration-200 ${
                    selectedRadius === radius
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  {radius} km
                </button>
              ))}
            </div>
            
            {/* Search Button */}
            <SignedOut>
              <button
                onClick={onStartExploring}
                className="w-full bg-linear-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Start Exploring
              </button>
            </SignedOut>
            <SignedIn>
              <button
                onClick={onStartExploring}
                className="w-full bg-linear-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Search Now
              </button>
            </SignedIn>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 mt-12 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>2,500+ verified businesses</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>50,000+ real reviews</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span>Trusted by locals</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Interactive Map Preview Section
const MapPreviewSection = ({ selectedRadius }) => {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Explore Your Neighborhood</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Visualize businesses around you with our interactive map and discover new places to love
          </p>
        </div>
        
        <div className="relative bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 shadow-2xl border border-gray-100">
          {/* Map Placeholder */}
          <div className="relative h-96 lg:h-125 bg-linear-to-br from-blue-100/50 via-purple-100/50 to-pink-100/50 rounded-2xl overflow-hidden border border-white/50">
            {/* Animated Grid */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
            
            {/* Radius Circle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div 
                className="border-2 border-blue-400/50 rounded-full animate-pulse"
                style={{
                  width: `${selectedRadius * 20}px`,
                  height: `${selectedRadius * 20}px`
                }}
              >
                <div className="absolute inset-2 border border-blue-300/30 rounded-full"></div>
                <div className="absolute inset-4 border border-blue-200/20 rounded-full"></div>
              </div>
            </div>
            
            {/* Map Markers */}
            <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-blue-600 rounded-full shadow-lg animate-bounce"></div>
            <div className="absolute top-2/3 right-1/3 w-4 h-4 bg-purple-600 rounded-full shadow-lg animate-bounce delay-200"></div>
            <div className="absolute bottom-1/4 left-1/2 w-4 h-4 bg-pink-600 rounded-full shadow-lg animate-bounce delay-400"></div>
            
            {/* Center Marker */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 bg-blue-600 rounded-full shadow-xl border-4 border-white animate-pulse"></div>
            </div>
            
            {/* Floating Controls */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2">
              <button className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 flex items-center justify-center hover:bg-white transition-all duration-200">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 flex items-center justify-center hover:bg-white transition-all duration-200">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 flex items-center justify-center hover:bg-white transition-all duration-200">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Badge */}
          <div className="absolute bottom-4 left-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-white/30">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Powered by real reviews</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Category Discovery Grid
const CategoryGrid = ({ categories, onCategorySelect }) => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Browse by Category</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find exactly what you're looking for across different business categories
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {categories.map((category, index) => (
            <div
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              className="group cursor-pointer bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-gray-200"
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${category.gradient} flex items-center justify-center text-2xl shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                {category.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300 text-center">
                {category.name}
              </h3>
              <p className="text-gray-600 text-sm text-center leading-relaxed">
                {category.description}
              </p>
              
              {/* Hover Effect Indicator */}
              <div className="mt-4 h-1 w-8 mx-auto bg-linear-to-r from-blue-500 to-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-x-110"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Featured Shops Section
const FeaturedShops = ({ shops, loading }) => {
  const [selectedShop, setSelectedShop] = useState(null);

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Shops</h2>
            <p className="text-xl text-gray-600">Discover popular businesses near you</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-lg animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-2xl"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between mb-16">
          <div className="mb-6 lg:mb-0">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">Featured Shops</h2>
            <p className="text-xl text-gray-600">Popular businesses near you with excellent ratings</p>
          </div>
          <button className="text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-2 px-6 py-3 rounded-xl hover:bg-blue-50 transition-all duration-300">
            <span>View All Shops</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {shops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => setSelectedShop(shop)}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden group border border-gray-100 hover:border-gray-200 cursor-pointer"
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-16 h-16 bg-linear-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                    {shop.image}
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                    shop.availability.includes('Open') 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                    {shop.availability}
                  </span>
                </div>

                {/* Shop Info */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                  {shop.name}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{shop.description}</p>

                {/* Rating and Distance */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg 
                          key={i} 
                          className={`w-4 h-4 ${i < Math.floor(shop.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-gray-700 font-semibold">{shop.rating}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{shop.distance}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button className="w-full bg-linear-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shop Modal */}
      {selectedShop && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-3xl font-bold text-gray-900">{selectedShop.name}</h3>
                <button 
                  onClick={() => setSelectedShop(null)}
                  className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mb-6">{selectedShop.description}</p>
              <div className="flex items-center space-x-4 mb-6">
                <span className="text-yellow-500 font-semibold">★ {selectedShop.rating}</span>
                <span className="text-gray-600">{selectedShop.distance}</span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  selectedShop.availability.includes('Open') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedShop.availability}
                </span>
              </div>
              <div className="flex space-x-4">
                <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200">
                  Get Directions
                </button>
                <button className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors duration-200">
                  Call Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// Conversion Footer
const ConversionFooter = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [hasManualCoords, setHasManualCoords] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    email: '',
    phone: '',
    panNumber: ''
  });

  useEffect(() => {
    if (isLoaded && user?.primaryEmailAddress?.emailAddress) {
      setFormData((prev) => ({
        ...prev,
        email: user.primaryEmailAddress.emailAddress
      }));
    }
  }, [isLoaded, user]);

  const detectLocation = (allowOverride = false) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('Location unavailable. Please enter coordinates manually.');
      return;
    }

    if (!allowOverride && hasManualCoords) return;

    setLocationStatus('Detecting your current location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocationAccuracy(Number.isFinite(accuracy) ? Math.round(accuracy) : null);
        setLocationStatus('Location detected. You can adjust the coordinates if needed.');
        setFormData((prev) => ({
          ...prev,
          latitude: allowOverride ? latitude.toFixed(6) : prev.latitude || latitude.toFixed(6),
          longitude: allowOverride ? longitude.toFixed(6) : prev.longitude || longitude.toFixed(6)
        }));
      },
      () => {
        setLocationStatus('Unable to detect location. Please enter coordinates manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (!isRegisterOpen) return;
    if (formData.latitude && formData.longitude) return;
    detectLocation(false);
  }, [isRegisterOpen, formData.latitude, formData.longitude]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'latitude' || name === 'longitude') {
      setHasManualCoords(true);
      setLocationStatus('Coordinates updated manually.');
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const token = await getToken();
    if (!token) {
      setFormError('Please sign in before registering a business.');
      return;
    }

    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (!formData.name.trim()) {
      setFormError('Shop name is required.');
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setFormError('Latitude and longitude are required.');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Phone is required.');
      return;
    }
    if (!formData.panNumber.trim()) {
      setFormError('PAN number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const projectHeader = (import.meta.env.VITE_ACTIVE_SUPABASE_PROJECT || 'REAL').toUpperCase();
      const response = await fetch(`${API_BASE_URL}/supabase/shops/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-supabase-project': projectHeader
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          latitude: lat,
          longitude: lng,
          phone: formData.phone.trim(),
          panNumber: formData.panNumber.trim()
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to register shop');
      }

      setFormSuccess('Submission received. Pending admin review.');
      setIsRegisterOpen(false);
      setHasManualCoords(false);
      setLocationAccuracy(null);
      setLocationStatus(null);
      setFormData({
        name: '',
        latitude: '',
        longitude: '',
        email: user?.primaryEmailAddress?.emailAddress || '',
        phone: '',
        panNumber: ''
      });
    } catch (err) {
      setFormError(err?.message || 'Failed to register shop');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-gray-900 text-white py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-gray-800 to-gray-900 opacity-90"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Grow Your Business?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join thousands of local businesses already using KhojHub to connect with customers and boost their sales. Start your journey today!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-6">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
                  Discover Nearby Shops
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="border-2 border-white text-white px-8 py-4 rounded-2xl font-bold hover:bg-white hover:text-blue-600 transition-all duration-300 text-lg">
                  Register Your Business
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
                Discover Nearby Shops
              </button>
              <button
                className="border-2 border-white text-white px-8 py-4 rounded-2xl font-bold hover:bg-white hover:text-blue-600 transition-all duration-300 text-lg"
                onClick={() => setIsRegisterOpen(true)}
              >
                Register Your Business
              </button>
            </SignedIn>
          </div>

          {(formError || formSuccess) && (
            <div className="mt-4 text-sm">
              {formError && <div className="text-red-200">{formError}</div>}
              {formSuccess && <div className="text-green-200">{formSuccess}</div>}
            </div>
          )}
          
          <div className="border-t border-gray-800 pt-8">
            <p className="text-gray-400">&copy; 2024 KhojHub. All rights reserved.</p>
          </div>
        </div>
      </div>

      {isSignedIn && isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 text-left text-gray-900 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold">Register Your Business</h3>
                <p className="text-sm text-gray-500">Submit your shop details for approval.</p>
              </div>
              <button
                className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-200"
                onClick={() => {
                  setIsRegisterOpen(false);
                  setHasManualCoords(false);
                  setLocationAccuracy(null);
                  setLocationStatus(null);
                }}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Shop name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Sunrise Bakery"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Latitude</label>
                <input
                  name="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="27.7172"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Longitude</label>
                <input
                  name="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="85.3240"
                  required
                />
              </div>
              <div className="md:col-span-2 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setHasManualCoords(false);
                      detectLocation(true);
                    }}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    Use current location
                  </button>
                  {locationAccuracy !== null && (
                    <span className="text-xs text-gray-500">Accuracy ~{locationAccuracy}m</span>
                  )}
                </div>
                {locationStatus && (
                  <p className="text-xs text-gray-500">{locationStatus}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  name="email"
                  value={formData.email}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">PAN number</label>
                <input
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="ABCDE1234F"
                  required
                />
              </div>
              <div className="md:col-span-2 flex flex-col gap-3">
                {formError && <div className="text-sm text-red-600">{formError}</div>}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
                <p className="text-xs text-gray-500 text-center">
                  Your submission will appear in the Admin Portal for review.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </footer>
  );
};

// Main HomePage Component
const HomePage = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.shops);
  const navigate = useNavigate();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRadius, setSelectedRadius] = useState(5);

  // Categories data
  const categories = [
    { id: 'all', name: 'All Categories', icon: '🏪', description: 'All businesses', gradient: 'bg-linear-to-br from-blue-500 to-blue-600' },
    { id: 'restaurant', name: 'Restaurants', icon: '🍽️', description: 'Food & dining', gradient: 'bg-linear-to-br from-red-500 to-red-600' },
    { id: 'electronics', name: 'Electronics', icon: '📱', description: 'Gadgets & tech', gradient: 'bg-linear-to-br from-purple-500 to-purple-600' },
    { id: 'automobile', name: 'Automobile', icon: '🚗', description: 'Cars & services', gradient: 'bg-linear-to-br from-green-500 to-green-600' },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥', description: 'Medical services', gradient: 'bg-linear-to-br from-teal-500 to-teal-600' },
    { id: 'fashion', name: 'Fashion', icon: '👗', description: 'Clothing & style', gradient: 'bg-linear-to-br from-pink-500 to-pink-600' },
    { id: 'home', name: 'Home Services', icon: '🏠', description: 'Repairs & maintenance', gradient: 'bg-linear-to-br from-orange-500 to-orange-600' },
    { id: 'education', name: 'Education', icon: '📚', description: 'Learning & tutoring', gradient: 'bg-linear-to-br from-indigo-500 to-indigo-600' },
    { id: 'fitness', name: 'Fitness', icon: '💪', description: 'Gym & wellness', gradient: 'bg-linear-to-br from-cyan-500 to-cyan-600' },
    { id: 'services', name: 'Services', icon: '💼', description: 'Professional services', gradient: 'bg-linear-to-br from-teal-500 to-teal-600' }
  ];

  // Mock featured shops data
  const featuredShops = [
    {
      id: 1,
      name: "TechZone Electronics",
      rating: 4.8,
      distance: "0.5 km",
      availability: "Open Now",
      category: "Electronics",
      image: "📱",
      description: "Premium electronics and gadgets with expert service"
    },
    {
      id: 2,
      name: "Green Leaf Restaurant",
      rating: 4.6,
      distance: "1.2 km",
      availability: "Open Now",
      category: "Food",
      image: "🍽️",
      description: "Authentic Indian cuisine with fresh ingredients"
    },
    {
      id: 3,
      name: "QuickFix Auto Service",
      rating: 4.7,
      distance: "2.1 km",
      availability: "Closes at 8 PM",
      category: "Automobile",
      image: "🚗",
      description: "Professional car repair services with warranty"
    },
    {
      id: 4,
      name: "Serenity Spa",
      rating: 4.9,
      distance: "0.8 km",
      availability: "Open Now",
      category: "Health",
      image: "💆",
      description: "Relaxing spa treatments and wellness services"
    },
    {
      id: 5,
      name: "Style Studio",
      rating: 4.5,
      distance: "1.5 km",
      availability: "Open Now",
      category: "Fashion",
      image: "👗",
      description: "Trendy clothing and personal styling services"
    },
    {
      id: 6,
      name: "FitZone Gym",
      rating: 4.4,
      distance: "3.2 km",
      availability: "Open 24/7",
      category: "Fitness",
      image: "💪",
      description: "Modern fitness center with personal training"
    }
  ];

  useEffect(() => {
    dispatch(fetchShops());
  }, [dispatch]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleStartExploring = () => {
    const selectedCategoryData = categories.find((category) => category.id === selectedCategory);
    const navigationState = selectedCategory && selectedCategory !== 'all'
      ? {
          category: selectedCategoryData?.name || 'Local Businesses',
          categoryId: selectedCategory,
          searchQuery,
          radius: selectedRadius
        }
      : {
          category: 'All Categories',
          categoryId: 'all',
          searchQuery,
          radius: selectedRadius
        };

    navigate('/map', { state: navigationState });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Shops</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => dispatch(fetchShops())}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedRadius={selectedRadius}
        setSelectedRadius={setSelectedRadius}
        categories={categories}
        onStartExploring={handleStartExploring}
      />
      <MapPreviewSection selectedRadius={selectedRadius} />
      <CategoryGrid categories={categories} onCategorySelect={handleCategorySelect} />
      <FeaturedShops shops={featuredShops} loading={loading} />
      <ConversionFooter />
    </div>
  );
};

export default HomePage;
