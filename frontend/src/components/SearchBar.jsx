import React, { useState, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSearchQuery, setFilters, setLoading } from '../store/slices/uiSlice';
import { searchShops } from '../store/slices/shopsSlice';
import { setUserLocation } from '../store/slices/mapSlice';
import PropTypes from 'prop-types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const SearchBar = ({ onSearch, className = '' }) => {
  const dispatch = useAppDispatch();
  const { searchQuery, filters } = useAppSelector((state) => state.ui);
  const { searchRadius, userLocation } = useAppSelector((state) => state.map);
  
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef(null);

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    dispatch(setLoading(true));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `${API_BASE_URL}/geocode/reverse?lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          dispatch(setUserLocation({
            lat: latitude,
            lng: longitude,
            address: data.display_name || 'Current Location'
          }));

          await dispatch(searchShops({
            lat: latitude,
            lng: longitude,
            radius: filters.distance || searchRadius,
            page: 1,
            limit: 10
          })).unwrap();

        } catch (error) {
          console.error('Failed to get address:', error);
          dispatch(setUserLocation({
            lat: latitude,
            lng: longitude,
            address: 'Current Location'
          }));
        }
        
        dispatch(setLoading(false));
      },
      (error) => {
        dispatch(setLoading(false));
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please enable location services.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }, [dispatch, filters.distance, searchRadius]);

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    
    if (!localQuery.trim() && !userLocation.lat) {
      // Get current location if no query and no location set
      await getCurrentLocation();
      return;
    }

    dispatch(setSearchQuery(localQuery.trim()));
    dispatch(setLoading(true));

    try {
      // Use current location or default to Kathmandu
      const searchLocation = userLocation.lat && userLocation.lng 
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : { lat: 27.7172, lng: 85.3240 }; // Default to Kathmandu

      await dispatch(searchShops({
        lat: searchLocation.lat,
        lng: searchLocation.lng,
        radius: filters.distance || searchRadius,
        page: 1,
        limit: 10
      })).unwrap();

      if (onSearch) {
        onSearch(localQuery.trim(), searchLocation);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      dispatch(setLoading(false));
    }
  }, [localQuery, userLocation, filters, searchRadius, dispatch, onSearch, getCurrentLocation]);

  const handleFilterChange = (filterType, value) => {
    dispatch(setFilters({ ...filters, [filterType]: value }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="relative">
        <div className="flex items-center bg-white rounded-lg shadow-md border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for shops, products, or services..."
              className="w-full px-4 py-3 bg-transparent border-0 focus:outline-none text-gray-700 placeholder-gray-500"
            />
            {localQuery && (
              <button
                type="button"
                onClick={() => setLocalQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex items-center border-l border-gray-200">
            <button
              type="button"
              onClick={getCurrentLocation}
              className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Use current location"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors ${showFilters ? 'text-blue-600 bg-blue-50' : ''}`}
              title="Filters"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            
            <button
              type="submit"
              className="p-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded-r-lg"
              title="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </form>

      {/* Filters Dropdown */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance (km)
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={filters.distance || searchRadius}
                onChange={(e) => handleFilterChange('distance', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-gray-500 mt-1">
                {filters.distance || searchRadius} km
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Rating
              </label>
              <select
                value={filters.rating || 0}
                onChange={(e) => handleFilterChange('rating', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">Any rating</option>
                <option value="3">3+ stars</option>
                <option value="4">4+ stars</option>
                <option value="5">5 stars</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Open Now
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={filters.openNow || false}
                  onChange={(e) => handleFilterChange('openNow', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Only show open shops</span>
              </label>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                dispatch(setFilters({
                  category: '',
                  rating: 0,
                  distance: searchRadius,
                  openNow: false
                }));
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

SearchBar.propTypes = {
  onSearch: PropTypes.func,
  className: PropTypes.string,
};

export default SearchBar;
