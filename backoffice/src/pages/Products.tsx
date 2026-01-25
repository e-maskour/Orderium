import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../modules/products';
import type { Product } from '../modules/products/products.interface';
import { Plus, Eye, Trash2, Search, Package, Grid3x3, List, CheckSquare, X } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { FloatingActionBar } from '../components/FloatingActionBar';
import ConfirmDialog from '../components/ConfirmDialog';
import AlertDialog from '../components/AlertDialog';

export default function Products() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  // Confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'single' | 'bulk'>('single');
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);

  // Alert dialog
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ title: '', message: '' });

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', searchTerm, currentPage, pageSize],
    queryFn: () => productsService.getProducts({ search: searchTerm, page: currentPage, limit: pageSize }),
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
      setAlertMessage({
        title: 'Erreur de suppression',
        message: error.message,
      });
      setShowAlert(true);
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
      setSelectedProducts(productsList.map((p: Product) => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedProducts([]);
  };

  const handleBulkDelete = () => {
    setDeleteAction('bulk');
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (deleteAction === 'bulk') {
      let hasErrors = false;
      for (const id of selectedProducts) {
        try {
          await productsService.deleteProduct(id);
        } catch (error: any) {
          hasErrors = true;
          setAlertMessage({
            title: 'Erreur de suppression',
            message: error.message,
          });
          setShowAlert(true);
          break;
        }
      }

      if (!hasErrors) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        clearSelection();
      }
    } else if (deleteProductId !== null) {
      deleteMutation.mutate(deleteProductId);
    }
    setShowDeleteConfirm(false);
    setDeleteProductId(null);
  };

  const handleViewProduct = (id: number) => {
    navigate(`/products/${id}`);
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex-shrink-0">
          <PageHeader icon={Package} title={t('products')} subtitle={t('manageProducts')} />
        </div>

        {/* Toolbar: Search, View Toggle, Add Button */}
        <div className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-shrink-0">
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

          <div className="flex items-center gap-3 flex-1 sm:flex-none w-full sm:w-auto">
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
                className="w-full sm:w-96 ps-10 pe-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
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
              onClick={() => navigate('/products/create')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              {t('addProduct')}
            </button>
          </div>
        </div>

        {/* Products View */}
        <div
          className={`flex-1 ${
            viewMode === 'card'
              ? 'bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col'
              : 'overflow-hidden flex flex-col'
          }`}
        >
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center bg-white rounded-lg">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-slate-500">{t('loading')}...</p>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 border border-slate-200/60 rounded-lg bg-white">
              {/* Product Rows */}
              {productsList && productsList.length > 0 ? (
                productsList.map((product: Product) => (
                  <div
                    key={product.id}
                    onClick={() => handleViewProduct(product.id)}
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
                          {selectedProducts.includes(product.id) && <CheckSquare className="w-4 h-4" />}
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
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('name')}</p>
                        <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
                        {product.code && <p className="text-xs text-slate-400 mt-0.5">{product.code}</p>}
                      </div>

                      {/* Price */}
                      <div className="w-28">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('price')}</p>
                        <span className="text-sm font-semibold text-amber-600">
                          {(product.price || 0).toFixed(2)} {t('currency')}
                        </span>
                      </div>

                      {/* Cost */}
                      <div className="w-28">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('cost')}</p>
                        <span className="text-sm text-slate-600">
                          {(product.cost || 0).toFixed(2)} {t('currency')}
                        </span>
                      </div>

                      {/* Stock */}
                      <div className="w-24 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('stock')}</p>
                        <span className="text-sm text-slate-700 font-medium">
                          {product.stock !== null && product.stock !== undefined 
                            ? `${product.stock} per ${(product as any).saleUnitOfMeasure?.code || 'Unité(s)'}`
                            : '-'}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="w-24 flex flex-col items-center">
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
                      </div>

                      {/* Actions */}
                      <div className="w-16 flex justify-center">
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
                      </div>
                    </div>
                  </div>
                ))
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
                      onClick={() => handleViewProduct(product.id)}
                      className={`relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${
                        selectedProducts.includes(product.id)
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
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedProducts.includes(product.id)
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
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-semibold shadow-md ${
                              product.isEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}
                          >
                            {product.isEnabled ? t('active') : t('inactive')}
                          </span>
                        </div>
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

                        {product.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-2 min-h-[2rem]" title={product.description}>
                            {product.description}
                          </p>
                        )}

                        {/* Price & Cost */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <div className="flex-1">
                            <p className="text-[8px] text-slate-500 uppercase tracking-wide">{t('price')}</p>
                            <p className="text-xs font-bold text-amber-600">
                              {(product.price || 0).toFixed(2)}{' '}
                              <span className="text-[8px]">{t('currency')}</span>
                            </p>
                          </div>
                          <div className="text-right flex-1">
                            <p className="text-[8px] text-slate-500 uppercase tracking-wide">{t('cost')}</p>
                            <p className="text-[9px] text-slate-600">
                              {(product.cost || 0).toFixed(2)} {t('currency')}
                            </p>
                          </div>
                        </div>

                        {/* Stock */}
                        {!product.isService && (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">{t('stock')}:</span>
                            <span className="font-semibold text-slate-700">
                              {product.stock !== null && product.stock !== undefined 
                                ? `${product.stock} per ${(product as any).saleUnitOfMeasure?.code || 'Unité(s)'}`
                                : '-'}
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 pt-1 border-t border-slate-100">
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

          {/* Pagination - Fixed at bottom */}
          {productsList && productsList.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Page info and size selector */}
                <div className="flex items-center gap-4">
                  <p className="text-sm text-slate-600">
                    {t('showing')} <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> {t('to')}{' '}
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
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none"
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
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!hasPrevPage}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('previous')}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === 1
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                          : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      1
                    </button>

                    {currentPage > 3 && <span className="px-2 text-slate-500">...</span>}

                    {Array.from({ length: Math.min(5, totalPages - 2) }, (_, i) => {
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
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                                : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}

                    {currentPage < totalPages - 2 && <span className="px-2 text-slate-500">...</span>}

                    {totalPages > 1 && (
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === totalPages
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {totalPages}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={!hasNextPage}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('next')}
                  </button>
                </div>
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

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteProductId(null);
        }}
        onConfirm={confirmDelete}
        title={deleteAction === 'bulk' ? 'Supprimer les produits' : 'Supprimer le produit'}
        message={
          deleteAction === 'bulk'
            ? `Êtes-vous sûr de vouloir supprimer ${selectedProducts.length} produit(s) sélectionné(s) ? Cette action est irréversible.`
            : 'Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.'
        }
        type="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />

      <AlertDialog
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertMessage.title}
        message={alertMessage.message}
        type="warning"
      />
    </AdminLayout>
  );
}
