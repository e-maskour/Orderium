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
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';

export default function Products() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  const getImageUrl = (imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('orderium/')) {
      return `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/${imageUrl}`;
    }
    return `${apiBaseUrl}/uploads/images/${imageUrl}`;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [nameFilter, setNameFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'negative' | 'zero' | 'positive'>('all');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isServiceFilter, setIsServiceFilter] = useState<boolean | undefined>(undefined);

  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    code: '',
    stockFilter: undefined as 'negative' | 'zero' | 'positive' | undefined,
    categoryIds: [] as number[],
    isService: undefined as boolean | undefined,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getAll(),
  });

  const categoriesList = (categories as any)?.categories || categories || [];

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

  const pageSizeOptions = [
    { label: '10', value: 10 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
    { label: '500', value: 500 },
    { label: '1000', value: 1000 },
  ];

  const stockFilterOptions = [
    { label: t('all'), value: 'all' },
    { label: 'Negative Stock', value: 'negative' },
    { label: 'Zero Stock', value: 'zero' },
    { label: 'Positive Stock', value: 'positive' },
  ];

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '80rem', margin: '0 auto' }}>
        {/* Page Header */}
        <div>
          <PageHeader icon={Package} title={t('products')} subtitle={t('manageProducts')} />
        </div>

        {/* Toolbar */}
        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', padding: '0.25rem' }}>
            <button
              onClick={() => setViewMode('card')}
              style={{
                paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem',
                borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer',
                ...(viewMode === 'card'
                  ? { backgroundColor: 'white', color: '#0f172a', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                  : { backgroundColor: 'transparent', color: '#475569' }),
              }}
            >
              <Grid3x3 style={{ width: '1rem', height: '1rem' }} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem',
                borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer',
                ...(viewMode === 'list'
                  ? { backgroundColor: 'white', color: '#0f172a', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                  : { backgroundColor: 'transparent', color: '#475569' }),
              }}
            >
              <List style={{ width: '1rem', height: '1rem' }} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'flex-end' }}>
            {/* Filters Button */}
            <button
              onClick={() => setFiltersExpanded(true)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.625rem', paddingBottom: '0.625rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', cursor: 'pointer' }}
            >
              <Filter style={{ width: '1.25rem', height: '1.25rem' }} />
              {t('filters')}
              {activeFiltersCount > 0 && (
                <span style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem', backgroundColor: '#f59e0b', color: 'white', fontSize: '0.75rem', fontWeight: 700, borderRadius: '9999px', width: '1.25rem', height: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Import/Export Buttons */}
            <button
              onClick={handleDownloadTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', cursor: 'pointer' }}
              title="Télécharger le modèle"
            >
              <FileSpreadsheet style={{ width: '1rem', height: '1rem' }} />
            </button>
            <button
              onClick={handleImport}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', cursor: 'pointer' }}
              title="Importer"
            >
              <Upload style={{ width: '1rem', height: '1rem' }} />
            </button>
            <button
              onClick={handleExport}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', cursor: 'pointer' }}
              title="Exporter"
            >
              <Download style={{ width: '1rem', height: '1rem' }} />
            </button>

            {/* Add Product Button */}
            <Button
              onClick={() => navigate('/products/create')}
              icon={<Plus style={{ width: '1rem', height: '1rem' }} />}
              label={t('addProduct')}
            />
          </div>
        </div>

        {/* Pagination Info Bar - Top */}
        {productsList && productsList.length > 0 && (
          <div style={{ backgroundColor: '#f8fafc', paddingTop: '0.5rem', paddingBottom: '0.5rem', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                {t('showing')} <span style={{ fontWeight: 600 }}>{(currentPage - 1) * pageSize + 1}</span> {t('to')}{' '}
                <span style={{ fontWeight: 600 }}>{Math.min(currentPage * pageSize, totalCount)}</span> {t('of')} <span style={{ fontWeight: 600 }}>{totalCount}</span> {t('results')}
              </div>

              {/* Page Size Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569' }}>{t('perPage')}</label>
                <Dropdown
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.value));
                    setCurrentPage(1);
                  }}
                  options={pageSizeOptions}
                  optionLabel="label"
                  optionValue="value"
                />
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, backgroundColor: 'white' }}
                >
                  <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <InputText
                    type="number"
                    min={1}
                    max={totalPages}
                    value={String(currentPage)}
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
                    style={{ width: '3rem', textAlign: 'center' }}
                    aria-label="Page number"
                  />
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>/</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>{totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, backgroundColor: 'white' }}
                >
                  <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products View */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {isLoading ? (
            <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ height: '3rem', width: '3rem', backgroundColor: '#e2e8f0', borderRadius: '0.5rem' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ height: '1rem', width: '10rem', backgroundColor: '#e2e8f0', borderRadius: '0.25rem' }} />
                      <div style={{ height: '0.75rem', width: '6rem', backgroundColor: '#e2e8f0', borderRadius: '0.25rem' }} />
                    </div>
                    <div style={{ height: '1.5rem', width: '4rem', backgroundColor: '#e2e8f0', borderRadius: '9999px' }} />
                    <div style={{ height: '1rem', width: '5rem', backgroundColor: '#e2e8f0', borderRadius: '0.25rem' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {productsList && productsList.length > 0 ? (
                productsList.map((product: IProduct) => (
                  <div
                    key={product.id}
                    onClick={() => handleViewProduct(product.id)}
                    style={{
                      backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', cursor: 'pointer',
                      ...(selectedProducts.includes(product.id)
                        ? { border: '1px solid #f59e0b', outline: '2px solid rgba(245,158,11,0.2)' }
                        : { border: '1px solid rgba(226,232,240,0.6)' }),
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Checkbox */}
                      <div style={{ width: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectProduct(product.id);
                          }}
                          style={{
                            width: '1.5rem', height: '1.5rem', borderRadius: '0.375rem', borderWidth: '2px', borderStyle: 'solid',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            ...(selectedProducts.includes(product.id)
                              ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: 'white' }
                              : { backgroundColor: 'white', borderColor: '#cbd5e1' }),
                          }}
                        >
                          {selectedProducts.includes(product.id) && <CheckSquare style={{ width: '1rem', height: '1rem' }} />}
                        </div>
                      </div>

                      {/* Image */}
                      <div style={{ width: '2.5rem' }}>
                        {product.imageUrl ? (
                          <img
                            src={getImageUrl(product.imageUrl)}
                            alt={product.name}
                            style={{ width: '2.5rem', height: '2.5rem', objectFit: 'contain', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                          />
                        ) : (
                          <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(to bottom right, #f1f5f9, #e2e8f0)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package style={{ width: '1.25rem', height: '1.25rem', color: '#94a3b8' }} />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('name')}</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                        {product.code && <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem' }}>{product.code}</p>}
                      </div>

                      {/* Price */}
                      <div style={{ width: '7rem' }}>
                        <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('price')}</p>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#d97706' }}>
                          {(product.price || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                        </span>
                      </div>

                      {/* Cost */}
                      <div style={{ width: '7rem' }}>
                        <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('cost')}</p>
                        <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                          {(product.cost || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                        </span>
                      </div>

                      {/* Stock */}
                      <div style={{ width: '6rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('stock')}</p>
                        <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
                          {product.stock !== null && product.stock !== undefined
                            ? `${product.stock} ${t('per')} ${(product as any).saleUnitOfMeasure?.code || t('unit')}`
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '5rem', paddingBottom: '5rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative', background: 'linear-gradient(to bottom right, #fffbeb, #fff7ed)', borderRadius: '1rem', padding: '2rem', border: '2px solid #fef3c7' }}>
                      <Package style={{ width: '4rem', height: '4rem', color: '#f59e0b', margin: '0 auto' }} strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 style={{ marginTop: '1.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{t('noProductsFound')}</h3>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b', maxWidth: '24rem', textAlign: 'center' }}>
                    {activeFiltersCount > 0
                      ? "Aucun produit ne correspond à vos critères de recherche. Essayez de modifier les filtres."
                      : "Commencez par ajouter votre premier produit pour le voir apparaître ici."}
                  </p>
                  {activeFiltersCount > 0 ? (
                    <Button onClick={handleClearFilters} label="Réinitialiser les filtres" style={{ marginTop: '1.5rem' }} />
                  ) : (
                    <Button onClick={() => navigate('/products/create')} icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label="Ajouter un produit" style={{ marginTop: '1.5rem' }} />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(8, 1fr)' }}>
                {productsList && productsList.length > 0 ? (
                  productsList.map((product: IProduct) => (
                    <div
                      key={product.id}
                      onClick={() => handleViewProduct(product.id)}
                      style={{
                        position: 'relative', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        overflow: 'hidden', cursor: 'pointer',
                        ...(selectedProducts.includes(product.id)
                          ? { border: '1px solid #f59e0b', outline: '2px solid rgba(245,158,11,0.2)' }
                          : { border: '1px solid rgba(226,232,240,0.6)' }),
                      }}
                    >
                      {/* Selection Checkbox */}
                      <div style={{ position: 'absolute', top: '0.375rem', left: '0.375rem', zIndex: 10 }}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectProduct(product.id);
                          }}
                          style={{
                            width: '1.5rem', height: '1.5rem', borderRadius: '0.375rem', borderWidth: '2px', borderStyle: 'solid',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            ...(selectedProducts.includes(product.id)
                              ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: 'white' }
                              : { backgroundColor: 'white', borderColor: '#cbd5e1' }),
                          }}
                        >
                          {selectedProducts.includes(product.id) && <CheckSquare style={{ width: '1rem', height: '1rem' }} />}
                        </div>
                      </div>

                      {/* Product Image */}
                      <div style={{ position: 'relative', height: '8rem', overflow: 'hidden', borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}>
                        {product.imageUrl ? (
                          <img
                            src={getImageUrl(product.imageUrl)}
                            alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.9 }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}>
                            <Package style={{ width: '4rem', height: '4rem', color: '#cbd5e1' }} />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ paddingBottom: '0.25rem' }}>
                          <h3 style={{ fontSize: '10px', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, paddingBottom: '0.25rem' }} title={product.name}>
                            {product.name}
                          </h3>
                          {product.code && (
                            <p style={{ fontSize: '9px', color: '#94a3b8', marginTop: '0.125rem', paddingLeft: '0.125rem' }}>
                              {t('code')}: {product.code}
                            </p>
                          )}
                        </div>

                        {/* Price & Cost */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('price')}</p>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>
                              {(product.price || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                              <span style={{ fontSize: '8px' }}>{t('currency')}</span>
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flex: 1 }}>
                            <p style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('cost')}</p>
                            <p style={{ fontSize: '9px', color: '#475569' }}>
                              {(product.cost || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                            </p>
                          </div>
                        </div>

                        {/* Stock */}
                        {!product.isService && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px' }}>
                            <span style={{ color: '#64748b' }}>{t('stock')}:</span>
                            <span style={{ fontWeight: 600, color: '#334155' }}>
                              {product.stock !== null && product.stock !== undefined
                                ? `${product.stock} ${t('per')} ${(product as any).saleUnitOfMeasure?.code || t('unit')}`
                                : '-'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '5rem', paddingBottom: '5rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'relative', background: 'linear-gradient(to bottom right, #fffbeb, #fff7ed)', borderRadius: '1rem', padding: '2rem', border: '2px solid #fef3c7' }}>
                        <Package style={{ width: '4rem', height: '4rem', color: '#f59e0b', margin: '0 auto' }} strokeWidth={1.5} />
                      </div>
                    </div>
                    <h3 style={{ marginTop: '1.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{t('noProductsFound')}</h3>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b', maxWidth: '24rem', textAlign: 'center' }}>
                      {activeFiltersCount > 0
                        ? "Aucun produit ne correspond à vos critères de recherche. Essayez de modifier les filtres."
                        : "Commencez par ajouter votre premier produit pour le voir apparaître ici."}
                    </p>
                    {activeFiltersCount > 0 ? (
                      <Button onClick={handleClearFilters} label="Réinitialiser les filtres" style={{ marginTop: '1.5rem' }} />
                    ) : (
                      <Button onClick={() => navigate('/products/create')} icon={<Plus style={{ width: '1rem', height: '1rem' }} />} label="Ajouter un produit" style={{ marginTop: '1.5rem' }} />
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
                icon: <Eye style={{ width: '0.875rem', height: '0.875rem' }} />,
                onClick: () => handleViewProduct(selectedProducts[0]),
                variant: 'secondary' as const,
              },
            ]
            : []),
          {
            id: 'delete',
            label: t('delete'),
            icon: <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />,
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
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 40 }}
            onClick={() => setFiltersExpanded(false)}
          />

          {/* Slide-in Panel */}
          <div style={{ position: 'fixed', top: 0, bottom: 0, right: 0, width: '560px', backgroundColor: 'white', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
            {/* Panel Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(to right, #f59e0b, #d97706)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Filter style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white' }}>{t('filters')}</h2>
                {activeFiltersCount > 0 && (
                  <span style={{ backgroundColor: 'white', color: '#d97706', fontSize: '0.75rem', fontWeight: 700, borderRadius: '9999px', width: '1.25rem', height: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setFiltersExpanded(false)}
                style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
              </button>
            </div>

            {/* Panel Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Search Filters Section */}
              <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'block' }}>
                  {t('search')}
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>
                      {t('name')}
                    </label>
                    <InputText
                      type="text"
                      value={nameFilter}
                      onChange={(e) => setNameFilter(e.target.value)}
                      placeholder={t('search')}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>
                      {t('code')}
                    </label>
                    <InputText
                      type="text"
                      value={codeFilter}
                      onChange={(e) => setCodeFilter(e.target.value)}
                      placeholder={t('search')}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Stock Filter */}
              <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'block' }}>
                  {t('stock')}
                </label>
                <Dropdown
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.value as 'all' | 'negative' | 'zero' | 'positive')}
                  options={stockFilterOptions}
                  optionLabel="label"
                  optionValue="value"
                />
              </div>

              {/* Category Filter */}
              <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'block' }}>
                  {t('categories')}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '16rem', overflowY: 'auto' }}>
                  {categoriesList.length > 0 ? (
                    categoriesList.map((category: any) => (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        style={{
                          paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem',
                          borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                          ...(selectedCategories.includes(category.id)
                            ? { backgroundColor: '#f59e0b', color: 'white', boxShadow: '0 10px 15px -3px rgba(245,158,11,0.3)', border: 'none' }
                            : { backgroundColor: '#f8fafc', color: '#334155', border: '2px solid #e2e8f0' }),
                        }}
                      >
                        <span>{category.name}</span>
                      </button>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>No categories available</p>
                  )}
                </div>
              </div>

              {/* Is Service Filter */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'block' }}>
                  Type
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {[
                    { key: undefined, label: t('all') },
                    { key: true, label: 'Service' },
                    { key: false, label: t('product') }
                  ].map((filter) => (
                    <button
                      key={String(filter.key)}
                      onClick={() => setIsServiceFilter(filter.key as boolean | undefined)}
                      style={{
                        paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem',
                        borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        ...(isServiceFilter === filter.key
                          ? { backgroundColor: '#f59e0b', color: 'white', boxShadow: '0 10px 15px -3px rgba(245,158,11,0.3)', border: 'none' }
                          : { backgroundColor: '#f8fafc', color: '#334155', border: '2px solid #e2e8f0' }),
                      }}
                    >
                      <span>{filter.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel Footer */}
            <div style={{ borderTop: '1px solid #e2e8f0', padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', gap: '0.75rem' }}>
              <Button
                outlined
                onClick={handleClearFilters}
                label={t('reset')}
                style={{ flex: 1 }}
              />
              <Button
                onClick={handleApplyFilters}
                label={t('apply')}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
