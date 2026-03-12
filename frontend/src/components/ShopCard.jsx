import React from 'react';
import { Link } from 'react-router-dom';
import RatingStars from './RatingStars';
import PropTypes from 'prop-types';

const ShopCard = ({ shop, onClick, className = '' }) => {
  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const formatOperatingHours = (hours) => {
    if (!hours) return 'Hours not available';
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = hours[currentDay];
    
    if (!todayHours || todayHours.closed) {
      return 'Closed today';
    }
    
    return `${todayHours.open} - ${todayHours.close}`;
  };

  const isOpenNow = (hours) => {
    if (!hours) return null;
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = hours[currentDay];
    
    if (!todayHours || todayHours.closed) {
      return false;
    }
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(shop);
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden ${className}`}
      onClick={handleCardClick}
    >
      {/* Shop Image */}
      <div className="relative h-48 bg-gray-200">
        {shop.image ? (
          <img
            src={shop.image}
            alt={shop.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5TaG9wIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-100 to-blue-200">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-blue-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4h4v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd" />
              </svg>
              <p className="text-blue-600 font-medium">{shop.name}</p>
            </div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          {isOpenNow(shop.operatingHours) ? (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
              Open Now
            </span>
          ) : (
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
              Closed
            </span>
          )}
        </div>

        {/* Distance Badge */}
        {shop.distance !== undefined && (
          <div className="absolute top-2 right-2">
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
              {formatDistance(shop.distance)}
            </span>
          </div>
        )}
      </div>

      {/* Shop Details */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
            {shop.name}
          </h3>
          {shop.category && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full ml-2 flex-shrink-0">
              {shop.category.name}
            </span>
          )}
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {shop.description || 'No description available'}
        </p>

        {/* Rating and Reviews */}
        {((shop.rating || shop.averageRating) && (shop.rating || shop.averageRating) > 0) && (
          <div className="flex items-center mb-3">
            <RatingStars rating={shop.rating || shop.averageRating} size="sm" />
            <span className="ml-2 text-sm text-gray-600">
              {(shop.rating || shop.averageRating).toFixed(1)}
              {(shop.reviewCount || shop.review_count) > 0 && (
                <span className="ml-1">({shop.reviewCount || shop.review_count} reviews)</span>
              )}
            </span>
          </div>
        )}

        {/* Operating Hours */}
        {shop.operatingHours && (
          <div className="text-sm text-gray-500 mb-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatOperatingHours(shop.operatingHours)}
            </div>
          </div>
        )}

        {/* Address */}
        <div className="text-sm text-gray-500 mb-4">
          <div className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="line-clamp-2">
              {shop.address || 'Address not available'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Link
            to={`/shops/${shop._id}`}
            className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            View Details
          </Link>
          {shop.phone && (
            <a
              href={`tel:${shop.phone}`}
              className="bg-gray-100 text-gray-700 p-2 rounded-md hover:bg-gray-200 transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="Call Shop"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

ShopCard.propTypes = {
  shop: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    image: PropTypes.string,
    address: PropTypes.string,
    phone: PropTypes.string,
    rating: PropTypes.number,
    reviewCount: PropTypes.number,
    category: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }),
    operatingHours: PropTypes.object,
    distance: PropTypes.number,
  }).isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default ShopCard;