import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { getShopDetails } from '../store/slices/shopsSlice';
import { fetchReviews, createReview } from '../store/slices/reviewsSlice';
import RatingStars from '../components/RatingStars';
import LoadingSpinner from '../components/LoadingSpinner';
import MapComponent from '../components/MapComponent';

const ShopDetailsPage = () => {
  const { shopId } = useParams();
  const dispatch = useAppDispatch();
  const { currentShop, loading, error } = useAppSelector((state) => state.shops);
  const { reviews, loading: reviewsLoading } = useAppSelector((state) => state.reviews);
  const { user } = useAppSelector((state) => state.auth);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    if (shopId) {
      dispatch(getShopDetails(shopId));
      dispatch(fetchReviews(shopId));
    }
  }, [dispatch, shopId]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      // redirect to login or show message
      return;
    }

    try {
      await dispatch(createReview({ shopId, reviewData: { rating: reviewForm.rating, comment: reviewForm.comment } }));
      // Refresh reviews
      dispatch(fetchReviews(shopId));
    } catch (err) {
      // ignore - errors handled in slice
    }

    setShowReviewForm(false);
    setReviewForm({ rating: 5, comment: '' });
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
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Shop</h2>
          <p className="text-gray-600">{error}</p>
          <Link
            to="/"
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!currentShop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Shop Not Found</h2>
          <Link
            to="/"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Shop Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{currentShop.name}</h1>
              <p className="text-gray-600 mb-4">{currentShop.description}</p>
              <div className="flex items-center mb-4">
                <RatingStars rating={currentShop.averageRating || 0} />
                <span className="ml-2 text-gray-600">
                  {currentShop.averageRating?.toFixed(1) || 'No rating'} ({currentShop.reviewCount || 0} reviews)
                </span>
              </div>
              <div className="space-y-2 text-gray-600">
                <p><strong>Address:</strong> {currentShop.address}</p>
                <p><strong>Phone:</strong> {currentShop.phone || 'Not available'}</p>
                <p><strong>Email:</strong> {currentShop.email || 'Not available'}</p>
                <p><strong>Category:</strong> {currentShop.category?.name || 'Not specified'}</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="text-center">
                <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                  currentShop.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {currentShop.isAvailable ? 'Open' : 'Closed'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Location</h2>
          <div className="h-64 rounded-lg overflow-hidden">
            <MapComponent shops={[currentShop]} />
          </div>
        </div>

        {/* Operating Hours */}
        {currentShop.operatingHours && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Operating Hours</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(currentShop.operatingHours).map(([day, hours]) => (
                <div key={day} className="flex justify-between">
                  <span className="font-medium capitalize">{day}:</span>
                  <span>{hours}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products Section */}
        {currentShop.products && currentShop.products.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentShop.products.map((product) => (
                <div key={product._id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-600">${product.price}</span>
                    <span className={`text-sm ${
                      product.isAvailable ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {product.isAvailable ? 'Available' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Reviews</h2>
            {user && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Write Review
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && user && (
            <form onSubmit={handleReviewSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Rating</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className={`text-2xl ${
                        star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Comment</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Submit Review
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          {reviewsLoading ? (
            <div className="text-center py-4">
              <LoadingSpinner size="small" />
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="border-b pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {review.user?.username || 'Anonymous'}
                      </h4>
                      <RatingStars rating={review.rating} />
                    </div>
                    <span className="text-gray-500 text-sm">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">No reviews yet. Be the first to review this shop!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopDetailsPage;