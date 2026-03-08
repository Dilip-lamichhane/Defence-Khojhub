import React from 'react';

const CatalogManager = ({ categories, selectedCategory, onSelectCategory, onClear }) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Catalog Categories</h3>
          <p className="text-sm text-gray-500">Filter and organize your products by category.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${!selectedCategory ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedCategory === category ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CatalogManager;
