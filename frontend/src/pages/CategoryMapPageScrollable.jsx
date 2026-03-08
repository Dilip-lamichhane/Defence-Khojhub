import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SignedOut } from '@clerk/clerk-react';
import lottie from 'lottie-web';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSupabaseShops, fetchSupabaseShopProducts } from '../store/slices/shopsSlice';
import { getMapSupabaseProject, setMapSupabaseProject } from '../config/supabase';

import securityPin from '../assets/security-pin_6125244.png';
import userLocationAnimation from '../assets/wired-lineal-2569-logo-google-maps-hover-pinch.json';

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

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return '';
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${totalMinutes} min`;
};

const CategoryMapPageScrollable = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const category = location.state?.category || 'Local Businesses';
  const initialSelectedCategory = ['Restaurant', 'Electronics', 'Fitness', 'Health/Medicine', 'Automobile'].includes(category)
    ? category
    : 'All';
  const dispatch = useAppDispatch();
  const { shops, supabaseCatalog, error } = useAppSelector((state) => state.shops);
  const [mapSupabaseProject, setMapSupabaseProjectState] = useState(getMapSupabaseProject());
  const isMapDemoMode = mapSupabaseProject === 'DUMMY';

  // Map states
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const shopMarkersRef = useRef(new Map());
  const userMarkerRef = useRef(null);
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
  const [shopIconSize, setShopIconSize] = useState([40, 40]);
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);
  const [directionsShop, setDirectionsShop] = useState(null);
  const [directionsMode, setDirectionsMode] = useState(null);
  const [routeStatus, setRouteStatus] = useState('idle');
  const [routeDuration, setRouteDuration] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [routeGeojson, setRouteGeojson] = useState({ type: 'FeatureCollection', features: [] });
  const [altRouteGeojson, setAltRouteGeojson] = useState({ type: 'FeatureCollection', features: [] });
  const [directionsAnchor, setDirectionsAnchor] = useState(null);
  const [isRoutingActive, setIsRoutingActive] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 40;
      const scale = maxSize / Math.max(img.naturalWidth, img.naturalHeight);
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));

      setShopIconSize([width, height]);
    };
    img.src = securityPin;
  }, []);

  const userLocationIconHtml = useMemo(() => {
    return '<div id="user-location-lottie" style="width:56px;height:56px;"></div>';
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
  const [distanceFilter, setDistanceFilter] = useState(50);
  const [minRating, setMinRating] = useState(0);
  const [sortByRating, setSortByRating] = useState('desc');
  const [radiusFitToken, setRadiusFitToken] = useState(0);
  
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;
    const style = {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }]
    };
    const map = new maplibregl.Map({
      container: mapRef.current,
      style,
      center: [mapCenter[1] || 0, mapCenter[0] || 0],
      zoom: mapZoom,
      maxZoom: 19,
      minZoom: 3
    });
    mapInstanceRef.current = map;
    map.on('load', () => {
      map.resize();
      const empty = { type: 'FeatureCollection', features: [] };
      if (!map.getSource('route-main')) {
        map.addSource('route-main', { type: 'geojson', data: empty });
      }
      if (!map.getLayer('route-main-line')) {
        map.addLayer({
          id: 'route-main-line',
          type: 'line',
          source: 'route-main',
          paint: {
            'line-color': '#2563eb',
            'line-width': 5,
            'line-opacity': 0.9
          }
        });
      }
      if (!map.getSource('route-alt')) {
        map.addSource('route-alt', { type: 'geojson', data: empty });
      }
      if (!map.getLayer('route-alt-line')) {
        map.addLayer({
          id: 'route-alt-line',
          type: 'line',
          source: 'route-alt',
          paint: {
            'line-color': '#94a3b8',
            'line-width': 4,
            'line-opacity': 0.55
          }
        });
      }
    });
  }, [mapCenter, mapZoom]);

  useEffect(() => {
    const query = productSearch.trim();
    const delay = query ? 350 : 0;
    const timeoutId = setTimeout(() => {
      dispatch(fetchSupabaseShops(query ? { product: query, project: mapSupabaseProject } : { project: mapSupabaseProject }));
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [dispatch, productSearch, mapSupabaseProject]);


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

  const parseMinutes = (timeValue) => {
    if (!timeValue) return null;
    const [hours, minutes] = String(timeValue).split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };

  const isShopOpen = (openTime, closeTime) => {
    if (isMapDemoMode) return true;
    const openMinutes = parseMinutes(openTime);
    const closeMinutes = parseMinutes(closeTime);
    if (openMinutes == null || closeMinutes == null) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (closeMinutes < openMinutes) {
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    }
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  };

  const toSupabaseShopId = (shop) => {
    const raw = shop?.id ?? shop?._id;
    if (!raw) return null;
    const str = String(raw);
    if (str.startsWith('sb_')) {
      return str.slice(3);
    }
    return str;
  };

  const openCatalog = useCallback((marker) => {
    if (isRoutingActive) return;
    if (!marker?.shopId) return;
    setCatalogShop(marker);
    setCatalogSearch('');
    setIsCatalogOpen(true);
    dispatch(fetchSupabaseShopProducts({ shopId: marker.shopId, project: mapSupabaseProject }));
  }, [dispatch, isRoutingActive, mapSupabaseProject]);

  const openDirections = useCallback((marker, anchor) => {
    if (!marker) return;
    setDirectionsShop(marker);
    setIsDirectionsOpen(true);
    setDirectionsMode(null);
    setRouteStatus('idle');
    setRouteDuration(null);
    setRouteError(null);
    setRouteGeojson({ type: 'FeatureCollection', features: [] });
    setAltRouteGeojson({ type: 'FeatureCollection', features: [] });
    setDirectionsAnchor(anchor || null);
    setIsRoutingActive(true);
  }, []);

  const closeDirections = () => {
    setIsDirectionsOpen(false);
    setDirectionsShop(null);
    setDirectionsMode(null);
    setRouteStatus('idle');
    setRouteDuration(null);
    setRouteError(null);
    setRouteGeojson({ type: 'FeatureCollection', features: [] });
    setAltRouteGeojson({ type: 'FeatureCollection', features: [] });
    setDirectionsAnchor(null);
    setIsRoutingActive(false);
  };

  const toggleMapDatabase = () => {
    const nextProject = mapSupabaseProject === 'DUMMY' ? 'REAL' : 'DUMMY';
    const resolved = setMapSupabaseProject(nextProject);
    setMapSupabaseProjectState(resolved);

    if (catalogShop?.shopId) {
      dispatch(
        fetchSupabaseShopProducts({
          shopId: catalogShop.shopId,
          q: catalogSearch.trim() || undefined,
          project: resolved
        })
      );
    }
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
        open_time: shop.open_time || shop.operatingHours?.open || shop.operatingHours?.monday?.open || null,
        close_time: shop.close_time || shop.operatingHours?.close || shop.operatingHours?.monday?.close || null,
        status: shop.status || null
      };
    })
    .filter(Boolean)
    .filter(marker => {
      // Category filter
      const matchesCategory =
        selectedCategory === 'All' ||
        normalizeCategory(marker.category).includes(normalizeCategory(selectedCategory)) ||
        normalizeCategory(selectedCategory).includes(normalizeCategory(marker.category));

      // Rating filter
      const matchesRating = marker.rating >= minRating;

      // Distance filter using haversineKm
      const distanceBase = userLocation;
      const exactDistance = distanceBase ? haversineKm(distanceBase, marker.position) : 0;
      const matchesDistance = !distanceBase || distanceFilter >= 50
        ? true
        : exactDistance <= distanceFilter;

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

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    if (!canvas) return;
    canvas.style.filter = isDarkMode ? 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)' : 'none';
  }, [isDarkMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const center = mapCenter;
    if (!center || center.length !== 2) return;
    const shouldFit = Number.isFinite(distanceFilter) && radiusFitToken >= 0;
    if (shouldFit) {
      const rect = map.getContainer().getBoundingClientRect();
      const minPixels = Math.max(1, Math.min(rect.width, rect.height));
      const maxDistanceKm = maxDistanceFromBoundsKm(center) || 100;
      const percent = Math.max(1, Math.min(100, Number(distanceFilter) || 1));
      const effectiveRadiusKm = maxDistanceKm * (percent / 100);
      const radiusMeters = Math.max(100, effectiveRadiusKm * 1000);
      const metersPerPixel = (radiusMeters * 2) / minPixels;
      const rawZoom = Math.log2(40075016.686 / (256 * metersPerPixel)) - 0.6;
      const targetZoom = Math.max(3, Math.min(19, Math.round(rawZoom)));
      if (targetZoom !== mapZoom) setMapZoom(targetZoom);
      map.flyTo({ center: [center[1], center[0]], zoom: targetZoom, duration: 1500, essential: true });
    } else {
      map.flyTo({ center: [center[1], center[0]], zoom: mapZoom, duration: 1500, essential: true });
    }
  }, [mapCenter, mapZoom, distanceFilter, radiusFitToken]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (userLocation && Array.isArray(userLocation) && userLocation.length === 2) {
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.innerHTML = userLocationIconHtml;
      el.style.width = '56px';
      el.style.height = '56px';
      el.style.zIndex = '1000';
      if (!userMarkerRef.current) {
        userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([userLocation[1], userLocation[0]])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([userLocation[1], userLocation[0]]);
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    }
  }, [userLocation, userLocationIconHtml]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const current = shopMarkersRef.current;
    const nextIds = new Set(filteredMarkers.map(m => String(m.id)));
    for (const [id, mk] of current.entries()) {
      if (!nextIds.has(id)) {
        mk.marker.remove();
        current.delete(id);
      }
    }
    filteredMarkers.forEach((marker) => {
      const id = String(marker.id);
      const lng = marker.position[1];
      const lat = marker.position[0];
      if (current.has(id)) {
        current.get(id).marker.setLngLat([lng, lat]);
        return;
      }
      const isOpen = isShopOpen(marker.open_time, marker.close_time);
      const el = document.createElement('div');
      el.style.width = `${shopIconSize[0]}px`;
      el.style.height = `${shopIconSize[1]}px`;
      el.style.transform = 'translate(-50%, -100%)';
      el.style.cursor = 'pointer';
      el.style.borderRadius = '9999px';
      el.style.boxShadow = isOpen
        ? '0 0 12px rgba(34,197,94,0.55)'
        : '0 0 12px rgba(239,68,68,0.55)';
      const img = document.createElement('img');
      img.src = securityPin;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.display = 'block';
      el.appendChild(img);
      const popupEl = document.createElement('div');
      popupEl.className = 'p-2';
      popupEl.innerHTML = `
        <div class="p-2">
          <h3 class="font-bold text-lg">${marker.name}</h3>
          <p class="text-gray-600">${marker.category}</p>
          <div class="mt-2 flex items-center gap-2 text-xs">
            <span class="inline-flex items-center rounded-full px-2 py-1 ${isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${isOpen ? 'Open' : 'Closed'}
            </span>
            <span class="text-gray-500">${marker.open_time || '--:--'} - ${marker.close_time || '--:--'}</span>
          </div>
          <div class="flex items-center mt-2">
            <span class="text-yellow-500">★</span>
            <span class="ml-1 font-semibold">${marker.rating}</span>
          </div>
          <button type="button" data-action="catalog" class="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">View catalog</button>
          <button type="button" data-action="directions" class="mt-2 w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Show directions</button>
        </div>
      `;
      const popup = new maplibregl.Popup({ offset: 16 }).setDOMContent(popupEl);
      const catalogBtn = popupEl.querySelector('[data-action="catalog"]');
      if (catalogBtn) {
        catalogBtn.addEventListener('click', () => openCatalog(marker));
      }
      const directionsBtn = popupEl.querySelector('[data-action="directions"]');
      if (directionsBtn) {
        directionsBtn.addEventListener('click', () => {
          popup.remove();
          const map = mapInstanceRef.current;
          const anchor = map ? map.project([lng, lat]) : null;
          openDirections(marker, anchor);
        });
      }
      const mk = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);
      current.set(id, { marker: mk, popup });
    });
  }, [filteredMarkers, shopIconSize, openCatalog, openDirections, isShopOpen]);

  useEffect(() => {
    if (!isRoutingActive) return;
    const current = shopMarkersRef.current;
    for (const entry of current.values()) {
      if (entry?.popup) entry.popup.remove();
    }
  }, [isRoutingActive]);

  useEffect(() => {
    if (!isDirectionsOpen || !directionsShop || !directionsMode) return;
    const origin = Array.isArray(userLocation) && userLocation.length === 2
      ? userLocation
      : Array.isArray(mapCenter) && mapCenter.length === 2 && (mapCenter[0] !== 0 || mapCenter[1] !== 0)
        ? mapCenter
        : null;
    if (!origin) {
      setRouteStatus('error');
      setRouteError('Turn on location to get directions.');
      setRouteGeojson({ type: 'FeatureCollection', features: [] });
      setAltRouteGeojson({ type: 'FeatureCollection', features: [] });
      setIsRoutingActive(false);
      return;
    }
    const destination = directionsShop.position;
    if (!destination || destination.length !== 2) return;
    const profile = directionsMode === 'walking' ? 'foot' : 'driving';
    const coords = `${origin[1]},${origin[0]};${destination[1]},${destination[0]}`;
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?alternatives=true&overview=full&geometries=geojson&steps=false`;
    const controller = new AbortController();
    setRouteStatus('loading');
    setRouteError(null);
    setRouteDuration(null);
    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('routing_failed');
        return res.json();
      })
      .then((data) => {
        const routes = Array.isArray(data?.routes) ? data.routes : [];
        if (routes.length === 0) {
          throw new Error('no_routes');
        }
        const mainRoute = routes[0];
        const altRoutes = routes.slice(1);
        const distanceMeters = Number(mainRoute?.distance);
        const walkSpeed = 1.4;
        const driveSpeed = 8.33;
        const speed = directionsMode === 'walking' ? walkSpeed : driveSpeed;
        const estimatedSeconds = Number.isFinite(distanceMeters)
          ? distanceMeters / speed
          : Number(mainRoute?.duration);
        setRouteDuration(estimatedSeconds);
        setRouteGeojson({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: mainRoute.geometry
            }
          ]
        });
        setAltRouteGeojson({
          type: 'FeatureCollection',
          features: altRoutes.map((route, index) => ({
            type: 'Feature',
            properties: { index },
            geometry: route.geometry
          }))
        });
        setRouteStatus('ready');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setRouteStatus('error');
        setRouteError('Unable to calculate route. Try again.');
        setRouteGeojson({ type: 'FeatureCollection', features: [] });
        setAltRouteGeojson({ type: 'FeatureCollection', features: [] });
        setIsRoutingActive(false);
      });
    return () => controller.abort();
  }, [isDirectionsOpen, directionsShop, directionsMode, userLocation, mapCenter]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const mainSource = map.getSource('route-main');
    if (mainSource && routeGeojson) {
      mainSource.setData(routeGeojson);
    }
    const altSource = map.getSource('route-alt');
    if (altSource && altRouteGeojson) {
      altSource.setData(altRouteGeojson);
    }
    const mainFeature = routeGeojson?.features?.[0];
    const coords = mainFeature?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length > 1) {
      const bounds = coords.reduce((acc, coord) => acc.extend(coord), new maplibregl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(bounds, { padding: 80, duration: 1000 });
    }
  }, [routeGeojson, altRouteGeojson]);

  return (
    <div className={`h-screen overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
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
        <div ref={mapRef} className="z-0" style={{ width: '100%', height: '100%' }} />

        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMapDatabase}
              className="rounded-full border bg-white/90 px-3 py-1 text-xs font-semibold shadow-sm hover:bg-white"
            >
              Switch DB
            </button>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                isMapDemoMode
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isMapDemoMode ? 'Demo DB' : 'Real DB'} · {mapSupabaseProject}
            </span>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm shadow-sm backdrop-blur-sm max-w-xs">
              <span className="font-semibold block mb-1">Failed to load shop data</span>
              {typeof error === 'string' ? error : 'Please check your connection and try again.'}
            </div>
          )}
        </div>

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
              <span className={`text-sm w-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {distanceFilter >= 50 ? 'Any' : `${distanceFilter}km`}
              </span>
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
                  <svg className="w-4 h-4 mr-2 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {isDirectionsOpen && directionsShop && (
          <div
            className={`absolute left-1/2 top-4 z-20 w-80 -translate-x-1/2 rounded-xl shadow-2xl backdrop-blur-sm transition-colors duration-300 ${isDarkMode ? 'bg-gray-900/95 text-gray-100' : 'bg-white/95 text-gray-800'
              }`}
          >
            <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Directions</div>
                  <div className="text-lg font-semibold truncate">{directionsShop.name}</div>
                  <div className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{directionsShop.category}</div>
                </div>
                <button
                  type="button"
                  onClick={closeDirections}
                  className={`rounded-lg px-3 py-2 text-sm ${isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirectionsMode('walking')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${directionsMode === 'walking'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Walk
                </button>
                <button
                  type="button"
                  onClick={() => setDirectionsMode('driving')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${directionsMode === 'driving'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Vehicle
                </button>
              </div>
              {routeStatus === 'loading' && (
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Calculating route...</div>
              )}
              {routeStatus === 'ready' && routeDuration && (
                <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Estimated time: {formatDuration(routeDuration)}
                </div>
              )}
              {routeError && (
                <div className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{routeError}</div>
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

export default CategoryMapPageScrollable;
