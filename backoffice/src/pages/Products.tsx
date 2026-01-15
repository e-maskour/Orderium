import { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../services/api';
import { Plus, Edit, Trash2, Search, Package, Image as ImageIcon, X, Check, Grid3x3, List, CheckSquare, Square, Download, FileText, Upload } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { FloatingActionBar } from '../components/FloatingActionBar';

interface Product {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  price: number;
  cost: number;
  stock?: number;
  isService: boolean;
  isEnabled: boolean;
  isPriceChangeAllowed: boolean;
  dateCreated: string;
  dateUpdated: string;
  imageUrl?: string;
}

export default function Products() {
  const { t, dir } = useLanguage();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingValues, setEditingValues] = useState<{
    name: string;
    code: string;
    price: string;
    cost: string;
  }>({ name: '', code: '', price: '', cost: '' });
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    cost: '',
    stock: '',
    isService: false,
    isEnabled: true,
    isPriceChangeAllowed: true,
    imageUrl: ''
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const bulkUploadInputRef = useRef<HTMLInputElement>(null);

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', searchTerm, currentPage, pageSize],
    queryFn: () => productsService.getProducts({ search: searchTerm, page: currentPage, limit: pageSize }),
  });

  // Get pagination metadata from server response
  const productsList = products?.products || [];
  const pagination = products?.pagination || {};
  const totalCount = pagination.total || 0;
  const totalPages = pagination.totalPages || 1;
  const hasNextPage = pagination.hasNext || false;
  const hasPrevPage = pagination.hasPrev || false;

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

  const toggleSelectProduct = (id: number) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === productsList.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(productsList.map((p: Product) => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedProducts([]);
  };

  const handleBulkDelete = () => {
    if (window.confirm(t('confirmDelete'))) {
      selectedProducts.forEach(id => {
        deleteMutation.mutate(id);
      });
      clearSelection();
    }
  };

  const handleBulkEnable = () => {
    if (selectedProducts.length === 0) return;
    
    const product = productsList.find((p: Product) => p.id === selectedProducts[0]);
    if (!product) return;

    const updatedData = {
      name: product.name,
      code: product.code || null,
      description: product.description,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      isService: product.isService,
      isEnabled: true,
      isPriceChangeAllowed: product.isPriceChangeAllowed,
      imageUrl: product.imageUrl || null
    };

    updateMutation.mutate({ id: product.id, data: updatedData });
    clearSelection();
  };

  const handleBulkDisable = () => {
    if (selectedProducts.length === 0) return;
    
    const product = productsList.find((p: Product) => p.id === selectedProducts[0]);
    if (!product) return;

    const updatedData = {
      name: product.name,
      code: product.code || null,
      description: product.description,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      isService: product.isService,
      isEnabled: false,
      isPriceChangeAllowed: product.isPriceChangeAllowed,
      imageUrl: product.imageUrl || null
    };

    updateMutation.mutate({ id: product.id, data: updatedData });
    clearSelection();
  };

  const handleTogglePriceChangeAllowed = () => {
    if (selectedProducts.length === 0) return;
    
    const product = productsList.find((p: Product) => p.id === selectedProducts[0]);
    if (!product) return;

    const updatedData = {
      name: product.name,
      code: product.code || null,
      description: product.description,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      isService: product.isService,
      isEnabled: product.isEnabled,
      isPriceChangeAllowed: !product.isPriceChangeAllowed,
      imageUrl: product.imageUrl || null
    };

    updateMutation.mutate({ id: product.id, data: updatedData });
    clearSelection();
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        code: product.code || '',
        description: product.description || '',
        price: product.price.toString(),
        cost: product.cost.toString(),
        stock: product.stock?.toString() || '',
        isService: product.isService,
        isEnabled: product.isEnabled,
        isPriceChangeAllowed: product.isPriceChangeAllowed,
        imageUrl: product.imageUrl || ''
      });
      setImagePreview(product.imageUrl || '');
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        price: '',
        cost: '',
        stock: '',
        isService: false,
        isEnabled: true,
        imageUrl: ''
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
      name: '',
      code: '',
      description: '',
      price: '',
      cost: '',
      stock: '',
      isService: false,
      isEnabled: true,
      isPriceChangeAllowed: true,
      imageUrl: ''
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
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      stock: formData.stock ? parseInt(formData.stock) : null,
      isService: formData.isService,
      isEnabled: formData.isEnabled,
      isPriceChangeAllowed: formData.isPriceChangeAllowed,
      imageUrl: imagePreview || null
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: productData });
    } else {
      createMutation.mutate(productData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('confirmDelete'))) {
      deleteMutation.mutate(id);
    }
  };

  const startInlineEdit = (product: Product) => {
    setEditingRowId(product.id);
    setEditingValues({
      name: product.name,
      code: product.code || '',
      price: product.price.toString(),
      cost: product.cost.toString(),
    });
  };

  const cancelInlineEdit = () => {
    setEditingRowId(null);
    setEditingValues({ name: '', code: '', price: '', cost: '' });
  };

  const saveInlineEdit = (product: Product) => {
    const updatedData = {
      name: editingValues.name,
      code: editingValues.code || null,
      description: product.description,
      price: parseFloat(editingValues.price),
      cost: parseFloat(editingValues.cost),
      stock: product.stock,
      isService: product.isService,
      isEnabled: product.isEnabled,
      isPriceChangeAllowed: product.isPriceChangeAllowed,
      imageUrl: product.imageUrl || null
    };
    
    updateMutation.mutate({ id: product.id, data: updatedData });
    setEditingRowId(null);
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if exactly one product is selected
    if (selectedProducts.length !== 1) {
      alert(t('selectOneProductForImageUpload'));
      if (bulkUploadInputRef.current) {
        bulkUploadInputRef.current.value = '';
      }
      return;
    }

    // Read the image file and convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      
      // Find the selected product
      const product = productsList.find((p: Product) => p.id === selectedProducts[0]);
      if (!product) return;

      // Update the product with the new image
      const updatedData = {
        name: product.name,
        code: product.code || null,
        description: product.description,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        isService: product.isService,
        isEnabled: product.isEnabled,
        isPriceChangeAllowed: product.isPriceChangeAllowed,
        imageUrl: imageUrl
      };

      updateMutation.mutate({ id: product.id, data: updatedData });
      clearSelection();
    };

    reader.readAsDataURL(file);
    
    // Reset the input
    if (bulkUploadInputRef.current) {
      bulkUploadInputRef.current.value = '';
    }
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Search and Add Button */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('products')}</h1>
            <p className="text-slate-600">{t('manageProducts')}</p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'card'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('searchProducts')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-80 ps-10 pe-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
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

        {/* Products View */}
        <div className={`flex-1 ${viewMode === 'card' ? 'bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col' : 'overflow-hidden flex flex-col'}`}>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center bg-white rounded-lg">
              <p className="text-slate-500">{t('loading')}...</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 border border-slate-200/60 rounded-lg bg-white">
              {/* Product Rows */}
              {productsList && productsList.length > 0 ? (
                productsList.map((product: Product) => {
                  const isEditing = editingRowId === product.id;
                  return (
                    <div
                      key={product.id}
                      onClick={() => toggleSelectProduct(product.id)}
                      className={`bg-white rounded-lg shadow-sm border px-4 py-3 hover:shadow-md transition-all cursor-pointer ${
                        selectedProducts.includes(product.id)
                          ? 'border-amber-500 ring-2 ring-amber-500/20'
                          : 'border-slate-200/60 hover:border-slate-300/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <div className="w-12 flex items-center justify-center">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectProduct(product.id);
                            }}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                              selectedProducts.includes(product.id)
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {selectedProducts.includes(product.id) && (
                              <CheckSquare className="w-4 h-4" />
                            )}
                          </div>
                        </div>

                        {/* Image */}
                        <div className="w-10">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded-lg shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('name')}</p>
                              <input
                                type="text"
                                value={editingValues.name}
                                onChange={(e) => setEditingValues({ ...editingValues, name: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:ring-2 focus:ring-amber-500/50 outline-none"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('name')}</p>
                              <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
                              {product.code && (
                                <p className="text-xs text-slate-400 mt-0.5">{product.code}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Price */}
                        <div className="w-28">
                          {isEditing ? (
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('price')}</p>
                              <input
                                type="number"
                                step="0.01"
                                value={editingValues.price}
                                onChange={(e) => setEditingValues({ ...editingValues, price: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:ring-2 focus:ring-amber-500/50 outline-none"
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('price')}</p>
                              <span className="text-sm font-semibold text-amber-600">
                                {(product.price || 0).toFixed(2)} {t('currency')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Cost */}
                        <div className="w-28">
                          {isEditing ? (
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('cost')}</p>
                              <input
                                type="number"
                                step="0.01"
                                value={editingValues.cost}
                                onChange={(e) => setEditingValues({ ...editingValues, cost: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:ring-2 focus:ring-amber-500/50 outline-none"
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('cost')}</p>
                              <span className="text-sm text-slate-600">
                                {(product.cost || 0).toFixed(2)} {t('currency')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Stock */}
                        <div className="w-20 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('stock')}</p>
                          <span className="text-sm text-slate-700 font-medium">
                            {product.stock !== null && product.stock !== undefined ? product.stock : '-'}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="w-24 flex flex-col items-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('status')}</p>
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            product.isEnabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.isEnabled ? t('active') : t('inactive')}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="w-16 flex justify-center">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveInlineEdit(product);
                                }}
                                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                                title={t('save')}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelInlineEdit();
                                }}
                                className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title={t('cancel')}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startInlineEdit(product);
                              }}
                              className="p-1.5 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
                              title={t('edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-12 text-center text-slate-500">
                  {t('noProductsFound')}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                {productsList && productsList.length > 0 ? (
                  productsList.map((product: Product) => (
                    <div
                      key={product.id}
                      onClick={() => toggleSelectProduct(product.id)}
                      className={`relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${
                        selectedProducts.includes(product.id)
                          ? 'border-amber-500 ring-2 ring-amber-500/20'
                          : 'border-slate-200/60 hover:border-slate-300/60'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <div
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedProducts.includes(product.id)
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {selectedProducts.includes(product.id) && (
                            <CheckSquare className="w-4 h-4" />
                          )}
                        </div>
                      </div>

                      {/* Product Image */}
                      <div className="relative h-32 overflow-hidden rounded-t-xl">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover opacity-90 drop-shadow-lg hover:scale-105 hover:opacity-100 transition-all duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                            <Package className="w-16 h-16 text-slate-300" />
                          </div>
                        )}
                        {/* Status Badge */}
                        <div className="absolute top-1.5 right-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold shadow-md ${
                            product.isEnabled
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                          }`}>
                            {product.isEnabled ? t('active') : t('inactive')}
                          </span>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-2 space-y-1">
                        <div className="pb-1">
                          {editingRowId === product.id ? (
                            <input
                              type="text"
                              value={editingValues.name}
                              onChange={(e) => setEditingValues({ ...editingValues, name: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-1.5 py-0.5 text-[10px] border border-amber-400 rounded focus:ring-1 focus:ring-amber-500/50 outline-none"
                              autoFocus
                            />
                          ) : (
                            <h3 className="text-[10px] font-bold text-slate-800 truncate leading-tight pb-1" title={product.name}>
                              {product.name}
                            </h3>
                          )}
                          {product.code && (
                            <p className="text-[9px] text-slate-400 mt-0.5 px-0.5">{t('code')}: {product.code}</p>
                          )}
                        </div>

                        {product.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-2 min-h-[2rem]" title={product.description}>
                            {product.description}
                          </p>
                        )}

                        {/* Price & Cost */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <div className="flex-1">
                            <p className="text-[8px] text-slate-500 uppercase tracking-wide">{t('price')}</p>
                            {editingRowId === product.id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editingValues.price}
                                onChange={(e) => setEditingValues({ ...editingValues, price: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-1.5 py-0.5 text-xs border border-amber-400 rounded focus:ring-1 focus:ring-amber-500/50 outline-none"
                              />
                            ) : (
                              <p className="text-xs font-bold text-amber-600">
                                {(product.price || 0).toFixed(2)} <span className="text-[8px]">{t('currency')}</span>
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-1">
                            <p className="text-[8px] text-slate-500 uppercase tracking-wide">{t('cost')}</p>
                            {editingRowId === product.id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editingValues.cost}
                                onChange={(e) => setEditingValues({ ...editingValues, cost: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-1.5 py-0.5 text-[9px] border border-amber-400 rounded focus:ring-1 focus:ring-amber-500/50 outline-none"
                              />
                            ) : (
                              <p className="text-[9px] text-slate-600">
                                {(product.cost || 0).toFixed(2)} {t('currency')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stock */}
                        {!product.isService && (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">{t('stock')}:</span>
                            <span className="font-semibold text-slate-700">
                              {product.stock !== null && product.stock !== undefined ? product.stock : '-'}
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 pt-1 border-t border-slate-100">
                          {editingRowId === product.id ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveInlineEdit(product);
                                }}
                                className="flex-1 px-1.5 py-0.5 text-[9px] text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors flex items-center justify-center gap-0.5"
                              >
                                <Check className="w-2.5 h-2.5" />
                                {t('save')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelInlineEdit();
                                }}
                                className="px-1.5 py-0.5 text-[9px] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startInlineEdit(product);
                              }}
                              className="flex-1 px-1.5 py-0.5 text-[9px] text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-colors flex items-center justify-center gap-0.5"
                            >
                              <Edit className="w-2.5 h-2.5" />
                              {t('edit')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <p className="text-slate-500">{t('noProductsFound')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Old Table View - Hidden */}
          {false && (
            <>
          <div className="overflow-x-auto flex-shrink-0 hidden">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-20" />
                <col className="w-auto" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-36" />
              </colgroup>
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
            </table>
          </div>

          {/* Table Body - Scrollable */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-20" />
                <col className="w-auto" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-36" />
              </colgroup>
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      {t('loading')}...
                    </td>
                  </tr>
                ) : productsList && productsList.length > 0 ? (
                  productsList.map((product: Product) => {
                    const isEditing = editingRowId === product.id;
                    
                    return (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValues.name}
                              onChange={(e) => setEditingValues({ ...editingValues, name: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-primary rounded focus:ring-2 focus:ring-primary/50 outline-none"
                              autoFocus
                            />
                          ) : (
                            <div>
                              <div className="text-sm font-medium text-slate-900">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-slate-500 truncate max-w-xs">{product.description}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValues.code}
                              onChange={(e) => setEditingValues({ ...editingValues, code: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-primary rounded focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                          ) : (
                            <span className="text-sm text-slate-500">{product.code || '-'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editingValues.price}
                              onChange={(e) => setEditingValues({ ...editingValues, price: e.target.value })}
                              className="w-24 px-2 py-1 text-sm border border-primary rounded focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                          ) : (
                            <span className="text-sm font-medium text-slate-900">
                              {(product.price || 0).toFixed(2)} {t('currency')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editingValues.cost}
                              onChange={(e) => setEditingValues({ ...editingValues, cost: e.target.value })}
                              className="w-24 px-2 py-1 text-sm border border-primary rounded focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                          ) : (
                            <span className="text-sm text-slate-500">
                              {(product.cost || 0).toFixed(2)} {t('currency')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {product.stock !== null && product.stock !== undefined ? product.stock : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            product.isEnabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.isEnabled ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => saveInlineEdit(product)}
                                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                title={t('save')}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelInlineEdit}
                                className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                                title={t('cancel')}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startInlineEdit(product)}
                                className="p-1.5 text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-colors"
                                title={t('edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenModal(product)}
                                className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                                title={t('details')}
                              >
                                <Package className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title={t('delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
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
          
          {/* Pagination - Fixed at bottom */}
          {productsList && productsList.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Page info and size selector */}
                <div className="flex items-center gap-4">
                  <p className="text-sm text-slate-600">
                    {t('showing')} <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> {t('to')}{' '}
                    <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> {t('of')}{' '}
                    <span className="font-medium">{totalCount}</span> {t('results')}
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">{t('perPage')}:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                    >
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                      <option value={96}>96</option>
                    </select>
                  </div>
                </div>

                {/* Pagination buttons */}
                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={!hasPrevPage}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('previous')}
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {totalPages <= 7 ? (
                      // Show all pages if 7 or less
                      Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))
                    ) : (
                      // Show smart pagination for more than 7 pages
                      <>
                        {/* First page */}
                        <button
                          onClick={() => setCurrentPage(1)}
                          className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === 1
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          1
                        </button>
                        
                        {/* Left ellipsis */}
                        {currentPage > 3 && (
                          <span className="px-2 text-slate-500">...</span>
                        )}
                        
                        {/* Middle pages */}
                        {Array.from({ length: 5 }, (_, i) => {
                          let pageNum;
                          if (currentPage <= 3) {
                            pageNum = i + 2;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 5 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          if (pageNum > 1 && pageNum < totalPages) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                  currentPage === pageNum
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        }).filter(Boolean)}
                        
                        {/* Right ellipsis */}
                        {currentPage < totalPages - 2 && (
                          <span className="px-2 text-slate-500">...</span>
                        )}
                        
                        {/* Last page */}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === totalPages
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={!hasNextPage}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('next')}
                  </button>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Hidden File Input for Bulk Upload */}
      <input
        ref={bulkUploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleBulkUpload}
        className="hidden"
      />

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedProducts.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={selectedProducts.length === productsList.length}
        totalCount={productsList.length}
        actions={[
          ...(selectedProducts.length === 1 ? [
            {
              id: 'upload',
              label: t('importFile'),
              icon: <Upload className="w-3.5 h-3.5" />,
              onClick: () => bulkUploadInputRef.current?.click(),
              variant: 'secondary' as const,
            },
            {
              id: 'view',
              label: t('details'),
              icon: <Package className="w-3.5 h-3.5" />,
              onClick: () => {
                const product = productsList.find((p: Product) => p.id === selectedProducts[0]);
                if (product) handleOpenModal(product);
              },
              variant: 'secondary' as const,
            },
            {
              id: 'toggle-price-change',
              label: (() => {
                const product = productsList.find((p: Product) => p.id === selectedProducts[0]);
                return product?.isPriceChangeAllowed ? t('lockPriceChange') : t('allowPriceChange');
              })(),
              icon: (() => {
                const product = productsList.find((p: Product) => p.id === selectedProducts[0]);
                return product?.isPriceChangeAllowed ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />;
              })(),
              onClick: handleTogglePriceChangeAllowed,
              variant: 'secondary' as const,
            },
            {
              id: 'toggle-status',
              label: (() => {
                const product = productsList.find((p: Product) => p.id === selectedProducts[0]);
                return product?.isEnabled ? t('disable') : t('enable');
              })(),
              icon: (() => {
                const product = productsList.find((p: Product) => p.id === selectedProducts[0]);
                return product?.isEnabled ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />;
              })(),
              onClick: () => {
                const product = productsList.find((p: Product) => p.id === selectedProducts[0]);
                if (product?.isEnabled) {
                  handleBulkDisable();
                } else {
                  handleBulkEnable();
                }
              },
              variant: 'primary' as const,
            },
          ] : []),
          {
            id: 'delete',
            label: t('delete'),
            icon: <Trash2 className="w-3.5 h-3.5" />,
            onClick: handleBulkDelete,
            variant: 'danger' as const,
          },
        ]}
      />

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-slate-200">
              <button
                onClick={handleCloseModal}
                className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center shadow-sm transition-all z-10"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 pr-12">
                {editingProduct ? t('editProduct') : t('addProduct')}
              </h2>
            </div>

            {/* Form - Scrollable Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                          setFormData({ ...formData, imageUrl: '' });
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
                      {t('imageDescription')}
                    </p>
                  </div>
                </div>
                {/* Or paste image URL */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('orImageUrl')}
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, imageUrl: e.target.value });
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
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
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
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
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isService}
                    onChange={(e) => setFormData({ ...formData, isService: e.target.checked })}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">{t('isService')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">{t('isEnabled')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPriceChangeAllowed}
                    onChange={(e) => setFormData({ ...formData, isPriceChangeAllowed: e.target.checked })}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">{t('isPriceChangeAllowed')}</span>
                </label>
              </div>
              </div>

              {/* Actions - Fixed Footer */}
              <div className="flex-shrink-0 flex justify-end gap-3 p-6 pt-4 border-t border-slate-200 bg-slate-50">
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
    </AdminLayout>
  );
}
