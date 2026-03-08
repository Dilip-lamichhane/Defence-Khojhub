import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setMapInstance, setCenter, setZoom, setMarkers, setSelectedShop, setRadiusCircle } from '../store/slices/mapSlice';
import { setCurrentShop } from '../store/slices/shopsSlice';
import ShopCard from './ShopCard';
import PropTypes from 'prop-types';
import placeholderIcon from '../assets/placeholder.png';

const MapComponent = ({ shops, onShopSelect, className = '' }) => {
  const dispatch = useAppDispatch();
  const { 
    mapInstance, 
    userLocation, 
    center, 
    zoom, 
    searchRadius, 
    showRadius,
    radiusCircle,
    selectedShop 
  } = useAppSelector((state) => state.map);
  const { activeSupabaseProject, isDemoMode } = useAppSelector((state) => state.auth);
  

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(null);

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        setMapLoading(false);
        setMapError('Google Maps API key is missing');
        return;
      }

      if (window.google && window.google.maps) {
        setMapLoading(false);
        return;
      }

      const existingScript = document.getElementById('google-maps-sdk');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setMapLoading(false);
          setMapError(null);
        });
        existingScript.addEventListener('error', () => {
          setMapLoading(false);
          setMapError('Failed to load Google Maps');
        });
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-sdk';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setMapLoading(false);
        setMapError(null);
      };
      
      script.onerror = () => {
        setMapLoading(false);
        setMapError('Failed to load Google Maps');
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!window.google || !window.google.maps || !mapRef.current || mapInstance) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    dispatch(setMapInstance(map));

    // Add map event listeners
    map.addListener('center_changed', () => {
      const newCenter = map.getCenter();
      dispatch(setCenter({
        lat: newCenter.lat(),
        lng: newCenter.lng()
      }));
    });

    map.addListener('zoom_changed', () => {
      dispatch(setZoom(map.getZoom()));
    });

    map.addListener('click', () => {
      dispatch(setSelectedShop(null));
      dispatch(setCurrentShop(null));
    });

  }, [center, zoom, dispatch, mapInstance]);

  // Update radius circle
  useEffect(() => {
    if (!mapInstance || !window.google) return;

    // Remove existing radius circle
    if (radiusCircle) {
      radiusCircle.setMap(null);
    }

    if (showRadius && userLocation.lat && userLocation.lng) {
      const circle = new window.google.maps.Circle({
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        map: mapInstance,
        center: { lat: userLocation.lat, lng: userLocation.lng },
        radius: searchRadius * 1000, // Convert km to meters
      });

      dispatch(setRadiusCircle(circle));
    }

  }, [mapInstance, userLocation, searchRadius, showRadius, dispatch, radiusCircle]);

  // Update shop markers
  useEffect(() => {
    if (!mapInstance || !window.google || !shops) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    const newMarkers = shops.map(shop => {
      const marker = new window.google.maps.Marker({
        position: { lat: shop.location.coordinates[1], lng: shop.location.coordinates[0] },
        map: mapInstance,
        title: shop.name,
        icon: {
          url: placeholderIcon,
          scaledSize: new window.google.maps.Size(30, 40),
          anchor: new window.google.maps.Point(15, 40)
        }
      });

      // Add click listener
      marker.addListener('click', () => {
        dispatch(setSelectedShop(shop));
        dispatch(setCurrentShop(shop));
        if (onShopSelect) {
          onShopSelect(shop);
        }

        // Center map on selected shop
        mapInstance.panTo({ lat: shop.location.coordinates[1], lng: shop.location.coordinates[0] });
      });

      return marker;
    });

    markersRef.current = newMarkers;
    dispatch(setMarkers(newMarkers));

  }, [mapInstance, shops, dispatch, onShopSelect]);

  // Center map on user location
  const centerOnUserLocation = () => {
    if (userLocation.lat && userLocation.lng && mapInstance) {
      mapInstance.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      mapInstance.setZoom(15);
    }
  };

  // Toggle radius visibility
  const toggleRadius = () => {
    dispatch(setRadiusCircle(null)); // This will trigger the useEffect to recreate with new visibility
  };

  if (mapLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center text-red-600">
          <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="font-semibold">{mapError}</p>
          <p className="text-sm mt-2">Please check your Google Maps API key</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold border">
        <span className={isDemoMode ? 'text-amber-700' : 'text-emerald-700'}>
          {isDemoMode ? 'Demo DB' : 'Real DB'} · {activeSupabaseProject}
        </span>
      </div>
      
      {/* Map Controls */}

      <div className="absolute top-4 right-4 space-y-2">
        <button
          onClick={centerOnUserLocation}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="Center on your location"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        
        <button
          onClick={toggleRadius}
          className={`bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors ${showRadius ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
          title="Toggle search radius"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      </div>

      {/* Selected Shop Info */}
      {selectedShop && (
        <div className="absolute bottom-4 left-4 right-4 max-w-md mx-auto">
          <ShopCard 
            shop={selectedShop} 
            onClick={() => {
              dispatch(setSelectedShop(null));
              dispatch(setCurrentShop(null));
            }}
          />
        </div>
      )}

      {/* Radius Info */}
      {showRadius && userLocation.lat && (
        <div className="absolute top-14 left-4 bg-white p-3 rounded-lg shadow-md">

          <div className="text-sm text-gray-600">
            <div className="font-medium">Search Radius</div>
            <div>{searchRadius} km</div>
          </div>
        </div>
      )}
    </div>
  );
};

MapComponent.propTypes = {
  shops: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    location: PropTypes.shape({
      coordinates: PropTypes.arrayOf(PropTypes.number).isRequired,
    }).isRequired,
    rating: PropTypes.number,
    reviewCount: PropTypes.number,
    category: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }),
    operatingHours: PropTypes.object,
    address: PropTypes.string,
    phone: PropTypes.string,
    description: PropTypes.string,
    image: PropTypes.string,
  })),
  onShopSelect: PropTypes.func,
  className: PropTypes.string,
};

export default MapComponent;
