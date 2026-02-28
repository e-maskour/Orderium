import { useEffect, useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { ordersService } from '@/modules/orders';
import { Order, OrderItem } from '@/modules/orders/orders.interface';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { OrderTracking } from '@/components/OrderTracking';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Package, Loader2, MapPin, Calendar, ArrowLeft, ShoppingBag, Eye, Search, X, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Applied filters - only these trigger API requests
  const [appliedFilters, setAppliedFilters] = useState({
    orderNumber: '',
    dateRange: { start: undefined as Date | undefined, end: undefined as Date | undefined },
  });

  // Temporary filter states (used in filter panel)
  const [orderNumberSearch, setOrderNumberSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({ start: undefined, end: undefined });

  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const backdropRef = useRef<HTMLDivElement>(null);

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

  // Sync temporary filters with applied filters when panel opens
  useEffect(() => {
    if (filtersExpanded) {
      setOrderNumberSearch(appliedFilters.orderNumber);
      setDateRange(appliedFilters.dateRange);
    }
  }, [filtersExpanded, appliedFilters]);


  // Count orders by status (from API results)
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

  // Pagination calculation
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  const getStatusLabel = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: t('statusPending'), color: 'bg-blue-100 text-blue-700' },
      assigned: { label: t('statusAssigned'), color: 'bg-purple-100 text-purple-700' },
      confirmed: { label: t('statusConfirmed'), color: 'bg-indigo-100 text-indigo-700' },
      picked_up: { label: t('statusPickedUp'), color: 'bg-cyan-100 text-cyan-700' },
      to_delivery: { label: t('statusToDelivery'), color: 'bg-orange-100 text-orange-700' },
      in_delivery: { label: t('statusInDelivery'), color: 'bg-yellow-100 text-yellow-700' },
      delivered: { label: t('statusDelivered'), color: 'bg-green-100 text-green-700' },
      canceled: { label: t('statusCanceled'), color: 'bg-red-100 text-red-700' },
    };

    // If no status, default to pending
    const normalizedStatus = status || 'pending';
    const statusInfo = statusMap[normalizedStatus] || statusMap.pending;

    return statusInfo;
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

    // Close order details modal before opening preview
    setSelectedOrderItems(null);
    setShowPDFPreview(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={dir}>
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user?.customerId) {
    return (
      <div className="min-h-screen bg-background py-6 px-4" dir={dir}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
            {t('myOrders')}
          </h1>
          <div className="bg-card rounded-xl shadow-card p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('cannotLoadOrders')}
            </h3>
            <p className="text-muted-foreground">
              {t('noCustomerId')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-3 sm:py-4 md:py-6 px-2 sm:px-3 md:px-4" dir={dir}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="h-8 w-8 sm:h-10 sm:w-10 p-0"
              >
                <ArrowLeft className={`h-4 w-4 sm:h-5 sm:w-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary" />
                  {t('myOrders')}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                  {t('trackAndManage')}
                </p>
              </div>
            </div>
          </div>

          {/* Filter Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${filtersExpanded
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-foreground border border-border hover:bg-muted'
                }`}
            >
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t('filters')}</span>
              {filtersExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              {/* Active Filter Count Badge */}
              {(appliedFilters.orderNumber || appliedFilters.dateRange.start || appliedFilters.dateRange.end) && !filtersExpanded && (
                <span className={`${dir === 'rtl' ? 'mr-1' : 'ml-1'} px-1.5 sm:px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full`}>
                  {[Boolean(appliedFilters.orderNumber), Boolean(appliedFilters.dateRange.start || appliedFilters.dateRange.end)].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Delivery Status Filter */}
        <div className="mb-4 sm:mb-6">
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-2">
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
                onClick={() => setStatusFilter(filter.key as 'all' | 'pending' | 'assigned' | 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1 sm:gap-1.5 ${statusFilter === filter.key
                    ? 'bg-amber-500 text-white shadow-md sm:shadow-lg shadow-amber-500/30'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 sm:border-2 hover:border-slate-300'
                  }`}
              >
                <span className="text-xs sm:text-sm">{filter.icon}</span>
                <span className="hidden sm:inline">{filter.label}</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-semibold ${statusFilter === filter.key
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200 text-slate-600'
                  }`}>
                  {statusCounts[filter.key as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters Overlay Panel */}
        {filtersExpanded && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[40] transition-opacity"
              onClick={() => setFiltersExpanded(false)}
            />

            {/* Slide-in Panel */}
            <div className={`fixed inset-y-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-full sm:w-[520px] md:w-[560px] bg-background shadow-2xl z-[45] flex flex-col animate-in ${dir === 'rtl' ? 'slide-in-from-left' : 'slide-in-from-right'} duration-300`}>
              {/* Panel Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary to-primary/90">
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-primary-foreground" />
                  <h2 className="text-lg font-bold text-primary-foreground">{t('filters')}</h2>
                </div>
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="p-2 hover:bg-primary-foreground/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-primary-foreground" />
                </button>
              </div>

              {/* Panel Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Search Section */}
                <div className="pb-6 border-b border-border">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide mb-4 block flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    {t('search')}
                  </label>

                  {/* Order Number Search */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">{t('orderNumber')}</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('enterOrderNumber')}
                        value={orderNumberSearch}
                        onChange={(e) => setOrderNumberSearch(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border-2 border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
                      />
                      {orderNumberSearch && (
                        <button
                          onClick={() => setOrderNumberSearch('')}
                          className={`absolute ${dir === 'rtl' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date Range Section */}
                <div>
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide mb-3 block flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {t('dateRange')}
                  </label>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    placeholder={t('selectDate')}
                  />
                </div>

              </div>

              {/* Panel Footer */}
              <div className="border-t border-border p-4 bg-muted flex gap-3">
                <button
                  onClick={() => {
                    setOrderNumberSearch('');
                    setDateRange({ start: undefined, end: undefined });
                    setStatusFilter('all');
                    setCurrentPage(1);
                    setAppliedFilters({
                      orderNumber: '',
                      dateRange: { start: undefined, end: undefined },
                    });
                    setFiltersExpanded(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-background text-foreground rounded-lg font-medium text-sm hover:bg-muted border border-border transition-colors"
                >
                  {t('reset')}
                </button>
                <button
                  onClick={() => {
                    setCurrentPage(1);
                    setAppliedFilters({
                      orderNumber: orderNumberSearch,
                      dateRange: { start: dateRange.start, end: dateRange.end },
                    });
                    setFiltersExpanded(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 shadow-lg transition-colors"
                >
                  {t('apply')}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Orders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('noOrdersFound')}
            </h3>
            <p className="text-muted-foreground">
              {appliedFilters.orderNumber ? t('noResultsMessage') : t('noOrdersYet')}
            </p>
          </div>
        ) : (
          <>
            {/* Pagination Info Bar - Top */}
            {totalCount > 0 && (
              <div className="px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 flex flex-row items-center justify-between gap-1.5 sm:gap-3 text-xs sm:text-sm">
                {/* Left: Showing info */}
                <div className="text-muted-foreground hidden md:block flex-shrink-0">
                  {t('showing')} <span className="font-semibold text-foreground">{startIndex}</span> {t('to')}
                  {' '}<span className="font-semibold text-foreground">{endIndex}</span> {t('of')}{' '}
                  <span className="font-semibold text-foreground">{totalCount}</span> {t('results')}
                </div>

                {/* Center: Page Size Selector */}
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <label className="text-xs font-medium text-muted-foreground hidden lg:inline">{t('perPage')}</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-1.5 sm:px-2 py-1 sm:py-1.5 border border-border rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-foreground bg-background hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Right: Pagination Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0 ml-auto">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center px-1.5 sm:px-2 py-1 sm:py-1.5 border border-border rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-foreground bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('previous')}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2">
                    <span className="text-xs sm:text-sm font-medium text-foreground">{currentPage}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">/</span>
                    <span className="text-xs sm:text-sm font-medium text-foreground">{totalPages}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center px-1.5 sm:px-2 py-1 sm:py-1.5 border border-border rounded-md sm:rounded-lg text-xs sm:text-sm font-medium text-foreground bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('next')}
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Orders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
              {orders.map((order) => {
                const status = getStatusLabel(order.deliveryStatus);
                return (
                  <div
                    key={order.id}
                    className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-all group"
                  >
                    {/* Order Header */}
                    <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4 border-b border-border">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {t('orderNumber')}
                          </span>
                        </div>
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="font-mono font-bold text-base sm:text-lg text-foreground">
                        {order.orderNumber}
                      </p>
                    </div>

                    {/* Order Details */}
                    <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm">{formatDate(order.dateCreated)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border">
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                          {t('totalAmount')}
                        </span>
                        <span className="text-lg sm:text-xl font-bold text-primary">
                          {formatCurrency(order.total || 0, language)}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-1.5 sm:gap-2 pt-2 sm:pt-3">
                        {/* View Items Button */}
                        <Button
                          onClick={() => handleViewItems(order)}
                          className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                          variant="outline"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">{t('viewDetails')}</span>
                          <span className="sm:hidden">Details</span>
                        </Button>

                        {/* Track Button */}
                        {(order.deliveryStatus !== 'delivered' && order.deliveryStatus !== 'canceled') && (
                          <Button
                            onClick={() => setSelectedOrder(order.orderNumber)}
                            className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                          >
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            {t('track')}
                          </Button>
                        )}
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
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {t('trackOrder')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('trackAndManage')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedOrder && user?.customerId && (
              <>
                <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-muted-foreground">
                    {t('orderNumber')}
                  </p>
                  <p className="font-mono font-bold text-primary">{selectedOrder}</p>
                </div>
                <OrderTracking orderNumber={selectedOrder} customerId={user.customerId} />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Items Modal */}
      <Dialog open={!!selectedOrderItems} onOpenChange={() => setSelectedOrderItems(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl p-0 gap-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-3">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              {t('orderDetails')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('products')}
            </DialogDescription>
          </DialogHeader>
          {selectedOrderItems && (
            <>
              {/* Order Info - Fixed */}
              <div className="px-4 sm:px-6 pb-3">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('orderNumber')}
                      </p>
                      <p className="font-mono font-bold text-primary">{selectedOrderItems.order.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('date')}
                      </p>
                      <p className="font-medium">{formatDate(selectedOrderItems.order.dateCreated)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List - Scrollable */}
              <div className="px-4 sm:px-6 flex-1 overflow-y-auto min-h-0">
                <div className="space-y-3 pb-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 sticky top-0 bg-background py-2">
                    <Package className="w-4 h-4" />
                    {t('products')}
                    <span className="text-sm text-muted-foreground">
                      ({selectedOrderItems.items.length})
                    </span>
                  </h3>

                  {selectedOrderItems.items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t('noProductsInCategory')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedOrderItems.items.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {item.productName || `${t('cartProduct')} ${item.productId}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('quantity')}: {item.quantity} × {formatCurrency(item.unitPrice, language)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {formatCurrency(item.total, language)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Total - Fixed */}
              <div className="px-4 sm:px-6 py-4 border-t border-border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-foreground">
                    {t('total')}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedOrderItems.order.total || 0, language)}
                  </span>
                </div>

                {/* Preview Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handlePreview('receipt')}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('receipt')}
                  </Button>
                  <Button
                    onClick={() => handlePreview('invoice')}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('deliveryNote')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
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
