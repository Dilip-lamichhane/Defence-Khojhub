import React from 'react';

const ShopHoursEditor = ({ openTime, closeTime, onChange }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="text-xs font-semibold uppercase text-gray-500">Open Time</label>
        <input
          type="time"
          value={openTime || ''}
          onChange={(event) => onChange('open_time', event.target.value)}
          className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-gray-500">Close Time</label>
        <input
          type="time"
          value={closeTime || ''}
          onChange={(event) => onChange('close_time', event.target.value)}
          className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
    </div>
  );
};

export default ShopHoursEditor;
