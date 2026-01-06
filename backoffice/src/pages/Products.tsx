import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../services/api';
import { Plus, Edit, Trash2, Search, Package, Image as ImageIcon, X } from 'lucide-react';

interface Product {
  Id: number;
  Name: string;
  Code: string | null;
  Description: string | null;
  Price: number;
  Cost: number;
  Stock?: number;
  IsService: boolean;
  IsEnabled: boolean;
  DateCreated: string;
  DateUpdated: string;
  ImageUrl?: string;
}

export default function Products() {
  const { admin, logout } = useAuth();
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    Name: '',
    Code: '',
    Description: '',
    Price: '',
    Cost: '',
    Stock: '',
    IsService: false,
    IsEnabled: true,
    ImageUrl: ''
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', searchTerm],
    queryFn: () => productsService.getProducts({ search: searchTerm }),
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => productsService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCloseModal();
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => productsService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCloseModal();
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        Name: product.Name,
        Code: product.Code || '',
        Description: product.Description || '',
        Price: product.Price.toString(),
        Cost: product.Cost.toString(),
        Stock: product.Stock?.toString() || '',
        IsService: product.IsService,
        IsEnabled: product.IsEnabled,
        ImageUrl: product.ImageUrl || ''
      });
      setImagePreview(product.ImageUrl || '');
    } else {
      setEditingProduct(null);
      setFormData({
        Name: '',
        Code: '',
        Description: '',
        Price: '',
        Cost: '',
        Stock: '',
        IsService: false,
        IsEnabled: true,
        ImageUrl: ''
      });
      setImagePreview('');
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      Name: '',
      Code: '',
      Description: '',
      Price: '',
      Cost: '',
      Stock: '',
      IsService: false,
      IsEnabled: true,
      ImageUrl: ''
    });
    setImagePreview('');
    setImageFile(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      Name: formData.Name,
      Code: formData.Code || null,
      Description: formData.Description || null,
      Price: parseFloat(formData.Price),
      Cost: parseFloat(formData.Cost),
      Stock: formData.Stock ? parseInt(formData.Stock) : null,
      IsService: formData.IsService,
      IsEnabled: formData.IsEnabled,
      ImageUrl: imagePreview || null
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.Id, data: productData });
    } else {
      createMutation.mutate(productData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('confirmDelete') || 'Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      {/* Header */}
      <nav className="bg-white border-b border-slate-200/60 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="text-xl font-bold text-slate-800 hover:text-primary transition-colors">
                {t('appName')} {t('adminBackoffice')}
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <LanguageToggle />
              <span className="text-sm text-slate-600">{admin?.Username}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Search and Add Button */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('products')}</h1>
            <p className="text-slate-600">{t('manageProducts')}</p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('searchProducts') || 'Search products...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 ps-10 pe-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              />
            </div>

            {/* Add Product Button */}
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              {t('addProduct')}
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('image')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('name')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('code')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('price')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('cost')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('stock')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-end text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      {t('loading')}...
                    </td>
                  </tr>
                ) : products?.products && products.products.length > 0 ? (
                  products.products.map((product: Product) => (
                    <tr key={product.Id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.ImageUrl ? (
                          <img
                            src={product.ImageUrl}
                            alt={product.Name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{product.Name}</div>
                        {product.Description && (
                          <div className="text-sm text-slate-500 truncate max-w-xs">{product.Description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {product.Code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {product.Price.toFixed(2)} {t('currency')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {product.Cost.toFixed(2)} {t('currency')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {product.Stock !== null && product.Stock !== undefined ? product.Stock : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.IsEnabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.IsEnabled ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="text-primary hover:text-primary/80 me-4"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.Id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      {t('noProductsFound')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-[95vw] mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-slate-200">
              <button
                onClick={handleCloseModal}
                className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shadow-sm transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900">
                {editingProduct ? t('editProduct') : t('addProduct')}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('productImage')}
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          setImageFile(null);
                          setFormData({ ...formData, ImageUrl: '' });
                        }}
                        className="absolute -top-2 -end-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="inline-block px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer transition-colors"
                    >
                      {t('chooseImage')}
                    </label>
                    <p className="text-xs text-slate-500 mt-2">
                      {t('imageDescription') || 'Upload a product image (JPG, PNG, max 5MB)'}
                    </p>
                  </div>
                </div>
                {/* Or paste image URL */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('orImageUrl') || 'Or paste image URL'}
                  </label>
                  <input
                    type="url"
                    value={formData.ImageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, ImageUrl: e.target.value });
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('productName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.Name}
                  onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('productCode')}
                </label>
                <input
                  type="text"
                  value={formData.Code}
                  onChange={(e) => setFormData({ ...formData, Code: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('description')}
                </label>
                <textarea
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
                />
              </div>

              {/* Price and Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('price')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.Price}
                    onChange={(e) => setFormData({ ...formData, Price: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('cost')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.Cost}
                    onChange={(e) => setFormData({ ...formData, Cost: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('stock')}
                </label>
                <input
                  type="number"
                  value={formData.Stock}
                  onChange={(e) => setFormData({ ...formData, Stock: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.IsService}
                    onChange={(e) => setFormData({ ...formData, IsService: e.target.checked })}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">{t('isService')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.IsEnabled}
                    onChange={(e) => setFormData({ ...formData, IsEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">{t('isEnabled')}</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t('saving') + '...'
                    : editingProduct
                    ? t('update')
                    : t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
