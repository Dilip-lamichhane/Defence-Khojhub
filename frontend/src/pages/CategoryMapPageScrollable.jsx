import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { SignedOut } from '@clerk/clerk-react';
import L from 'leaflet';
import lottie from 'lottie-web';
import 'leaflet/dist/leaflet.css';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSupabaseShops, fetchSupabaseShopProducts } from '../store/slices/shopsSlice';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import securityPin from '../assets/security-pin_6125244.png';
import userLocationAnimation from '../assets/wired-lineal-2569-logo-google-maps-hover-pinch.json';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const valleyGeoData = {
  name: 'Kathmandu Valley Combined',
  center: { lat: 27.671, lon: 85.375 },
  bounds: {
    north: 27.81,
    south: 27.59,
    east: 85.52,
    west: 85.2
  },
  extreme_points: [
    { name: 'North', lat: 27.81, lon: 85.39 },
    { name: 'South', lat: 27.59, lon: 85.38 },
    { name: 'East', lat: 27.7, lon: 85.52 },
    { name: 'West', lat: 27.7, lon: 85.2 }
  ]
};

const toRadians = (value) => (value * Math.PI) / 180;

const haversineKm = (from, to) => {
  if (!from || !to) return 0;
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const maxDistanceFromBoundsKm = (center) => {
  if (!center || center.length !== 2) return 0;
  const [lat, lon] = center;
  const { north, south, east, west } = valleyGeoData.bounds;
  const candidates = [
    [north, lon],
    [south, lon],
    [lat, east],
    [lat, west]
  ];
  return Math.max(...candidates.map((point) => haversineKm(center, point)));
};

const CategoryMapPageScrollable = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const category = location.state?.category || 'Local Businesses';
  const initialSelectedCategory = ['Restaurant', 'Electronics', 'Fitness', 'Health/Medicine', 'Automobile'].includes(category)
    ? category
    : 'All';
  const dispatch = useAppDispatch();
  const shops = useAppSelector((state) => state.shops.shops);
  const supabaseCatalog = useAppSelector((state) => state.shops.supabaseCatalog);
  
  // Map states
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogShop, setCatalogShop] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [shopIcon, setShopIcon] = useState(() => L.icon({
    iconUrl: securityPin,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -36]
  }));

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 40;
      const scale = maxSize / Math.max(img.naturalWidth, img.naturalHeight);
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));

      setShopIcon(L.icon({
        iconUrl: securityPin,
        iconSize: [width, height],
        iconAnchor: [Math.round(width / 2), height],
        popupAnchor: [0, -height + 4]
      }));
    };
    img.src = securityPin;
  }, []);

  const userLocationIcon = useMemo(() => {
    return L.divIcon({
      className: 'user-location-lottie',
      html: '<div id="user-location-lottie" style="width:56px;height:56px;"></div>',
      iconSize: [56, 56],
      iconAnchor: [28, 56],
      popupAnchor: [0, -48]
    });
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    let animation = null;
    const mountAnimation = () => {
      const container = document.getElementById('user-location-lottie');
      if (!container) return;
      container.innerHTML = '';
      animation = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: userLocationAnimation
      });
    };
    const rafId = requestAnimationFrame(mountAnimation);
    return () => {
      cancelAnimationFrame(rafId);
      if (animation) animation.destroy();
    };
  }, [userLocation]);
  
  // Filter states
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialSelectedCategory);
  const [distanceFilter, setDistanceFilter] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [sortByRating, setSortByRating] = useState('desc');
  const [radiusFitToken, setRadiusFitToken] = useState(0);
  
  useEffect(() => {
    const query = productSearch.trim();
    const delay = query ? 350 : 0;
    const timeoutId = setTimeout(() => {
      dispatch(fetchSupabaseShops(query ? { product: query } : {}));
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [dispatch, productSearch]);

  useEffect(() => {
    if (userLocation) return;
    if (!shops || shops.length === 0) return;

    const first = shops.find((s) => {
      const lng = Number(s?.location?.coordinates?.[0]);
      const lat = Number(s?.location?.coordinates?.[1]);
      return Number.isFinite(lat) && Number.isFinite(lng);
    });

    if (!first) return;

    const lng = Number(first.location.coordinates[0]);
    const lat = Number(first.location.coordinates[1]);
    setMapCenter([lat, lng]);
    setMapZoom(13);
  }, [shops, userLocation]);

  useEffect(() => {
    if (!userLocation || !Array.isArray(userLocation) || userLocation.length !== 2) return;
    setMapCenter(userLocation);
    setRadiusFitToken(prev => prev + 1);
  }, [distanceFilter, userLocation]);

  // Filter and sort markers
  const normalizeCategory = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/&/g, 'and');

  const toSupabaseShopId = (shop) => {
    const raw = shop?.id ?? shop?._id;
    if (Number.isFinite(raw)) return Number(raw);
    const str = String(raw ?? '');
    if (str.startsWith('sb_')) {
      const parsed = Number(str.slice(3));
      return Number.isFinite(parsed) ? parsed : null;
    }
    const parsed = Number(str);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const openCatalog = (marker) => {
    if (!marker?.shopId) return;
    setCatalogShop(marker);
    setCatalogSearch('');
    setIsCatalogOpen(true);
    dispatch(fetchSupabaseShopProducts({ shopId: marker.shopId }));
  };

  const filteredMarkers = (shops || [])
    .map((shop) => {
      const lng = Number(shop?.location?.coordinates?.[0]);
      const lat = Number(shop?.location?.coordinates?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const shopId = toSupabaseShopId(shop);
      if (!shopId) return null;

      return {
        id: shop._id || shop.id || `${shop.name}-${lat}-${lng}`,
        shopId,
        name: shop.name || 'Unnamed Shop',
        position: [lat, lng],
        rating: Number(shop.rating ?? shop.averageRating ?? 0) || 0,
        category: shop.category?.name || shop.category || 'Uncategorized',
      };
    })
    .filter(Boolean)
    .filter(marker => {
    // Category filter
    const matchesCategory =
      selectedCategory === 'All' ||
      normalizeCategory(marker.category) === normalizeCategory(selectedCategory);
    
    // Rating filter
    const matchesRating = marker.rating >= minRating;
    
    // Distance filter (simplified - within range)
    // Calculate a deterministic distance based on marker position for consistent filtering
    const distanceBase = userLocation;
    const matchesDistance = !distanceBase
      ? true
      : Math.sqrt(
          Math.pow(marker.position[0] - distanceBase[0], 2) +
            Math.pow(marker.position[1] - distanceBase[1], 2)
        ) *
          100 <=
        distanceFilter;
    
    return matchesCategory && matchesRating && matchesDistance;
  }).sort((a, b) => {
    if (sortByRating === 'desc') return b.rating - a.rating;
    return a.rating - b.rating;
  });

  const [locationError, setLocationError] = useState(null);

  const checkLocationPermission = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        console.log('Location permission status:', result.state);
        return result.state;
      } catch (error) {
        console.log('Permission API not available or failed:', error);
        return 'unknown';
      }
    }
    return 'unknown';
  }, []);

  const getBrowserSpecificLocationInstructions = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome')) {
      return 'Chrome: Click the lock icon in the address bar → Site settings → Location → Allow';
    } else if (userAgent.includes('firefox')) {
      return 'Firefox: Click the lock icon in the address bar → Permissions → Location → Allow';
    } else if (userAgent.includes('safari')) {
      return 'Safari: Safari → Preferences → Websites → Location → Allow for this site';
    } else if (userAgent.includes('edge')) {
      return 'Edge: Click the lock icon in the address bar → Permissions → Location → Allow';
    } else {
      return 'Check your browser settings to allow location access for this site.';
    }
  }, []);

  const getLocationErrorMessage = useCallback((errorCode) => {
    const browserInstructions = getBrowserSpecificLocationInstructions();
    const errorMessages = {
      1: `Location access denied. ${browserInstructions}`,
      2: 'Location unavailable. Please check your device location settings and ensure GPS is enabled.',
      3: 'Location request timed out. Please try again with a better internet connection.',
      default: 'Unable to get your location. Please enable location services and refresh the page.'
    };
    return errorMessages[errorCode] || errorMessages.default;
  }, [getBrowserSpecificLocationInstructions]);

  useEffect(() => {
    const getUserLocation = async () => {
      console.log('Attempting to get user location...');
      setIsLocating(true);
      
      if (navigator.geolocation) {
        const permissionStatus = await checkLocationPermission();
        console.log('Initial permission status:', permissionStatus);
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos = [position.coords.latitude, position.coords.longitude];
            console.log('Auto location obtained on mount:', userPos);
            setUserLocation(userPos);
            setMapCenter(userPos);
            setMapZoom(16);
            setIsLocating(false);
            setLocationError(null);
          },
          (error) => {
            console.error('Auto location failed on mount:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            setLocationError(getLocationErrorMessage(error.code));
            setIsLocating(false);
            setTimeout(() => setLocationError(null), 5000);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        console.log('Geolocation is not supported by this browser');
        setLocationError('Geolocation is not supported by this browser.');
        setIsLocating(false);
        setTimeout(() => setLocationError(null), 5000);
      }
    };

    getUserLocation();
  }, [checkLocationPermission, getLocationErrorMessage]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const results = await response.json();
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('No places found. Try a different search.');
      }
    } catch {
      setSearchResults([]);
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultSelect = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      setMapCenter([lat, lon]);
      setMapZoom(16);
    }
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleLocationClick = async () => {
    console.log('Location button clicked - centering on current location');
    setIsLocating(true);
    
    // Always center on user location if available
    if (userLocation) {
      console.log('Centering on existing user location:', userLocation);
      setMapCenter(userLocation);
      setMapZoom(16);
      setIsLocating(false);
      return;
    }
    
    if (navigator.geolocation) {
      // Check permission status first
      const permissionStatus = await checkLocationPermission();
      console.log('Current permission status:', permissionStatus);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = [position.coords.latitude, position.coords.longitude];
          console.log('Location obtained:', userPos);
          setUserLocation(userPos);
          setMapCenter(userPos);
          setMapZoom(16); // Zoom in closer to user's location
          setIsLocating(false);
          
          // Clear any previous location errors
          setLocationError(null);
        },
        (error) => {
          console.error('Geolocation error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          
          setLocationError(getLocationErrorMessage(error.code));
          if (userLocation) {
            setMapCenter(userLocation);
            setMapZoom(16);
          }
          setIsLocating(false);
          // Auto-hide error after 5 seconds
          setTimeout(() => setLocationError(null), 5000);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // Reduced timeout for better responsiveness
          maximumAge: 0 // Force fresh location
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      setTimeout(() => setLocationError(null), 5000);
    }
  };

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 1, 19));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(prev - 1, 3));
  };

  return (
    <div className={`h-screen overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        .user-location-marker {
          position: relative;
          z-index: 1000 !important;
          pointer-events: none;
        }
        .user-location-dot {
          position: absolute;
          top: 7px;
          left: 7px;
          width: 10px;
          height: 10px;
          background: #1a73e8;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(26, 115, 232, 0.6);
        }
        .user-location-ring {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border: 2px solid rgba(26, 115, 232, 0.25);
          border-radius: 50%;
          background: rgba(26, 115, 232, 0.08);
        }
        .map-location-btn:hover {
          transform: scale(1.1);
          transition: transform 0.2s ease;
        }
        .leaflet-marker-icon.user-location-marker {
          z-index: 1000 !important;
        }
      `}} />
      {/* Map Section - Full Screen */}
      <div className="relative w-full h-full">
        {/* Map Container */}
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          style={{ width: '100%', height: '100%' }}
          className="z-0"
          maxZoom={19}
          minZoom={3}
          zoomControl={false}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
        >
          {/* Map Tiles - Switch between Dark and Light */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={isDarkMode 
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" 
              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
            }
            maxZoom={19}
          />
          
          {/* User Location Marker - Always on top */}
          {userLocation && (
            <Marker 
              position={userLocation} 
              icon={userLocationIcon} 
              zIndexOffset={1000}
            />
          )}
          
          {/* Category Markers */}
          {filteredMarkers.map(marker => (
            <Marker key={marker.id} position={marker.position} icon={shopIcon}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg">{marker.name}</h3>
                  <p className="text-gray-600">{marker.category}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-yellow-500">★</span>
                    <span className="ml-1 font-semibold">{marker.rating}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCatalog(marker)}
                    className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    View catalog
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
          
          <MapSizeUpdater />
          <MapCenterUpdater
            center={mapCenter}
            zoom={mapZoom}
            radiusKm={distanceFilter}
            fitToken={radiusFitToken}
            onZoomChange={setMapZoom}
          />
        </MapContainer>
        
        {/* Sidebar */}
        <div className={`absolute left-4 top-4 bottom-4 w-80 rounded-xl shadow-2xl z-10 flex flex-col backdrop-blur-sm transition-colors duration-300 ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'}`}>
          {/* Sidebar Header */}
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{category}</h2>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location..."
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400' 
                    : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <button
                type="submit"
                className={`absolute right-2 top-2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
            {isSearching && (
              <div className={`mt-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Searching...
              </div>
            )}
            {searchError && (
              <div className={`mt-3 text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                {searchError}
              </div>
            )}
            {searchResults.length > 0 && (
              <div className={`mt-3 max-h-48 overflow-y-auto rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                {searchResults.map((result) => (
                  <button
                    key={`${result.place_id}-${result.lat}-${result.lon}`}
                    type="button"
                    onClick={() => handleResultSelect(result)}
                    className={`w-full text-left px-3 py-2 text-xs border-b last:border-b-0 ${
                      isDarkMode
                        ? 'border-gray-700 text-gray-200 hover:bg-gray-800'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Product Search */}
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Search Products</h3>
            <div className="relative">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400' 
                    : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <div className={`absolute right-2 top-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Category Filter */}
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Category</h3>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-gray-100' 
                  : 'bg-gray-100 border-gray-300 text-gray-900'
              }`}
            >
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Automobile">Automobile</option>
              <option value="Health/Medicine">Health/Medicine</option>
              <option value="Fitness">Fitness</option>
            </select>
          </div>
          
          {/* Distance Filter */}
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Distance (km)</h3>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="1"
                max="50"
                step="2"
                value={distanceFilter}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  const clamped = Math.min(50, Math.max(1, raw));
                  const snapped = clamped % 2 === 0 ? clamped - 1 : clamped;
                  setDistanceFilter(snapped);
                }}
                className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
              />
              <span className={`text-sm w-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{distanceFilter}km</span>
            </div>
          </div>
          
          {/* Rating Filter */}
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Minimum Rating</h3>
            <div className="flex space-x-2">
              {[0, 1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => setMinRating(rating)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors duration-200 ${
                    minRating === rating
                      ? 'bg-blue-600 text-blue-100'
                      : isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {rating === 0 ? 'All' : `${rating}★`}
                </button>
              ))}
            </div>
          </div>
          
          {/* Sort by Rating */}
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Sort by Rating</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSortByRating('desc')}
                className={`px-3 py-1 text-xs rounded-full transition-colors duration-200 ${
                  sortByRating === 'desc'
                    ? 'bg-blue-600 text-blue-100'
                    : isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Highest First
              </button>
              <button
                onClick={() => setSortByRating('asc')}
                className={`px-3 py-1 text-xs rounded-full transition-colors duration-200 ${
                  sortByRating === 'asc'
                    ? 'bg-blue-600 text-blue-100'
                    : isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Lowest First
              </button>
            </div>
          </div>
          
          {/* Location Info */}
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`flex items-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>
                {userLocation ? 'Your location detected' : isLocating ? 'Detecting location...' : 'Location not detected'}
              </span>
              {userLocation && (
                <div className="ml-2 w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </div>
            {userLocation && (
              <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div>Lat: {userLocation[0].toFixed(4)}</div>
                <div>Lng: {userLocation[1].toFixed(4)}</div>
              </div>
            )}
            
            {/* Location Error Display */}
            {locationError && (
              <div className={`mt-3 p-3 rounded-lg text-xs ${
                isDarkMode 
                  ? 'bg-red-900/50 text-red-300 border border-red-800/50' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <div className="flex items-start">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="font-medium mb-1">Location Error</div>
                    <div>{locationError}</div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {isCatalogOpen && catalogShop && (
          <div
            className={`absolute right-4 top-4 bottom-4 w-96 rounded-xl shadow-2xl z-10 flex flex-col backdrop-blur-sm transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'
            }`}
          >
            <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Catalog</div>
                  <div className={`text-lg font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    {catalogShop.name}
                  </div>
                  <div className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {catalogShop.category}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCatalogOpen(false);
                    setCatalogShop(null);
                    setCatalogSearch('');
                  }}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Close
                </button>
              </div>

              <div className="mt-4 relative">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search items in this shop..."
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300 ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400'
                      : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
                <div className={`absolute right-2 top-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {supabaseCatalog.loadingByShopId?.[String(catalogShop.shopId)] ? (
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading catalog...</div>
              ) : supabaseCatalog.errorByShopId?.[String(catalogShop.shopId)] ? (
                <div className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                  {supabaseCatalog.errorByShopId[String(catalogShop.shopId)]}
                </div>
              ) : (
                (() => {
                  const all = supabaseCatalog.byShopId?.[String(catalogShop.shopId)] || [];
                  const q = catalogSearch.trim().toLowerCase();
                  const filtered = !q ? all : all.filter((p) => String(p?.name ?? '').toLowerCase().includes(q));
                  if (filtered.length === 0) {
                    return (
                      <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        No items found.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {filtered.map((p) => (
                        <div
                          key={p.id || `${p.name}-${p.price}`}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                            isDarkMode ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                            {p.name}
                          </div>
                          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            ₹{Number(p.price || 0).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}
        
        {/* Sign In Button - Top Right */}
        <SignedOut>
          <button
            onClick={handleSignIn}
            className="absolute top-4 right-4 z-20 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg"
          >
            Sign In
          </button>
        </SignedOut>
        
        {/* Map Controls */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={handleZoomIn}
            className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Zoom In"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Zoom Out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleLocationClick}
            disabled={isLocating}
            className={`bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 map-location-btn transition-all duration-200 ${
              isLocating ? 'opacity-75 cursor-not-allowed' : 'hover:scale-110'
            }`}
            title="Center on Location"
          >
            {isLocating ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Component to update map center and zoom when state changes with smooth animation
const MapSizeUpdater = () => {
  const map = useMap();

  useEffect(() => {
    const safeInvalidate = () => {
      const container = map.getContainer?.();
      if (!container || !container.isConnected) return;
      map.invalidateSize();
    };
    const handleResize = () => {
      safeInvalidate();
    };
    let rafId = null;
    let timeoutId = null;
    map.whenReady(() => {
      rafId = requestAnimationFrame(() => {
        safeInvalidate();
      });
      timeoutId = setTimeout(() => safeInvalidate(), 200);
    });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId) cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [map]);

  return null;
};

const MapCenterUpdater = ({ center, zoom, radiusKm, fitToken, onZoomChange }) => {
  const map = useMap();
  const lastFitToken = useRef(null);
  
  useEffect(() => {
    if (!center || !Array.isArray(center) || center.length !== 2) return;
    map.whenReady(() => {
      const shouldFit = Number.isFinite(radiusKm) && fitToken !== lastFitToken.current;
      if (shouldFit) {
        lastFitToken.current = fitToken;
        const size = map.getSize();
        const minPixels = Math.max(1, Math.min(size.x, size.y));
        const maxDistanceKm = maxDistanceFromBoundsKm(center) || 100;
        const percent = Math.max(1, Math.min(100, Number(radiusKm) || 1));
        const effectiveRadiusKm = maxDistanceKm * (percent / 100);
        const radiusMeters = Math.max(100, effectiveRadiusKm * 1000);
        const metersPerPixel = (radiusMeters * 2) / minPixels;
        const rawZoom = Math.log2(40075016.686 / (256 * metersPerPixel)) - 0.6;
        const targetZoom = Math.max(3, Math.min(19, Math.round(rawZoom)));
        if (onZoomChange && targetZoom !== zoom) onZoomChange(targetZoom);
        map.flyTo(center, targetZoom, {
          animate: true,
          duration: 1.5,
          easeLinearity: 0.25
        });
        return;
      }
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.25
      });
    });
  }, [center, zoom, radiusKm, fitToken, map, onZoomChange]);
  
  return null;
};

export default CategoryMapPageScrollable;
