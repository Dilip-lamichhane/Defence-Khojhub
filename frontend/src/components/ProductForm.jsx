import React, { useEffect, useState } from 'react';

const availabilityOptions = [
  { value: 'available', label: 'Available' },
  { value: 'out_of_stock', label: 'Out of Stock' }
];

  const ProductForm = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  isSaving,
  serverError
}) => {
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    availability: 'available'
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      const initialCategory = categories?.includes(initialData.category)
        ? initialData.category
        : '';
      setFormState({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price ?? '',
        category: initialCategory,
        availability: initialData.availability || 'available'
      });
    } else {
      setFormState({
        name: '',
        description: '',
        price: '',
        category: '',
        availability: 'available'
      });
    }
    setError('');
  }, [initialData, isOpen, categories]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handlePriceChange = (event) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, price: value }));
    if (error) setError('');
  };


  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!formState.name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!formState.price || Number(formState.price) <= 0) {
      setError('Price must be greater than zero.');
      return;
    }
    if (!formState.category || !categories?.includes(formState.category)) {
      setError('Select a valid category from the list.');
      return;
    }
    await onSubmit({
      ...formState,
      price: Number(formState.price)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{initialData ? 'Edit Product' : 'Add Product'}</h3>
            <p className="text-sm text-gray-500">Manage your product catalog details.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Product Name *</label>
              <input
                name="name"
                value={formState.name}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Fresh oranges"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Price *</label>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={formState.price}
                onChange={handlePriceChange}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Description</label>
            <textarea
              name="description"
              value={formState.description}
              onChange={handleChange}
              rows={3}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Short product description"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Category *</label>
              <select
                name="category"
                value={formState.category}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                required
              >
                <option value="">Select a category</option>
                {categories?.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Availability</label>
              <select
                name="availability"
                value={formState.availability}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {availabilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {serverError && !error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : initialData ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
