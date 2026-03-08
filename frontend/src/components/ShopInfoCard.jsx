import React from 'react';

const ShopInfoCard = ({ shop }) => {
  if (!shop) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
        No shop found for this account. Please contact support or create a shop in the admin flow.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{shop.name || 'Unnamed Shop'}</h3>
          <p className="mt-1 text-sm text-gray-600">{shop.description || 'No description provided yet.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${shop.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {shop.status || 'pending'}
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-gray-700 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Opening Hours</p>
          <p className="mt-1 font-medium">{shop.open_time || '--:--'} - {shop.close_time || '--:--'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Location</p>
          <p className="mt-1 font-medium">{shop.latitude && shop.longitude ? `${shop.latitude}, ${shop.longitude}` : 'Location not set'}</p>
        </div>
      </div>
    </div>
  );
};

export default ShopInfoCard;
