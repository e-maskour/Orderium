import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../modules/products';
import { categoriesService } from '../modules/categories';
import type { IProduct } from '../modules/products/products.interface';
import { Plus, Eye, Trash2, Search, Package, Grid3x3, List, X, Filter, ChevronDown, ChevronLeft, ChevronRight, Download, Upload, FileSpreadsheet, CheckSquare } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { toastExported, toastImported, toastError, toastWarning, toastInfo, toastConfirm } from '../services/toast.service';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { NativeSelect } from '../components/ui/native-select';

export default function Products() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get API base URL from environment or use window origin
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  // Helper to convert relative image paths to full URLs
  const getImageUrl = (imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;
    if (imageUrl.startsWith('http')) return imageUrl; // Already full URL
    if (imageUrl.startsWith('orderium/')) {
      // Cloudinary
      return `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/${imageUrl}`;
    }
    // Relative path - add API base URL
    return `${apiBaseUrl}/uploads/images/${imageUrl}`;
  };

  const [searchTerm, setSearchTerm] = useState(''); // Keep for potential future use
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Filter states
  const [nameFilter, setNameFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'negative' | 'zero' | 'positive'>('all');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isServiceFilter, setIsServiceFilter] = useState<boolean | undefined>(undefined);

  // Applied filters - only these trigger API requests
  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    code: '',
    stockFilter: undefined as 'negative' | 'zero' | 'positive' | undefined,
    categoryIds: [] as number[],
    isService: undefined as boolean | undefined,
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getAll(),
  });

  const categoriesList = (categories as any)?.categories || categories || [];

  // Fetch products with applied filters
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', appliedFilters, currentPage, pageSize],
    queryFn: () => productsService.getProducts({
      search: appliedFilters.name,
      code: appliedFilters.code,
      stockFilter: appliedFilters.stockFilter,
      categoryIds: appliedFilters.categoryIds,
      isService: appliedFilters.isService,
      page: currentPage,
      limit: pageSize
    }),
  });

  const productsList = products?.products || [];
  const pagination = products?.pagination || {
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    page: currentPage,
    limit: pageSize,
  };
  const totalCount = pagination.total;
  const totalPages = pagination.totalPages;
  const hasNextPage = pagination.hasNext;
  const hasPrevPage = pagination.hasPrev;

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toastError(t('deleteError'), { description: error.message });
    },
  });

  const toggleSelectProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === productsList.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(productsList.map((p: IProduct) => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedProducts([]);
  };

  const handleBulkDelete = () => {
    toastConfirm(
      t('deleteProducts'),
      async () => {
        let hasErrors = false;
        for (const id of selectedProducts) {
          try {
            await productsService.deleteProduct(id);
          } catch (error: any) {
            hasErrors = true;
            toastError(t('deleteError'), { description: error.message });
            break;
          }
        }
        if (!hasErrors) {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          clearSelection();
        }
      },
      { description: t('confirmBulkDelete').replace('{{count}}', String(selectedProducts.length)), confirmLabel: t('delete') },
    );
  };

  const handleViewProduct = (id: number) => {
    navigate(`/products/${id}`);
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      name: nameFilter,
      code: codeFilter,
      stockFilter: stockFilter === 'all' ? undefined : stockFilter,
      categoryIds: selectedCategories,
      isService: isServiceFilter,
    });
    setCurrentPage(1);
    setFiltersExpanded(false);
  };

  const handleClearFilters = () => {
    setNameFilter('');
    setCodeFilter('');
    setStockFilter('all');
    setSelectedCategories([]);
    setIsServiceFilter(undefined);
    setAppliedFilters({
      name: '',
      code: '',
      stockFilter: undefined,
      categoryIds: [],
      isService: undefined,
    });
    setCurrentPage(1);
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const activeFiltersCount = [
    appliedFilters.name,
    appliedFilters.code,
    appliedFilters.stockFilter,
    appliedFilters.categoryIds.length > 0,
    appliedFilters.isService !== undefined,
  ].filter(Boolean).length;

  // Export to XLSX
  const handleExport = async () => {
    try {
      const blob = await productsService.exportToXlsx();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produits-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toastExported(t('exportSuccess'));
    } catch (error) {
      toastError(t('exportError'));
      console.error(error);
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const blob = await productsService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-produits.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toastExported(t('templateDownloaded'));
    } catch (error) {
      toastError(t('templateDownloadError'));
      console.error(error);
    }
  };

  // Import from XLSX

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        toastInfo(t('importInProgress'));
        const result = await productsService.importFromXlsx(file);

        if (result.success) {
          toastImported(
            t('importSuccess').replace('{{created}}', String(result.imported)).replace('{{updated}}', String(result.updated))
          );
          queryClient.invalidateQueries({ queryKey: ['products'] });
        } else {
          toastWarning(
            t('importPartial').replace('{{created}}', String(result.imported)).replace('{{updated}}', String(result.updated)).replace('{{failed}}', String(result.failed))
          );
          if (result.errors.length > 0) {
            console.error('Import errors:', result.errors);
          }
        }
      } catch (error: any) {
        toastError(`${t('importError')}: ${error.message}`);
        console.error(error);
      }
    };
    input.click();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col max-w-7xl mx-auto">
        {/* Page Header */}
        <div>
          <PageHeader icon={Package} title={t('products')} subtitle={t('manageProducts')} />
        </div>

        {/* Toolbar: Search, View Toggle, Add Button */}
        <div className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'card'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 flex-1 sm:flex-none w-full sm:w-auto justify-end">
            {/* Filters Button */}
            <button
              onClick={() => setFiltersExpanded(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium text-slate-700"
            >
              <Filter className="w-5 h-5" />
              {t('filters')}
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Import/Export Buttons */}
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium text-slate-700"
              title="Télécharger le modèle"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium text-slate-700"
              title="Importer"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium text-slate-700"
              title="Exporter"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Add Product Button */}
            <Button
              onClick={() => navigate('/products/create')}
              leadingIcon={Plus}
            >
              {t('addProduct')}
            </Button>
          </div>
        </div>

        {/* Pagination Info Bar - Top */}
        {productsList && productsList.length > 0 && (
          <div className="bg-slate-50 py-2 px-1">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-slate-600">
                {t('showing')} <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> {t('to')}{' '}
                <span className="font-semibold">{Math.min(currentPage * pageSize, totalCount)}</span> {t('of')} <span className="font-semibold">{totalCount}</span> {t('results')}
              </div>

              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">{t('perPage')}</label>
                <NativeSelect
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  selectSize="sm"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </NativeSelect>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value, 10);
                      if (!isNaN(page) && page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    inputSize="sm"
                    className="w-12 text-center"
                    aria-label="Page number"
                  />
                  <span className="text-sm text-slate-500">/</span>
                  <span className="text-sm font-medium text-slate-700">{totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products View */}
        <div className="flex flex-col">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-slate-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 bg-slate-200 rounded" />
                      <div className="h-3 w-24 bg-slate-200 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-slate-200 rounded-full" />
                    <div className="h-4 w-20 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2">
              {/* Product Rows */}
              {productsList && productsList.length > 0 ? (
                productsList.map((product: IProduct) => (
                  <div
                    key={product.id}
                    onClick={() => handleViewProduct(product.id)}
                    className={`bg-white rounded-lg shadow-sm border px-4 py-3 hover:shadow-md transition-all cursor-pointer ${selectedProducts.includes(product.id)
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
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${selectedProducts.includes(product.id)
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-slate-300'
                            }`}
                        >
                          {selectedProducts.includes(product.id) && <CheckSquare className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Image */}
                      <div className="w-10">
                        {product.imageUrl ? (
                          <img
                            src={getImageUrl(product.imageUrl)}
                            alt={product.name}
                            className="w-10 h-10 object-contain rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('name')}</p>
                        <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
                        {product.code && <p className="text-xs text-slate-400 mt-0.5">{product.code}</p>}
                      </div>

                      {/* Price */}
                      <div className="w-28">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('price')}</p>
                        <span className="text-sm font-semibold text-amber-600">
                          {(product.price || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                        </span>
                      </div>

                      {/* Cost */}
                      <div className="w-28">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('cost')}</p>
                        <span className="text-sm text-slate-600">
                          {(product.cost || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                        </span>
                      </div>

                      {/* Stock */}
                      <div className="w-24 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('stock')}</p>
                        <span className="text-sm text-slate-700 font-medium">
                          {product.stock !== null && product.stock !== undefined
                            ? `${product.stock} ${t('per')} ${(product as any).saleUnitOfMeasure?.code || t('unit')}`
                            : '-'}
                        </span>
                      </div>

                      {/* Status */}
                      {/* <div className="w-24 flex flex-col items-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{t('status')}</p>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            product.isEnabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.isEnabled ? t('active') : t('inactive')}
                        </span>
                      </div> */}

                      {/* Actions */}
                      {/* <div className="w-16 flex justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProduct(product.id);
                          }}
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                          title={t('view')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div> */}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full"></div>
                    <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border-2 border-amber-100">
                      <Package className="w-16 h-16 text-amber-500 mx-auto" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-slate-800">{t('noProductsFound')}</h3>
                  <p className="mt-2 text-sm text-slate-500 max-w-sm text-center">
                    {activeFiltersCount > 0
                      ? "Aucun produit ne correspond à vos critères de recherche. Essayez de modifier les filtres."
                      : "Commencez par ajouter votre premier produit pour le voir apparaître ici."}
                  </p>
                  {activeFiltersCount > 0 ? (
                    <Button
                      onClick={handleClearFilters}
                      className="mt-6"
                    >
                      Réinitialiser les filtres
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate('/products/create')}
                      className="mt-6"
                      leadingIcon={Plus}
                    >
                      Ajouter un produit
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="grid gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                {productsList && productsList.length > 0 ? (
                  productsList.map((product: IProduct) => (
                    <div
                      key={product.id}
                      onClick={() => handleViewProduct(product.id)}
                      className={`relative bg-white rounded-lg sm:rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${selectedProducts.includes(product.id)
                        ? 'border-amber-500 ring-2 ring-amber-500/20'
                        : 'border-slate-200/60 hover:border-slate-300/60'
                        }`}
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectProduct(product.id);
                          }}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${selectedProducts.includes(product.id)
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-slate-300'
                            }`}
                        >
                          {selectedProducts.includes(product.id) && <CheckSquare className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Product Image */}
                      <div className="relative h-32 overflow-hidden rounded-t-xl">
                        {product.imageUrl ? (
                          <img
                            src={getImageUrl(product.imageUrl)}
                            alt={product.name}
                            className="w-full h-full object-contain opacity-90 drop-shadow-lg hover:scale-105 hover:opacity-100 transition-all duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                            <Package className="w-16 h-16 text-slate-300" />
                          </div>
                        )}
                        {/* Status Badge */}
                        {/* <div className="absolute top-1.5 right-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-semibold shadow-md ${
                              product.isEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}
                          >
                            {product.isEnabled ? t('active') : t('inactive')}
                          </span>
                        </div> */}
                      </div>

                      {/* Product Info */}
                      <div className="p-2 space-y-1">
                        <div className="pb-1">
                          <h3 className="text-[10px] font-bold text-slate-800 truncate leading-tight pb-1" title={product.name}>
                            {product.name}
                          </h3>
                          {product.code && (
                            <p className="text-[9px] text-slate-400 mt-0.5 px-0.5">
                              {t('code')}: {product.code}
                            </p>
                          )}
                        </div>

                        {/* {product.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-2 min-h-[2rem]" title={product.description}>
                            {product.description}
                          </p>
                        )} */}

                        {/* Price & Cost */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <div className="flex-1">
                            <p className="text-[8px] text-slate-500 uppercase tracking-wide">{t('price')}</p>
                            <p className="text-xs font-bold text-amber-600">
                              {(product.price || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                              <span className="text-[8px]">{t('currency')}</span>
                            </p>
                          </div>
                          <div className="text-right flex-1">
                            <p className="text-[8px] text-slate-500 uppercase tracking-wide">{t('cost')}</p>
                            <p className="text-[9px] text-slate-600">
                              {(product.cost || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                            </p>
                          </div>
                        </div>

                        {/* Stock */}
                        {!product.isService && (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">{t('stock')}:</span>
                            <span className="font-semibold text-slate-700">
                              {product.stock !== null && product.stock !== undefined
                                ? `${product.stock} ${t('per')} ${(product as any).saleUnitOfMeasure?.code || t('unit')}`
                                : '-'}
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        {/* <div className="flex items-center gap-0.5 pt-1 border-t border-slate-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewProduct(product.id);
                            }}
                            className="flex-1 px-1.5 py-0.5 text-[9px] text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors flex items-center justify-center gap-0.5"
                          >
                            <Eye className="w-2.5 h-2.5" />
                            {t('view')}
                          </button>
                        </div> */}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 px-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full"></div>
                      <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border-2 border-amber-100">
                        <Package className="w-16 h-16 text-amber-500 mx-auto" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-slate-800">{t('noProductsFound')}</h3>
                    <p className="mt-2 text-sm text-slate-500 max-w-sm text-center">
                      {activeFiltersCount > 0
                        ? "Aucun produit ne correspond à vos critères de recherche. Essayez de modifier les filtres."
                        : "Commencez par ajouter votre premier produit pour le voir apparaître ici."}
                    </p>
                    {activeFiltersCount > 0 ? (
                      <Button
                        onClick={handleClearFilters}
                        className="mt-6"
                      >
                        Réinitialiser les filtres
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigate('/products/create')}
                        className="mt-6"
                        leadingIcon={Plus}
                      >
                        Ajouter un produit
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedProducts.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={selectedProducts.length === productsList.length}
        totalCount={productsList.length}
        actions={[
          ...(selectedProducts.length === 1
            ? [
              {
                id: 'view',
                label: t('details'),
                icon: <Eye className="w-3.5 h-3.5" />,
                onClick: () => handleViewProduct(selectedProducts[0]),
                variant: 'secondary' as const,
              },
            ]
            : []),
          {
            id: 'delete',
            label: t('delete'),
            icon: <Trash2 className="w-3.5 h-3.5" />,
            onClick: handleBulkDelete,
            variant: 'danger' as const,
          },
        ]}
      />



      {/* Filters Overlay Panel */}
      {filtersExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setFiltersExpanded(false)}
          />

          {/* Slide-in Panel */}
          <div className="fixed inset-y-0 end-0 w-full sm:w-[520px] md:w-[560px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-amber-600">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">{t('filters')}</h2>
                {activeFiltersCount > 0 && (
                  <span className="bg-white text-amber-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setFiltersExpanded(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Search Filters Section */}
              <div className="pb-6 border-b border-slate-200">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 block">
                  {t('search')}
                </label>

                <div className="grid grid-cols-1 gap-4">
                  {/* Name Filter */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-2 block">
                      {t('name')}
                    </label>
                    <Input
                      type="text"
                      value={nameFilter}
                      onChange={(e) => setNameFilter(e.target.value)}
                      placeholder={t('search')}
                      fullWidth
                    />
                  </div>

                  {/* Code Filter */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-2 block">
                      {t('code')}
                    </label>
                    <Input
                      type="text"
                      value={codeFilter}
                      onChange={(e) => setCodeFilter(e.target.value)}
                      placeholder={t('search')}
                      fullWidth
                    />
                  </div>
                </div>
              </div>

              {/* Stock Filter */}
              <div className="pb-6 border-b border-slate-200">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 block">
                  {t('stock')}
                </label>
                <NativeSelect
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as 'all' | 'negative' | 'zero' | 'positive')}
                >
                  <option value="all">{t('all')}</option>
                  <option value="negative">Negative Stock</option>
                  <option value="zero">Zero Stock</option>
                  <option value="positive">Positive Stock</option>
                </NativeSelect>
              </div>

              {/* Category Filter */}
              <div className="pb-6 border-b border-slate-200">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 block">
                  {t('categories')}
                </label>
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                  {categoriesList.length > 0 ? (
                    categoriesList.map((category: any) => (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${selectedCategories.includes(category.id)
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <span>{category.name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No categories available</p>
                  )}
                </div>
              </div>

              {/* Is Service Filter */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 block">
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: undefined, label: t('all') },
                    { key: true, label: 'Service' },
                    { key: false, label: t('product') }
                  ].map((filter) => (
                    <button
                      key={String(filter.key)}
                      onClick={() => setIsServiceFilter(filter.key as boolean | undefined)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isServiceFilter === filter.key
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <span>{filter.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex gap-3">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex-1"
              >
                {t('reset')}
              </Button>
              <Button
                onClick={handleApplyFilters}
                className="flex-1"
              >
                {t('apply')}
              </Button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
