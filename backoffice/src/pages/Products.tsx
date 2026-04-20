import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { translateUomCode } from '../lib/uom-translations';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { productsService } from '../modules/products';
import { categoriesService } from '../modules/categories';
import type { IProduct } from '../modules/products/products.interface';
import {
  Plus,
  Eye,
  Trash2,
  Search,
  Package,
  X,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  FileSpreadsheet,
  CheckSquare,
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { MobileList } from '../components/MobileList';
import {
  toastExported,
  toastImported,
  toastError,
  toastDeleteError,
  toastWarning,
  toastInfo,
  toastConfirm,
} from '../services/toast.service';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { DataTable, DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Sidebar } from 'primereact/sidebar';
import { AutoComplete } from 'primereact/autocomplete';
import { formatAmount } from '@orderium/ui';

export default function Products() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const getImageUrl = (imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;
    // Full URL (MinIO or any absolute URL): use directly
    if (imageUrl.startsWith('http')) return imageUrl;
    // Legacy fallback: construct from MinIO public URL
    const minioPublicUrl = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
    return `${minioPublicUrl}/orderium-media/${imageUrl}`;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [quickSearch, setQuickSearch] = useState('');
  const quickSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [nameFilter, setNameFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'negative' | 'zero' | 'positive'>('all');
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);
  const [isServiceFilter, setIsServiceFilter] = useState<boolean | undefined>(undefined);
  const [categorySearchSuggestions, setCategorySearchSuggestions] = useState<any[]>([]);

  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    code: '',
    stockFilter: undefined as 'negative' | 'zero' | 'positive' | undefined,
    categoryIds: [] as number[],
    isService: undefined as boolean | undefined,
  });

  useEffect(() => {
    if (quickSearchDebounceRef.current) clearTimeout(quickSearchDebounceRef.current);
    quickSearchDebounceRef.current = setTimeout(() => {
      setAppliedFilters((prev) => ({ ...prev, name: quickSearch }));
      setCurrentPage(1);
    }, 500);
    return () => {
      if (quickSearchDebounceRef.current) clearTimeout(quickSearchDebounceRef.current);
    };
  }, [quickSearch]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getAll(),
  });

  const categoriesList = (categories as any)?.categories || categories || [];

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', appliedFilters, currentPage, pageSize],
    queryFn: () =>
      productsService.getProducts({
        search: appliedFilters.name,
        code: appliedFilters.code,
        stockFilter: appliedFilters.stockFilter,
        categoryIds: appliedFilters.categoryIds,
        isService: appliedFilters.isService,
        page: currentPage,
        limit: pageSize,
      }),
    placeholderData: keepPreviousData,
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
      toastDeleteError(error, t);
    },
  });

  const searchCategories = (event: { query: string }) => {
    const query = event.query.toLowerCase();
    setCategorySearchSuggestions(
      query
        ? (categoriesList as any[]).filter((c: any) => c.name.toLowerCase().includes(query))
        : [...(categoriesList as any[])],
    );
  };

  const toggleSelectProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
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
            toastDeleteError(error, t);
            break;
          }
        }
        if (!hasErrors) {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          clearSelection();
        }
      },
      {
        description: t('confirmBulkDelete').replace('{{count}}', String(selectedProducts.length)),
        confirmLabel: t('delete'),
      },
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
      categoryIds: selectedCategories.map((c: any) => c.id),
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
            t('importSuccess')
              .replace('{{created}}', String(result.imported))
              .replace('{{updated}}', String(result.updated)),
          );
          queryClient.invalidateQueries({ queryKey: ['products'] });
        } else {
          toastWarning(
            t('importPartial')
              .replace('{{created}}', String(result.imported))
              .replace('{{updated}}', String(result.updated))
              .replace('{{failed}}', String(result.failed)),
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
      <div
        style={{ display: 'flex', flexDirection: 'column', maxWidth: '1600px', margin: '0 auto' }}
      >
        {/* Page Header */}
        <PageHeader
          icon={Package}
          title={t('products')}
          subtitle={t('manageProducts')}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Filters Button */}
              <div style={{ position: 'relative' }}>
                <Button
                  onClick={() => setFiltersExpanded(true)}
                  outlined
                  severity="secondary"
                  icon={<Filter style={{ width: 16, height: 16 }} />}
                  label={t('filters')}
                />
                {activeFiltersCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-0.35rem',
                      right: '-0.35rem',
                      backgroundColor: '#235ae4',
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      borderRadius: '9999px',
                      width: '1.2rem',
                      height: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    {activeFiltersCount}
                  </span>
                )}
              </div>

              {/* Import/Export Buttons */}
              <Button
                onClick={handleDownloadTemplate}
                outlined
                severity="secondary"
                icon={<FileSpreadsheet style={{ width: 16, height: 16 }} />}
                label={t('templateShort')}
                title={t('downloadTemplate')}
              />
              <Button
                onClick={handleImport}
                outlined
                severity="secondary"
                icon={<Upload style={{ width: 16, height: 16 }} />}
                label={t('import')}
                title={t('import')}
              />
              <Button
                onClick={handleExport}
                outlined
                severity="secondary"
                icon={<Download style={{ width: 16, height: 16 }} />}
                label={t('export')}
                title={t('export')}
              />

              {/* Add Product Button */}
              <Button
                onClick={() => navigate('/products/create')}
                icon={<Plus style={{ width: 16, height: 16 }} />}
                label={t('addProduct')}
              />
            </div>
          }
        />

        {/* Quick Search Bar */}
        <div className="page-quick-search">
          <span
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search style={{ width: '1rem', height: '1rem' }} />
          </span>
          <InputText
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder={t('searchProducts')}
            style={{
              width: '100%',
              paddingLeft: '2.25rem',
              paddingRight: quickSearch ? '2.5rem' : '0.875rem',
            }}
          />
          {quickSearch && (
            <button
              type="button"
              onClick={() => setQuickSearch('')}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#94a3b8',
                padding: '0.25rem',
              }}
            >
              <X style={{ width: '1rem', height: '1rem' }} />
            </button>
          )}
        </div>

        {/* Products View */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* ── Mobile card list ── */}
          <div className="responsive-table-mobile">
            <MobileList
              items={productsList}
              keyExtractor={(p: IProduct) => p.id}
              onTap={(p: IProduct) => handleViewProduct(p.id)}
              loading={isLoading}
              totalCount={totalCount}
              countLabel={t('products')}
              emptyMessage={t('noProductsFound')}
              hasMore={currentPage < totalPages}
              onLoadMore={() => setCurrentPage((prev) => prev + 1)}
              selectedKeys={new Set(selectedProducts)}
              onToggleSelect={(key) => toggleSelectProduct(key as number)}
              config={{
                topLeft: (p: IProduct) => p.name,
                topRight: (p: IProduct) => `${formatAmount(p.price || 0, 2)} ${t('currency')}`,
                bottomLeft: (p: IProduct) =>
                  [p.code, p.stock != null ? `Stock: ${p.stock}` : null]
                    .filter(Boolean)
                    .join(' · '),
                bottomRight: (p: IProduct) => {
                  if (p.stock == null) return null;
                  if (p.stock < 0)
                    return (
                      <span className="erp-badge erp-badge--unpaid">{t('negativeStock')}</span>
                    );
                  if (p.stock === 0)
                    return <span className="erp-badge erp-badge--draft">{t('zeroStock')}</span>;
                  return <span className="erp-badge erp-badge--paid">{t('inStock')}</span>;
                },
              }}
            />
          </div>

          {/* ── Desktop DataTable ── */}
          {isLoading ? (
            <div
              className="responsive-table-desktop animate-pulse"
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        height: '3rem',
                        width: '3rem',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <div
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                    >
                      <div
                        style={{
                          height: '1rem',
                          width: '10rem',
                          backgroundColor: '#e2e8f0',
                          borderRadius: '0.25rem',
                        }}
                      />
                      <div
                        style={{
                          height: '0.75rem',
                          width: '6rem',
                          backgroundColor: '#e2e8f0',
                          borderRadius: '0.25rem',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        height: '1.5rem',
                        width: '4rem',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '9999px',
                      }}
                    />
                    <div
                      style={{
                        height: '1rem',
                        width: '5rem',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '0.25rem',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="responsive-table-desktop"
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              <DataTable
                className="prod-datatable"
                value={productsList}
                lazy
                totalRecords={totalCount}
                first={(currentPage - 1) * pageSize}
                onPage={(e: DataTablePageEvent) => {
                  setCurrentPage(Math.floor(e.first / e.rows) + 1);
                  setPageSize(e.rows);
                }}
                selection={productsList.filter((p: IProduct) => selectedProducts.includes(p.id))}
                onSelectionChange={(e) =>
                  setSelectedProducts((e.value as IProduct[]).map((p) => p.id))
                }
                selectionMode="checkbox"
                onRowClick={(e) => {
                  const target = e.originalEvent.target as HTMLElement;
                  if (
                    target.closest('button') ||
                    target.closest('a') ||
                    target.closest('.p-checkbox')
                  )
                    return;
                  const selCol = target.closest('.p-selection-column');
                  if (selCol) {
                    (selCol.querySelector('.p-checkbox-box') as HTMLElement)?.click();
                    return;
                  }
                  handleViewProduct((e.data as IProduct).id);
                }}
                rowClassName={() => 'ord-row-clickable'}
                dataKey="id"
                paginator
                paginatorPosition="top"
                rows={pageSize}
                rowsPerPageOptions={[10, 25, 50, 100]}
                removableSort
                loading={isLoading}
                emptyMessage={t('noProductsFound')}
                paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                currentPageReportTemplate={t('pageReportTemplate')}
              >
                <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                <Column
                  header={t('name')}
                  sortable
                  sortField="name"
                  body={(product: IProduct) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {product.imageUrl ? (
                        <img
                          src={getImageUrl(product.imageUrl)}
                          alt={product.name}
                          style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            objectFit: 'contain',
                            borderRadius: '0.5rem',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            background: 'linear-gradient(to bottom right, #f1f5f9, #e2e8f0)',
                            borderRadius: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Package
                            style={{ width: '1.25rem', height: '1.25rem', color: '#94a3b8' }}
                          />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#1e293b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            margin: 0,
                          }}
                        >
                          {product.name}
                        </p>
                        {product.code && (
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                            {product.code}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                />
                <Column
                  header={t('price')}
                  sortable
                  sortField="price"
                  body={(product: IProduct) => (
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#235ae4' }}>
                      {formatAmount(product.price || 0, 2)}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{t('currency')}</span>
                    </span>
                  )}
                />
                <Column
                  header={t('cost')}
                  sortable
                  sortField="cost"
                  body={(product: IProduct) => (
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                      {formatAmount(product.cost || 0, 2)}{' '}
                      <span style={{ fontSize: '0.75rem' }}>{t('currency')}</span>
                    </span>
                  )}
                />
                <Column
                  header={t('stock')}
                  sortable
                  sortField="stock"
                  body={(product: IProduct) => {
                    if (product.stock === null || product.stock === undefined) {
                      return <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>—</span>;
                    }
                    if (product.stock < 0) {
                      return (
                        <span
                          style={{
                            display: 'inline-flex',
                            padding: '0.2rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                          }}
                        >
                          {product.stock}{' '}
                          {translateUomCode((product as any).saleUnitOfMeasure?.code, language)}
                        </span>
                      );
                    }
                    if (product.stock === 0) {
                      return (
                        <span
                          style={{
                            display: 'inline-flex',
                            padding: '0.2rem 0.625rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: '#fff7ed',
                            color: '#c2410c',
                          }}
                        >
                          {t('zeroStock')}
                        </span>
                      );
                    }
                    return (
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '0.2rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                        }}
                      >
                        {product.stock}{' '}
                        {translateUomCode((product as any).saleUnitOfMeasure?.code, language)}
                      </span>
                    );
                  }}
                />
                <Column
                  header={t('categories')}
                  body={(product: IProduct) => {
                    const cats = product.categories;
                    if (!cats || cats.length === 0)
                      return <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>;
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {cats.map((c) => (
                          <span
                            key={c.id}
                            style={{
                              display: 'inline-flex',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#eef2ff',
                              color: '#4338ca',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    );
                  }}
                />
                <Column
                  header={t('status')}
                  body={(product: IProduct) => (
                    <span
                      style={{
                        display: 'inline-flex',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        ...(product.isEnabled
                          ? { backgroundColor: '#dcfce7', color: '#166534' }
                          : { backgroundColor: '#fee2e2', color: '#991b1b' }),
                      }}
                    >
                      {product.isEnabled ? t('active') : t('inactive')}
                    </span>
                  )}
                />
                <Column
                  headerStyle={{ width: '2.5rem' }}
                  bodyStyle={{ width: '2.5rem', textAlign: 'center' }}
                  body={() => (
                    <ChevronRight
                      className="ord-row-chevron"
                      style={{ width: '1rem', height: '1rem', color: '#cbd5e1' }}
                    />
                  )}
                />
              </DataTable>
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
      <Sidebar
        visible={filtersExpanded}
        onHide={() => setFiltersExpanded(false)}
        position="right"
        className="sidebar-bottom-sheet"
        style={{ width: '560px' }}
        showCloseIcon={false}
        blockScroll
        pt={{
          header: { style: { display: 'none' } },
          content: {
            style: {
              padding: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: '1.5rem',
            paddingRight: '1.5rem',
            paddingTop: 'calc(1rem + env(safe-area-inset-top, 0))',
            paddingBottom: '1rem',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(to right, #235ae4, #1a47b8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Filter style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white' }}>
              {t('filters')}
            </h2>
            {activeFiltersCount > 0 && (
              <span
                style={{
                  backgroundColor: 'white',
                  color: '#235ae4',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  width: '1.25rem',
                  height: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeFiltersCount}
              </span>
            )}
          </div>
          <Button
            onClick={() => setFiltersExpanded(false)}
            text
            rounded
            icon={<X style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />}
            style={{ padding: '0.5rem' }}
          />
        </div>

        {/* Panel Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* Search Filters Section */}
          <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
                display: 'block',
              }}
            >
              {t('search')}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '0.5rem',
                    display: 'block',
                  }}
                >
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
                <label
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '0.5rem',
                    display: 'block',
                  }}
                >
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
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
                display: 'block',
              }}
            >
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
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
                display: 'block',
              }}
            >
              {t('categories')}
            </label>
            <AutoComplete
              multiple
              value={selectedCategories}
              suggestions={categorySearchSuggestions}
              completeMethod={searchCategories}
              field="name"
              onChange={(e) => setSelectedCategories(e.value)}
              placeholder={t('categories')}
              dropdown
              style={{ width: '100%' }}
              inputStyle={{ width: '100%' }}
              pt={{ container: { style: { width: '100%' } } }}
            />
          </div>

          {/* Is Service Filter */}
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
                display: 'block',
              }}
            >
              Type
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                { key: undefined, label: t('all') },
                { key: true, label: 'Service' },
                { key: false, label: t('product') },
              ].map((filter) => (
                <Button
                  key={String(filter.key)}
                  onClick={() => setIsServiceFilter(filter.key as boolean | undefined)}
                  label={filter.label}
                  style={
                    isServiceFilter === filter.key
                      ? {
                          paddingLeft: '0.75rem',
                          paddingRight: '0.75rem',
                          paddingTop: '0.5rem',
                          paddingBottom: '0.5rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#235ae4',
                          color: 'white',
                          boxShadow: '0 10px 15px -3px rgba(35,90,228,0.3)',
                          border: 'none',
                        }
                      : {
                          paddingLeft: '0.75rem',
                          paddingRight: '0.75rem',
                          paddingTop: '0.5rem',
                          paddingBottom: '0.5rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#f8fafc',
                          color: '#334155',
                          border: '2px solid #e2e8f0',
                        }
                  }
                  text={isServiceFilter !== filter.key}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            display: 'flex',
            gap: '0.75rem',
          }}
        >
          <Button outlined onClick={handleClearFilters} label={t('reset')} style={{ flex: 1 }} />
          <Button onClick={handleApplyFilters} label={t('apply')} style={{ flex: 1 }} />
        </div>
      </Sidebar>
    </AdminLayout>
  );
}
