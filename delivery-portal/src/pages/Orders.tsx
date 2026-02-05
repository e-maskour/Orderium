import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../components/ui/use-toast';
import { deliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { NotificationBell } from '../components/NotificationBell';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { Loader2, Package, LogOut, Truck, ChevronLeft, ChevronRight, Phone, MapPin, Navigation, Filter, X, CheckCircle } from 'lucide-react';
import type { Order } from '../types';

interface DateRange {
  start?: Date;
  end?: Date;
}

export default function Orders() {
  const { deliveryPerson, logout } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({});
  
  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState({
    orderNumber: '',
    customerName: '',
    startDate: '',
    endDate: '',
  });
  
  const statusScrollRef = useRef<HTMLDivElement>(null);

  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['orders', deliveryPerson?.id, currentPage, pageSize, appliedFilters],
    queryFn: () => deliveryPerson ? deliveryService.getMyOrders(deliveryPerson.id, {
      page: currentPage,
      pageSize,
      ...appliedFilters,
    }) : Promise.resolve({ success: true, orders: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }),
    enabled: !!deliveryPerson,
  });

  const orders = ordersData?.orders || [];
  const totalCount = ordersData?.total || 0;
  const totalPages = ordersData?.totalPages || 0;

  // Mutation for updating order status
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered' }) => 
      deliveryService.updateOrderStatus(orderId, status, deliveryPerson!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: t('statusUpdated'),
        variant: 'default',
      });
    },
    onError: () => {
      toast({
        title: t('statusUpdateFailed'),
        variant: 'destructive',
      });
    },
  });

  const filteredOrders = orders.filter((order: Order) => 
    deliveryStatusFilter === 'all' || order.status === deliveryStatusFilter
  );

  // Count orders by delivery status
  const deliveryStatusCounts = {
    all: filteredOrders.length,
    pending: filteredOrders.filter((o: Order) => o.status === 'pending').length,
    assigned: filteredOrders.filter((o: Order) => o.status === 'assigned').length,
    confirmed: filteredOrders.filter((o: Order) => o.status === 'confirmed').length,
    picked_up: filteredOrders.filter((o: Order) => o.status === 'picked_up').length,
    to_delivery: filteredOrders.filter((o: Order) => o.status === 'to_delivery').length,
    in_delivery: filteredOrders.filter((o: Order) => o.status === 'in_delivery').length,
    delivered: filteredOrders.filter((o: Order) => o.status === 'delivered').length,
    canceled: filteredOrders.filter((o: Order) => o.status === 'canceled').length,
  };

  const applyFilters = () => {
    setAppliedFilters({
      orderNumber: orderNumberFilter,
      customerName: customerNameFilter,
      startDate: dateRange.start ? dateRange.start.toISOString().split('T')[0] : '',
      endDate: dateRange.end ? dateRange.end.toISOString().split('T')[0] : '',
    });
    setCurrentPage(1);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setOrderNumberFilter('');
    setCustomerNameFilter('');
    setDateRange({});
    setAppliedFilters({
      orderNumber: '',
      customerName: '',
      startDate: '',
      endDate: '',
    });
    setCurrentPage(1);
    setShowFilters(false);
  };

  // Scroll functions for status bar
  const scrollStatusLeft = () => {
    if (statusScrollRef.current) {
      statusScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollStatusRight = () => {
    if (statusScrollRef.current) {
      statusScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Get delivery status badge
  const getDeliveryStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; icon: string; className: string }> = {
      pending: {
        label: t('pending'),
        icon: '⏳',
        className: 'bg-slate-100 text-slate-700 border border-slate-300'
      },
      assigned: {
        label: t('assigned'),
        icon: '👤',
        className: 'bg-blue-100 text-blue-700 border border-blue-300'
      },
      confirmed: {
        label: t('confirmed'),
        icon: '✓',
        className: 'bg-cyan-100 text-cyan-700 border border-cyan-300'
      },
      picked_up: {
        label: t('pickedUp'),
        icon: '📦',
        className: 'bg-purple-100 text-purple-700 border border-purple-300'
      },
      to_delivery: {
        label: t('toDelivery'),
        icon: '⚠️',
        className: 'bg-amber-100 text-amber-700 border border-amber-300'
      },
      in_delivery: {
        label: t('inDelivery'),
        icon: '🚗',
        className: 'bg-orange-100 text-orange-700 border border-orange-300'
      },
      delivered: {
        label: t('delivered'),
        icon: '✅',
        className: 'bg-green-100 text-green-700 border border-green-300'
      },
      canceled: {
        label: t('canceled'),
        icon: '❌',
        className: 'bg-red-100 text-red-700 border border-red-300'
      },
    };

    return statusMap[status || 'pending'] || statusMap.pending;
  };

  // Get the timestamp for the current delivery status
  const getStatusTimestamp = (order: Order): string | null => {
    const timestampMap: Record<string, string | undefined> = {
      pending: order.pendingAt,
      assigned: order.assignedAt,
      confirmed: order.confirmedAt,
      picked_up: order.pickedUpAt,
      to_delivery: order.toDeliveryAt,
      in_delivery: order.inDeliveryAt,
      delivered: order.deliveredAt,
      canceled: order.canceledAt,
    };

    return timestampMap[order.status || 'pending'] || null;
  };

  // Format timestamp for display
  const formatStatusTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Open navigation apps
  const openNavigation = (order: Order, app: 'google' | 'waze') => {
    if (!order.latitude || !order.longitude) return;
    
    const url = app === 'waze'
      ? `https://waze.com/ul?ll=${order.latitude},${order.longitude}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`;
    
    window.open(url, '_blank');
  };

  // Get workflow action button based on current status
  const getWorkflowButton = (order: Order) => {
    // Show success message for delivered orders
    if (order.status === 'delivered') {
      return (
        <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-green-700">{t('orderDelivered')}</span>
        </div>
      );
    }

    // Show canceled message for canceled orders
    if (order.status === 'canceled') {
      return (
        <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-600" />
          <span className="text-sm font-semibold text-red-700">{t('orderCanceled')}</span>
        </div>
      );
    }

    const statusActions: Record<string, { label: string; nextStatus: 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered'; bgColor: string }> = {
      assigned: {
        label: t('confirmOrder'),
        nextStatus: 'confirmed',
        bgColor: 'bg-cyan-500 hover:bg-cyan-600'
      },
      confirmed: {
        label: t('pickUpOrder'),
        nextStatus: 'picked_up',
        bgColor: 'bg-purple-500 hover:bg-purple-600'
      },
      picked_up: {
        label: t('startToDelivery'),
        nextStatus: 'to_delivery',
        bgColor: 'bg-amber-500 hover:bg-amber-600'
      },
      to_delivery: {
        label: t('startDelivery'),
        nextStatus: 'in_delivery',
        bgColor: 'bg-orange-500 hover:bg-orange-600'
      },
      in_delivery: {
        label: t('markAsDelivered'),
        nextStatus: 'delivered',
        bgColor: 'bg-green-500 hover:bg-green-600'
      },
    };

    const action = statusActions[order.status || ''];
    if (!action) return null;

    return (
      <button
        onClick={() => updateStatusMutation.mutate({ orderId: order.orderId, status: action.nextStatus })}
        disabled={updateStatusMutation.isPending}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 ${action.bgColor} text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {updateStatusMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t('updating')}</span>
          </>
        ) : (
          <span>{action.label}</span>
        )}
      </button>
    );
  };

  const formatOrderDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-md flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">O</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('myDeliveries')}</h1>
                <p className="text-sm text-slate-600 mt-1">
                  {t('welcomeBack')}, {deliveryPerson?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <LanguageToggle />
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('signOut')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">{t('filters')}</span>
            {(appliedFilters.orderNumber || appliedFilters.customerName || appliedFilters.startDate || appliedFilters.endDate) && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full font-semibold">
                {[appliedFilters.orderNumber, appliedFilters.customerName, appliedFilters.startDate, appliedFilters.endDate].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel Overlay */}
        {showFilters && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowFilters(false)}
            />
            
            {/* Slide-in Panel */}
            <div className="fixed inset-y-0 end-0 w-full sm:w-[520px] md:w-[560px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-amber-600">
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-bold text-white">{t('filters')}</h2>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Panel Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Order Number */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-2 block">{t('orderNumber')}</label>
                  <input
                    type="text"
                    value={orderNumberFilter}
                    onChange={(e) => setOrderNumberFilter(e.target.value)}
                    placeholder={t('enterOrderNumber')}
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                  />
                </div>

                {/* Customer Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-2 block">{t('customerName')}</label>
                  <input
                    type="text"
                    value={customerNameFilter}
                    onChange={(e) => setCustomerNameFilter(e.target.value)}
                    placeholder={t('enterCustomerName')}
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                  />
                </div>

                {/* Date Range */}
                <div className="pb-6 border-b border-slate-200">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 block">{t('dateRange')}</label>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    placeholder={t('selectDateRange')}
                  />
                </div>
              </div>

              {/* Panel Footer */}
              <div className="border-t border-slate-200 p-4 bg-slate-50 flex gap-3">
                <button
                  onClick={resetFilters}
                  className="flex-1 px-4 py-2.5 bg-white text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-100 border border-slate-300 transition-colors"
                >
                  {t('reset')}
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition-colors"
                >
                  {t('apply')}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Delivery Status Filter Bar */}
        <div className="mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t('deliveryStatus')}</h3>
              </div>
              
              {/* Left/Right scroll buttons - Mobile only */}
              <div className="flex items-center gap-1 lg:hidden">
                <button
                  onClick={scrollStatusLeft}
                  className="bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={scrollStatusRight}
                  className="bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
            
            {/* Status buttons container */}
            <div 
              ref={statusScrollRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide lg:flex-wrap scroll-smooth"
            >
              {[
                { key: 'all', label: t('all'), icon: '📦' },
                { key: 'pending', label: t('pending'), icon: '⏳' },
                { key: 'assigned', label: t('assigned'), icon: '👤' },
                { key: 'confirmed', label: t('confirmed'), icon: '✓' },
                { key: 'picked_up', label: t('pickedUp'), icon: '📦' },
                { key: 'to_delivery', label: t('toDelivery'), icon: '⚠️' },
                { key: 'in_delivery', label: t('inDelivery'), icon: '🚗' },
                { key: 'delivered', label: t('delivered'), icon: '✅' },
                { key: 'canceled', label: t('canceled'), icon: '❌' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setDeliveryStatusFilter(filter.key)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    deliveryStatusFilter === filter.key
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm">{filter.icon}</span>
                  <span className="whitespace-nowrap">{filter.label}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    deliveryStatusFilter === filter.key 
                      ? 'bg-white/25 text-white' 
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {deliveryStatusCounts[filter.key as keyof typeof deliveryStatusCounts]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="mt-6 px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm text-slate-600">
                {t('showing')} <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> {t('to')}{' '}
                <span className="font-semibold">{Math.min(currentPage * pageSize, totalCount)}</span> {t('of')} <span className="font-semibold">{totalCount}</span> {t('results')}
              </div>
              
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">{t('perPage')}</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
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
                  <span className="text-sm font-medium text-slate-700">{currentPage}</span>
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

        {/* Orders Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-600">{t('error')}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
            <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noOrdersFound')}</h3>
            <p className="text-slate-600">
              {deliveryStatusFilter === 'all' 
                ? t('noOrdersAssigned')
                : `${t('noOrdersMessage')} ${getDeliveryStatusBadge(deliveryStatusFilter).label}`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map((order: Order) => (
              <div 
                key={order.orderId} 
                className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col"
              >
                {/* Fixed Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200 rounded-t-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">#{order.orderNumber}</span>
                        <span className="text-xs text-slate-500">{formatOrderDate(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Delivery Status Badge */}
                  <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm w-fit ${getDeliveryStatusBadge(order.status || null).className}`}>
                      {getDeliveryStatusBadge(order.status || null).icon}
                      <span>{getDeliveryStatusBadge(order.status || null).label}</span>
                    </span>
                    {getStatusTimestamp(order) && (
                      <span className="text-xs text-slate-500 font-medium">
                        {formatStatusTimestamp(getStatusTimestamp(order))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Content */}
                <div className="px-4 py-3 space-y-2.5 flex-1">
                  {/* Customer Section */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-amber-200">
                      <Package className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{order.customerName}</p>
                      <a href={`tel:${order.customerPhone}`} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 mt-0.5 transition-colors">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{order.customerPhone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Address Section */}
                  {order.customerAddress && (
                    <div className="flex items-start gap-2.5 bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                      <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-blue-600" />
                      </div>
                      <p className="text-xs text-slate-700 leading-tight flex-1 line-clamp-2">{order.customerAddress}</p>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  {order.latitude && order.longitude && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openNavigation(order, 'google')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Google Maps</span>
                      </button>
                      <button
                        onClick={() => openNavigation(order, 'waze')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Waze</span>
                      </button>
                    </div>
                  )}

                  {/* Workflow Action Button */}
                  {getWorkflowButton(order)}
                </div>

                {/* Fixed Footer */}
                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between flex-shrink-0 rounded-b-xl">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('total')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-amber-600">{order.totalAmount?.toFixed(2)}</span>
                    <span className="text-xs font-semibold text-slate-500">{t('currency')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
