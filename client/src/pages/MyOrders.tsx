import { useEffect, useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { ordersService } from '@/modules/orders';
import { Order, OrderItem } from '@/modules/orders/orders.interface';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Sidebar } from 'primereact/sidebar';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { OrderTracking } from '@/components/OrderTracking';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { Package, MapPin, Calendar as CalendarIcon, ArrowLeft, ShoppingBag, Eye, Search, X, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toastError } from '@/services/toast.service';

export default function MyOrders() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<{ order: Order; items: OrderItem[] } | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled'>('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [appliedFilters, setAppliedFilters] = useState({
    orderNumber: '',
    dateRange: { start: undefined as Date | undefined, end: undefined as Date | undefined },
  });

  const [orderNumberSearch, setOrderNumberSearch] = useState('');
  const [dateRange, setDateRange] = useState<Date[] | undefined>(undefined);

  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.customerId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await ordersService.getCustomerOrders(
          user.customerId,
          currentPage,
          pageSize,
          appliedFilters.orderNumber || undefined,
          statusFilter !== 'all' ? statusFilter : undefined,
          appliedFilters.dateRange.start,
          appliedFilters.dateRange.end,
        );

        if (response.success) {
          setOrders(response.orders);
          setTotalCount(response.total);
          setTotalPages(response.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        toastError(t('error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user, currentPage, pageSize, appliedFilters.orderNumber, statusFilter, appliedFilters.dateRange, t]);

  useEffect(() => {
    if (filtersExpanded) {
      setOrderNumberSearch(appliedFilters.orderNumber);
      const range: Date[] = [];
      if (appliedFilters.dateRange.start) range.push(appliedFilters.dateRange.start);
      if (appliedFilters.dateRange.end) range.push(appliedFilters.dateRange.end);
      setDateRange(range.length > 0 ? range : undefined);
    }
  }, [filtersExpanded, appliedFilters]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: totalCount,
      pending: 0,
      assigned: 0,
      confirmed: 0,
      picked_up: 0,
      to_delivery: 0,
      in_delivery: 0,
      delivered: 0,
      canceled: 0,
    };

    orders.forEach(order => {
      const status = order.deliveryStatus || 'pending';
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [orders, totalCount]);

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  const getStatusStyle = (status?: string): { label: string; bg: string; color: string } => {
    const statusMap: Record<string, { label: string; bg: string; color: string }> = {
      pending: { label: t('statusPending'), bg: '#dbeafe', color: '#1d4ed8' },
      assigned: { label: t('statusAssigned'), bg: '#f3e8ff', color: '#7c3aed' },
      confirmed: { label: t('statusConfirmed'), bg: '#e0e7ff', color: '#4338ca' },
      picked_up: { label: t('statusPickedUp'), bg: '#cffafe', color: '#0e7490' },
      to_delivery: { label: t('statusToDelivery'), bg: '#ffedd5', color: '#c2410c' },
      in_delivery: { label: t('statusInDelivery'), bg: '#fef3c7', color: '#a16207' },
      delivered: { label: t('statusDelivered'), bg: '#dcfce7', color: '#15803d' },
      canceled: { label: t('statusCanceled'), bg: '#fee2e2', color: '#b91c1c' },
    };
    const normalizedStatus = status || 'pending';
    return statusMap[normalizedStatus] || statusMap.pending;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'ar' ? 'ar-MA' : 'fr-MA';
    return date.toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewItems = async (order: Order) => {
    try {
      const orderDetails = await ordersService.getById(order.id);
      setSelectedOrderItems({
        order,
        items: orderDetails.items || []
      });
    } catch (error) {
      console.error('Failed to fetch order items:', error);
    }
  };

  const handlePreview = (documentType: 'receipt' | 'invoice') => {
    if (!selectedOrderItems) return;

    const orderId = selectedOrderItems.order.id;
    if (!orderId) {
      toastError(t('orderIdMissing'));
      return;
    }

    const endpoint = documentType === 'receipt'
      ? `/api/pdf/receipt/${orderId}?mode=preview`
      : `/api/pdf/delivery-note/${orderId}?mode=preview`;

    const title = documentType === 'receipt'
      ? t('receipt')
      : t('deliveryNote');

    setPdfUrl(endpoint);
    setPdfTitle(`${title} ${selectedOrderItems.order.orderNumber}`);
    setSelectedOrderItems(null);
    setShowPDFPreview(true);
  };

  if (isLoading) {
    return (
      <div className="flex align-items-center justify-content-center surface-ground" style={{ minHeight: '100vh' }} dir={dir}>
        <ProgressSpinner style={{ width: '2rem', height: '2rem' }} strokeWidth="4" />
      </div>
    );
  }

  if (!user?.customerId) {
    return (
      <div className="surface-ground py-5 px-3" style={{ minHeight: '100vh' }} dir={dir}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          <h1 className="text-2xl sm:text-3xl font-bold text-color mb-4">{t('myOrders')}</h1>
          <div className="surface-card border-round-xl shadow-1 p-6 text-center">
            <Package style={{ width: '4rem', height: '4rem', color: 'var(--text-color-secondary)', margin: '0 auto 1rem' }} />
            <h3 className="text-lg font-medium text-color mb-2">{t('cannotLoadOrders')}</h3>
            <p className="text-color-secondary">{t('noCustomerId')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-ground py-3 sm:py-4 px-2 sm:px-3" style={{ minHeight: '100vh' }} dir={dir}>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Header */}
        <div className="mb-4 flex flex-column gap-3">
          <div className="flex align-items-center justify-content-between">
            <div className="flex align-items-center gap-2">
              <Button
                icon={<ArrowLeft style={{ width: '1rem', height: '1rem', transform: dir === 'rtl' ? 'rotate(180deg)' : 'none' }} />}
                text
                rounded
                onClick={() => navigate('/')}
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-color flex align-items-center gap-2 m-0">
                  <ShoppingBag style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary-color)' }} />
                  {t('myOrders')}
                </h1>
                <p className="text-xs text-color-secondary mt-1 hidden sm:block m-0">{t('trackAndManage')}</p>
              </div>
            </div>
          </div>

          {/* Filter Button */}
          <div className="flex justify-content-end">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="flex align-items-center gap-2 px-3 py-2 border-round-lg font-medium text-sm cursor-pointer border-none"
              style={{
                background: filtersExpanded ? 'var(--primary-color)' : 'var(--surface-card)',
                color: filtersExpanded ? 'white' : 'var(--text-color)',
                border: filtersExpanded ? 'none' : '1px solid var(--surface-border)',
                boxShadow: filtersExpanded ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Filter style={{ width: '0.875rem', height: '0.875rem' }} />
              <span className="hidden sm:inline">{t('filters')}</span>
              {filtersExpanded ? (
                <ChevronUp style={{ width: '0.875rem', height: '0.875rem' }} />
              ) : (
                <ChevronDown style={{ width: '0.875rem', height: '0.875rem' }} />
              )}
              {(appliedFilters.orderNumber || appliedFilters.dateRange.start || appliedFilters.dateRange.end) && !filtersExpanded && (
                <span className="px-2 py-1 border-round-xl text-xs font-bold" style={{ background: 'var(--primary-color)', color: 'white', marginInlineStart: '0.25rem' }}>
                  {[Boolean(appliedFilters.orderNumber), Boolean(appliedFilters.dateRange.start || appliedFilters.dateRange.end)].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Delivery Status Filter */}
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {[
              { key: 'all', label: t('all'), icon: '📦' },
              { key: 'pending', label: t('statusPending'), icon: '⏳' },
              { key: 'assigned', label: t('statusAssigned'), icon: '👤' },
              { key: 'confirmed', label: t('statusConfirmed'), icon: '✓' },
              { key: 'picked_up', label: t('statusPickedUp'), icon: '📦' },
              { key: 'to_delivery', label: t('statusToDelivery'), icon: '⚠️' },
              { key: 'in_delivery', label: t('statusInDelivery'), icon: '🚗' },
              { key: 'delivered', label: t('statusDelivered'), icon: '✅' },
              { key: 'canceled', label: t('statusCanceled'), icon: '❌' }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key as typeof statusFilter)}
                className="flex align-items-center gap-1 px-2 sm:px-3 py-1 border-round-md text-xs sm:text-sm font-medium white-space-nowrap cursor-pointer border-none"
                style={{
                  background: statusFilter === filter.key ? '#f59e0b' : 'var(--surface-50)',
                  color: statusFilter === filter.key ? 'white' : 'var(--text-color)',
                  border: statusFilter === filter.key ? 'none' : '1px solid var(--surface-border)',
                  boxShadow: statusFilter === filter.key ? '0 4px 6px rgba(245,158,11,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <span className="text-xs">{filter.icon}</span>
                <span className="hidden sm:inline">{filter.label}</span>
                <span
                  className="px-1 py-0 border-round-xl text-xs font-semibold"
                  style={{
                    background: statusFilter === filter.key ? 'rgba(255,255,255,0.25)' : 'var(--surface-200)',
                    color: statusFilter === filter.key ? 'white' : 'var(--text-color-secondary)',
                  }}
                >
                  {statusCounts[filter.key as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters Sidebar */}
        <Sidebar
          visible={filtersExpanded}
          onHide={() => setFiltersExpanded(false)}
          position={dir === 'rtl' ? 'left' : 'right'}
          style={{ width: '32rem' }}
          header={
            <div className="flex align-items-center gap-2">
              <Filter style={{ width: '1.25rem', height: '1.25rem' }} />
              <span className="text-lg font-bold">{t('filters')}</span>
            </div>
          }
        >
          <div className="flex flex-column gap-5 p-3">
            {/* Search Section */}
            <div className="pb-4 border-bottom-1 surface-border">
              <label className="text-xs font-bold text-color uppercase mb-3 block flex align-items-center gap-2" style={{ letterSpacing: '0.05em' }}>
                <Search style={{ width: '1rem', height: '1rem', color: 'var(--primary-color)' }} />
                {t('search')}
              </label>
              <div>
                <label className="text-xs font-semibold text-color-secondary mb-2 block">{t('orderNumber')}</label>
                <span className="p-input-icon-right w-full">
                  {orderNumberSearch && (
                    <i className="pi pi-times cursor-pointer" onClick={() => setOrderNumberSearch('')} />
                  )}
                  <InputText
                    placeholder={t('enterOrderNumber')}
                    value={orderNumberSearch}
                    onChange={(e) => setOrderNumberSearch(e.target.value)}
                    className="w-full"
                  />
                </span>
              </div>
            </div>

            {/* Date Range Section */}
            <div>
              <label className="text-xs font-bold text-color uppercase mb-3 block flex align-items-center gap-2" style={{ letterSpacing: '0.05em' }}>
                <CalendarIcon style={{ width: '1rem', height: '1rem', color: 'var(--primary-color)' }} />
                {t('dateRange')}
              </label>
              <Calendar
                value={dateRange}
                onChange={(e) => setDateRange(e.value as Date[] | undefined)}
                selectionMode="range"
                placeholder={t('selectDate')}
                className="w-full"
                showIcon
                readOnlyInput
              />
            </div>
          </div>

          {/* Panel Footer */}
          <div className="flex gap-3 p-3 border-top-1 surface-border mt-auto" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--surface-50)' }}>
            <Button
              label={t('reset')}
              outlined
              className="flex-1"
              onClick={() => {
                setOrderNumberSearch('');
                setDateRange(undefined);
                setStatusFilter('all');
                setCurrentPage(1);
                setAppliedFilters({
                  orderNumber: '',
                  dateRange: { start: undefined, end: undefined },
                });
                setFiltersExpanded(false);
              }}
            />
            <Button
              label={t('apply')}
              className="flex-1"
              onClick={() => {
                setCurrentPage(1);
                setAppliedFilters({
                  orderNumber: orderNumberSearch,
                  dateRange: {
                    start: dateRange?.[0],
                    end: dateRange?.[1],
                  },
                });
                setFiltersExpanded(false);
              }}
            />
          </div>
        </Sidebar>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex align-items-center justify-content-center py-8">
            <ProgressSpinner style={{ width: '2.5rem', height: '2.5rem' }} strokeWidth="4" />
          </div>
        ) : orders.length === 0 ? (
          <div className="surface-card border-round-xl shadow-1 border-1 surface-border p-6 text-center">
            <Package style={{ width: '4rem', height: '4rem', color: 'var(--text-color-secondary)', margin: '0 auto 1rem' }} />
            <h3 className="text-lg font-medium text-color mb-2">{t('noOrdersFound')}</h3>
            <p className="text-color-secondary">
              {appliedFilters.orderNumber ? t('noResultsMessage') : t('noOrdersYet')}
            </p>
          </div>
        ) : (
          <>
            {/* Pagination Info Bar */}
            {totalCount > 0 && (
              <div className="px-2 py-2 flex align-items-center justify-content-between text-sm">
                <div className="text-color-secondary hidden md:block">
                  {t('showing')} <span className="font-semibold text-color">{startIndex}</span> {t('to')}
                  {' '}<span className="font-semibold text-color">{endIndex}</span> {t('of')}{' '}
                  <span className="font-semibold text-color">{totalCount}</span> {t('results')}
                </div>

                <div className="flex align-items-center gap-2">
                  <label className="text-xs font-medium text-color-secondary hidden lg:inline">{t('perPage')}</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 border-round-md text-sm font-medium border-1 surface-border"
                    style={{ background: 'var(--surface-card)', color: 'var(--text-color)' }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex align-items-center gap-1 ml-auto">
                  <Button
                    icon={<ChevronLeft style={{ width: '0.875rem', height: '0.875rem' }} />}
                    text
                    size="small"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  />
                  <span className="text-sm font-medium text-color px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    icon={<ChevronRight style={{ width: '0.875rem', height: '0.875rem' }} />}
                    text
                    size="small"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  />
                </div>
              </div>
            )}

            {/* Orders Grid */}
            <div className="grid">
              {orders.map((order) => {
                const status = getStatusStyle(order.deliveryStatus);
                return (
                  <div key={order.id} className="col-12 sm:col-6 lg:col-4">
                    <div className="surface-card border-round-xl shadow-1 border-1 surface-border overflow-hidden h-full">
                      {/* Order Header */}
                      <div className="p-3 border-bottom-1 surface-border" style={{ background: 'linear-gradient(to right, rgba(var(--primary-color-rgb,16,185,129),0.05), rgba(var(--primary-color-rgb,16,185,129),0.1))' }}>
                        <div className="flex align-items-center justify-content-between mb-1">
                          <div className="flex align-items-center gap-1">
                            <Package style={{ width: '1rem', height: '1rem', color: 'var(--primary-color)' }} />
                            <span className="text-xs font-medium text-color-secondary">{t('orderNumber')}</span>
                          </div>
                          <span className="px-2 py-1 border-round-xl text-xs font-semibold" style={{ background: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                        </div>
                        <p className="font-bold text-base text-color m-0" style={{ fontFamily: 'monospace' }}>{order.orderNumber}</p>
                      </div>

                      {/* Order Details */}
                      <div className="p-3 flex flex-column gap-2">
                        <div className="flex align-items-center gap-2 text-xs text-color-secondary">
                          <CalendarIcon style={{ width: '0.875rem', height: '0.875rem' }} />
                          <span>{formatDate(order.dateCreated)}</span>
                        </div>

                        <div className="flex align-items-center justify-content-between pt-2 border-top-1 surface-border">
                          <span className="text-xs font-medium text-color-secondary">{t('totalAmount')}</span>
                          <span className="text-lg font-bold text-primary">{formatCurrency(order.total || 0, language)}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            label={t('viewDetails')}
                            icon={<Eye style={{ width: '0.875rem', height: '0.875rem', marginInlineEnd: '0.25rem' }} />}
                            outlined
                            size="small"
                            className="flex-1"
                            onClick={() => handleViewItems(order)}
                          />
                          {(order.deliveryStatus !== 'delivered' && order.deliveryStatus !== 'canceled') && (
                            <Button
                              label={t('track')}
                              icon={<MapPin style={{ width: '0.875rem', height: '0.875rem', marginInlineEnd: '0.25rem' }} />}
                              size="small"
                              className="flex-1"
                              onClick={() => setSelectedOrder(order.orderNumber)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Tracking Modal */}
      <Dialog
        visible={!!selectedOrder}
        onHide={() => setSelectedOrder(null)}
        header={
          <div className="flex align-items-center gap-2">
            <MapPin style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary-color)' }} />
            <span>{t('trackOrder')}</span>
          </div>
        }
        modal
        style={{ width: '95vw', maxWidth: '42rem' }}
        contentStyle={{ maxHeight: '80vh', overflow: 'auto' }}
      >
        <div className="mt-3">
          {selectedOrder && user?.customerId && (
            <>
              <div className="border-round-lg p-3 mb-3" style={{ background: 'var(--surface-100)' }}>
                <p className="text-xs text-color-secondary m-0">{t('orderNumber')}</p>
                <p className="font-bold text-primary m-0" style={{ fontFamily: 'monospace' }}>{selectedOrder}</p>
              </div>
              <OrderTracking orderNumber={selectedOrder} customerId={user.customerId} />
            </>
          )}
        </div>
      </Dialog>

      {/* Order Items Modal */}
      <Dialog
        visible={!!selectedOrderItems}
        onHide={() => setSelectedOrderItems(null)}
        header={
          <div className="flex align-items-center gap-2">
            <ShoppingBag style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary-color)' }} />
            <span>{t('orderDetails')}</span>
          </div>
        }
        modal
        style={{ width: '95vw', maxWidth: '48rem' }}
        contentStyle={{ padding: 0 }}
        footer={
          selectedOrderItems && (
            <div className="flex flex-column gap-3">
              <div className="flex align-items-center justify-content-between">
                <span className="text-lg font-semibold text-color">{t('total')}</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(selectedOrderItems.order.total || 0, language)}</span>
              </div>
              <div className="grid">
                <div className="col-6">
                  <Button
                    label={t('receipt')}
                    icon={<Eye style={{ width: '1rem', height: '1rem', marginInlineEnd: '0.5rem' }} />}
                    outlined
                    className="w-full"
                    onClick={() => handlePreview('receipt')}
                  />
                </div>
                <div className="col-6">
                  <Button
                    label={t('deliveryNote')}
                    icon={<Eye style={{ width: '1rem', height: '1rem', marginInlineEnd: '0.5rem' }} />}
                    outlined
                    className="w-full"
                    onClick={() => handlePreview('invoice')}
                  />
                </div>
              </div>
            </div>
          )
        }
      >
        {selectedOrderItems && (
          <>
            {/* Order Info */}
            <div className="px-4 pb-3">
              <div className="border-round-lg p-3" style={{ background: 'var(--surface-100)' }}>
                <div className="grid">
                  <div className="col-6">
                    <p className="text-xs text-color-secondary mb-1 m-0">{t('orderNumber')}</p>
                    <p className="font-bold text-primary m-0" style={{ fontFamily: 'monospace' }}>{selectedOrderItems.order.orderNumber}</p>
                  </div>
                  <div className="col-6">
                    <p className="text-xs text-color-secondary mb-1 m-0">{t('date')}</p>
                    <p className="font-medium m-0">{formatDate(selectedOrderItems.order.dateCreated)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="px-4">
              <div className="flex flex-column gap-2 pb-3">
                <h3 className="font-semibold text-color flex align-items-center gap-2 m-0 py-2 sticky surface-card" style={{ top: 0 }}>
                  <Package style={{ width: '1rem', height: '1rem' }} />
                  {t('products')}
                  <span className="text-sm text-color-secondary">({selectedOrderItems.items.length})</span>
                </h3>

                {selectedOrderItems.items.length === 0 ? (
                  <p className="text-center text-color-secondary py-5">{t('noProductsInCategory')}</p>
                ) : (
                  <div className="flex flex-column gap-2">
                    {selectedOrderItems.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex align-items-center justify-content-between p-3 surface-card border-1 surface-border border-round-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-color m-0">
                            {item.productName || `${t('cartProduct')} ${item.productId}`}
                          </p>
                          <p className="text-sm text-color-secondary m-0">
                            {t('quantity')}: {item.quantity} × {formatCurrency(item.unitPrice, language)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary m-0">{formatCurrency(item.total, language)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Dialog>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        pdfUrl={pdfUrl}
        title={pdfTitle}
      />
    </div>
  );
}
