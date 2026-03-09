import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { UserButton, useAuth, useUser } from '@clerk/clerk-react';
import { LayoutDashboard, Store, Package, Layers, Settings, Plus } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { getSupabaseByType, getSupabaseByTypeWithAuth } from '../lib/supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ShopInfoCard from '../components/ShopInfoCard.jsx';
import ProductTable from '../components/ProductTable.jsx';
import ProductForm from '../components/ProductForm.jsx';
import CatalogManager from '../components/CatalogManager.jsx';
import ShopHoursEditor from '../components/ShopHoursEditor.jsx';

const sidebarItems = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'shop', label: 'My Shop', icon: Store },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'catalog', label: 'Catalog', icon: Layers },
  { id: 'settings', label: 'Shop Settings', icon: Settings }
];

const ShopDashboard = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const { activeSupabaseProject } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [shop, setShop] = useState(null);
  const [shopForm, setShopForm] = useState({
    name: '',
    description: '',
    open_time: '',
    close_time: ''
  });
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoadingShop, setIsLoadingShop] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormError, setProductFormError] = useState(null);

  const supabaseType = useMemo(
    () => (String(activeSupabaseProject || '').toUpperCase() === 'DUMMY' ? 'dummy' : 'real'),
    [activeSupabaseProject]
  );
  const supabase = useMemo(() => getSupabaseByType(supabaseType), [supabaseType]);
  const [supabaseAuthed, setSupabaseAuthed] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!isLoaded || !isSignedIn) {
      setSupabaseAuthed(null);
      return undefined;
    }
    getToken({ template: 'supabase' })
      .then((token) => {
        if (!isMounted) return;
        const client = getSupabaseByTypeWithAuth(supabaseType, token);
        setSupabaseAuthed(client);
      })
      .catch(() => {
        if (!isMounted) return;
        setSupabaseAuthed(null);
      });
    return () => {
      isMounted = false;
    };
  }, [getToken, isLoaded, isSignedIn, supabaseType]);

  const supabaseClient = supabaseAuthed || supabase;


  const categories = useMemo(
    () => [
      'Restaurant',
      'Electronics',
      'Automobile',
      'Health/Medicine',
      'Fitness',
      'Home Services',
      'Services'
    ],
    []
  );

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  const loadShop = useCallback(async () => {
    if (!supabaseClient || !user?.id) return;
    if (isSignedIn && !supabaseAuthed) return;
    setIsLoadingShop(true);
    setAlert(null);

    const { data, error } = await supabaseClient
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setAlert({ type: 'error', message: `Failed to load shops: ${error.message}` });
      setIsLoadingShop(false);
      return;
    }

    let list = data || [];

    if (list.length === 0) {
      const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
      if (email) {
        const { data: byEmail, error: emailError } = await supabaseClient
          .from('shops')
          .select('*')
          .eq('email', email)
          .order('created_at', { ascending: false });

        if (emailError) {
          setAlert({ type: 'error', message: `Failed to load shops: ${emailError.message}` });
          setIsLoadingShop(false);
          return;
        }

        list = byEmail || [];
      }
    }

    setShops(list);
    const initial = list.find((item) => item.id === selectedShopId) || list[0] || null;
    setShop(initial);
    setSelectedShopId(initial?.id || '');
    setShopForm({
      name: initial?.name || '',
      description: initial?.description || '',
      open_time: initial?.open_time || '',
      close_time: initial?.close_time || ''
    });
    setIsLoadingShop(false);
  }, [supabaseClient, user?.id, isSignedIn, supabaseAuthed, selectedShopId]);

  const loadProducts = useCallback(async () => {
    if (!supabaseClient || !shop?.id) return;
    if (isSignedIn && !supabaseAuthed) return;
    setIsLoadingProducts(true);
    setAlert(null);
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });

    if (error) {
      setAlert({ type: 'error', message: `Failed to load products: ${error.message}` });
    } else {
      const normalized = (data || []).map((product) => ({
        ...product,
        availability: product.availability || (product.in_stock === false ? 'out_of_stock' : 'available')
      }));
      setProducts(normalized);
    }
    setIsLoadingProducts(false);
  }, [supabaseClient, shop?.id, isSignedIn, supabaseAuthed]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadShop();
    }
  }, [isLoaded, isSignedIn, loadShop]);

  useEffect(() => {
    if (shop?.id) {
      loadProducts();
    } else {
      setProducts([]);
    }
  }, [shop?.id, loadProducts]);

  const handleSelectShop = (shopId) => {
    const next = shops.find((item) => item.id === shopId) || null;
    setSelectedShopId(shopId);
    setShop(next);
    setShopForm({
      name: next?.name || '',
      description: next?.description || '',
      open_time: next?.open_time || '',
      close_time: next?.close_time || ''
    });
  };

  const handleShopFormChange = (field, value) => {
    setShopForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveShopSettings = async () => {
    if (!shop?.id || !supabaseClient) return;
    setIsSaving(true);
    setAlert(null);
    const { data, error } = await supabaseClient
      .from('shops')
      .update({
        name: shopForm.name,
        description: shopForm.description,
        open_time: shopForm.open_time,
        close_time: shopForm.close_time
      })
      .eq('id', shop.id)
      .eq('owner_id', user?.id)
      .select('*')
      .single();

    if (error) {
      setAlert({ type: 'error', message: `Failed to update shop: ${error.message}` });
    } else {
      setShop(data);
      setAlert({ type: 'success', message: 'Shop details updated successfully.' });
    }
    setIsSaving(false);
  };

  const handleSaveProduct = async (payload) => {
    if (!shop?.id || !supabaseClient) {
      setProductFormError('Shop data is not loaded yet. Please wait and try again.');
      return;
    }
    setIsSaving(true);
    setAlert(null);
    setProductFormError(null);
    try {
      if (editingProduct) {
        const { data, error } = await supabaseClient
          .from('products')
          .update({
            name: payload.name,
            description: payload.description,
            price: payload.price,
            category: payload.category,
            availability: payload.availability,
            in_stock: payload.availability === 'available'
          })
          .eq('id', editingProduct.id)
          .select('*')
          .single();

        if (error) {
          throw new Error(error.message);
        }

        setProducts((prev) => prev.map((item) => (item.id === data.id ? data : item)));
        setAlert({ type: 'success', message: 'Product updated successfully.' });
      } else {
        const { data, error } = await supabaseClient
          .from('products')
          .insert({
            shop_id: shop.id,
            owner_id: user?.id,
            name: payload.name,
            description: payload.description,
            price: payload.price,
            category: payload.category,
            availability: payload.availability,
            in_stock: payload.availability === 'available'
          })
          .select('*')
          .single();

        if (error) {
          throw new Error(error.message);
        }

        setProducts((prev) => [data, ...prev]);
        setAlert({ type: 'success', message: 'Product created successfully.' });
      }

      setShowProductForm(false);
      setEditingProduct(null);
    } catch (error) {
      const message = error.message || 'Product save failed.';
      setAlert({ type: 'error', message });
      setProductFormError(message);
    }
    setIsSaving(false);
  };

  const handleDeleteProduct = async (product) => {
    if (!supabaseClient || !product?.id) return;
    if (!window.confirm(`Delete ${product.name}? This action cannot be undone.`)) return;
    setIsSaving(true);
    setAlert(null);
    const { error } = await supabaseClient.from('products').delete().eq('id', product.id);
    if (error) {
      setAlert({ type: 'error', message: `Delete failed: ${error.message}` });
    } else {
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      setAlert({ type: 'success', message: 'Product deleted successfully.' });
    }
    setIsSaving(false);
  };

  const handleToggleAvailability = async (product) => {
    if (!supabaseClient || !product?.id) return;
    const nextValue = product.availability === 'available' ? 'out_of_stock' : 'available';
    setIsSaving(true);
    setAlert(null);
    const { data, error } = await supabaseClient
      .from('products')
      .update({
        availability: nextValue,
        in_stock: nextValue === 'available'
      })
      .eq('id', product.id)
      .select('*')
      .single();

    if (error) {
      setAlert({ type: 'error', message: `Update failed: ${error.message}` });
    } else {
      setProducts((prev) => prev.map((item) => (item.id === data.id ? data : item)));
    }
    setIsSaving(false);
  };

  const openCreateProduct = () => {
    if (!shop?.id || isLoadingShop) {
      const message = isLoadingShop
        ? 'Shop is still loading. Please wait a moment.'
        : 'No shop found for this account. Create a shop before adding products.';
      setAlert({ type: 'error', message });
      setProductFormError(message);
      return;
    }
    setEditingProduct(null);
    setProductFormError(null);
    setShowProductForm(true);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductFormError(null);
    setShowProductForm(true);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (isLoaded && !isSignedIn) {
    return <Navigate to="/login" replace />;
  }


  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <div className="flex">
        <aside className="hidden h-screen w-64 shrink-0 border-r border-gray-200 bg-white p-6 lg:block">
          <div className="mb-8">
            <h2 className="text-lg font-semibold">Shopkeeper</h2>
            <p className="text-xs text-gray-500">Manage your business</p>
          </div>
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">
          <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-xl font-semibold">
                  {sidebarItems.find((item) => item.id === activeSection)?.label || 'Dashboard'}
                </h1>
                <p className="text-xs text-gray-500">Welcome back, {user?.firstName || 'Shopkeeper'}.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/?openRegister=true')}
                  className="hidden items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 sm:flex"
                >
                  Create New Shop
                </button>
                <button
                  type="button"
                  onClick={openCreateProduct}
                  className="hidden items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 sm:flex"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
                <UserButton afterSignOutUrl="/login" />
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-8">
            {alert && (
              <div className={`rounded-lg border px-4 py-3 text-sm ${alert.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {alert.message}
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">My Shops</h3>
                  <p className="text-sm text-gray-500">Select a shop to manage its products and settings.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase text-gray-500">Select Shop</label>
                  <select
                    value={selectedShopId}
                    onChange={(event) => handleSelectShop(event.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Choose a shop</option>
                    {shops.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name || 'Unnamed Shop'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shops.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                    No shops yet. Use "Create New Shop" to add one.
                  </div>
                )}
                {shops.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectShop(item.id)}
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition ${item.id === selectedShopId ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="font-semibold text-gray-900">{item.name || 'Unnamed Shop'}</div>
                    <div className="text-xs text-gray-500">{item.category || 'Uncategorized'}</div>
                    <div className="text-xs text-gray-400">
                      {item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : 'Location not set'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {activeSection === 'overview' && (
              <div className="space-y-6">
                <ShopInfoCard shop={shop} />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Total Products</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">{products.length}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Available</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {products.filter((product) => product.availability === 'available').length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Total Catalog Value</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      ${products.reduce((sum, product) => sum + Number(product.price || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'shop' && (
              <div className="space-y-6">
                {isLoadingShop ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <ShopInfoCard shop={shop} />
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900">Shop Hours</h3>
                      <p className="text-sm text-gray-500">Define your open and close times.</p>
                      <div className="mt-4">
                        <ShopHoursEditor
                          openTime={shopForm.open_time}
                          closeTime={shopForm.close_time}
                          onChange={handleShopFormChange}
                        />
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={saveShopSettings}
                          disabled={isSaving}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {isSaving ? 'Saving...' : 'Save Hours'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeSection === 'products' && (
              <div className="space-y-6">
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Product Management</h3>
                    <p className="text-sm text-gray-500">Create, edit, and manage your product availability.</p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateProduct}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </button>
                </div>

                {isLoadingProducts ? (
                  <LoadingSpinner />
                ) : (
                  <ProductTable
                    products={filteredProducts}
                    onEdit={openEditProduct}
                    onDelete={handleDeleteProduct}
                    onToggleAvailability={handleToggleAvailability}
                    isLoading={isSaving}
                  />
                )}
              </div>
            )}

            {activeSection === 'catalog' && (
              <div className="space-y-6">
                <CatalogManager
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onClear={() => setSelectedCategory('')}
                />
                {isLoadingProducts ? (
                  <LoadingSpinner />
                ) : (
                  <ProductTable
                    products={filteredProducts}
                    onEdit={openEditProduct}
                    onDelete={handleDeleteProduct}
                    onToggleAvailability={handleToggleAvailability}
                    isLoading={isSaving}
                  />
                )}
              </div>
            )}

            {activeSection === 'settings' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">Shop Settings</h3>
                  <p className="text-sm text-gray-500">Update your shop profile information.</p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-500">Shop Name</label>
                      <input
                        value={shopForm.name}
                        onChange={(event) => handleShopFormChange('name', event.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="Shop name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-500">Shop Description</label>
                      <textarea
                        value={shopForm.description}
                        onChange={(event) => handleShopFormChange('description', event.target.value)}
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="Describe your shop"
                      />
                    </div>
                    <ShopHoursEditor
                      openTime={shopForm.open_time}
                      closeTime={shopForm.close_time}
                      onChange={handleShopFormChange}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={saveShopSettings}
                        disabled={isSaving}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <ProductForm
        isOpen={showProductForm}
        onClose={() => {
          setShowProductForm(false);
          setEditingProduct(null);
          setProductFormError(null);
        }}
        onSubmit={handleSaveProduct}
        initialData={editingProduct}
        categories={categories}
        isSaving={isSaving}
        serverError={productFormError}
      />
    </div>
  );
};

export default ShopDashboard;
