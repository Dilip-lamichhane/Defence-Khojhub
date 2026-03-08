import React from 'react';

const availabilityLabels = {
  available: 'Available',
  out_of_stock: 'Out of Stock'
};

const ProductTable = ({ products, onEdit, onDelete, onToggleAvailability, isLoading }) => {
  if (!products?.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600">
        No products available. Add your first product to start selling.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="bg-white">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.category || 'Uncategorized'}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="line-clamp-2 max-w-xs">{product.description || '—'}</div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  ${Number(product.price || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => onToggleAvailability(product)}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${product.availability === 'available' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                  >
                    {availabilityLabels[product.availability] || 'Unknown'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(product)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
