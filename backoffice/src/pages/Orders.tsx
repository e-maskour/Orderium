import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, deliveryPersonService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { useState, useEffect, useMemo } from 'react';
import { Phone, MapPin, X, Search, Package, Eye, Download, CheckSquare, Square, UserPlus, Grid3x3, List } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { FloatingActionBar, FloatingAction } from '../components/FloatingActionBar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

export default function Orders() {
  const { t } = useLanguage();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [unassignOrderId, setUnassignOrderId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled'>('all');
  
  // Date filter states
  const [dateFilterType, setDateFilterType] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>(() => {
    // Initialize with today's date
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start: startOfDay, end: endOfDay };
  });

  // Get date range based on filter type
  const getDateRange = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (dateFilterType) {
      case 'today':
        return { start: startOfDay, end: endOfDay };
      
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const startYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const endYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        return { start: startYesterday, end: endYesterday };
      
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
      
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start: startOfMonth, end: endOfMonth };
      
      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start: startOfYear, end: endOfYear };
      
      case 'custom':
        if (dateRange.start && dateRange.end) {
          return { start: dateRange.start, end: dateRange.end };
        } else if (dateRange.start) {
          const endCustom = new Date(dateRange.start);
          endCustom.setHours(23, 59, 59, 999);
          return { start: dateRange.start, end: endCustom };
        }
        return { start: startOfDay, end: endOfDay };
      
      default:
        return { start: startOfDay, end: endOfDay };
    }
  }, [dateFilterType, dateRange]);

  // Enable real-time notifications
  useOrderNotifications({
    token: admin?.Token || localStorage.getItem('adminToken'),
    enabled: !!admin,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', searchQuery, dateFilterType, dateRange],
    queryFn: () => orderService.getAll(searchQuery, getDateRange.start, getDateRange.end),
  });

  const { data: deliveryPersons = [] } = useQuery({
    queryKey: ['deliveryPersons'],
    queryFn: deliveryPersonService.getAll,
  });

  const { data: orderDetails, isLoading: orderDetailsLoading } = useQuery({
    queryKey: ['orderDetails', selectedOrderId],
    queryFn: () => orderService.getById(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, deliveryPersonId }: { orderId: number; deliveryPersonId: number }) =>
      orderService.assignToDelivery(orderId, deliveryPersonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('orderAssigned'));
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToAssign')}: ${error.message}`);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (orderId: number) => orderService.unassignOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('orderUnassigned'));
      setUnassignOrderId(null);
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToUnassign')}: ${error.message}`);
    },
  });

  const handleAssign = (orderId: number, deliveryPersonId: string) => {
    if (!deliveryPersonId) return;
    assignMutation.mutate({ orderId, deliveryPersonId: parseInt(deliveryPersonId) });
  };

  const handleUnassign = () => {
    if (unassignOrderId) {
      unassignMutation.mutate(unassignOrderId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to_delivery': return 'bg-amber-50 text-amber-700 border border-amber-200/50';
      case 'in_delivery': return 'bg-blue-50 text-blue-700 border border-blue-200/50';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
      case 'canceled': return 'bg-red-50 text-red-700 border border-red-200/50';
      default: return 'bg-slate-50 text-slate-600 border border-slate-200/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'to_delivery': return '📋';
      case 'in_delivery': return '🚚';
      case 'delivered': return '✅';
      case 'canceled': return '❌';
      default: return '⏳';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'to_delivery': return t('toDelivery');
      case 'in_delivery': return t('inDelivery');
      case 'delivered': return t('delivered');
      case 'canceled': return t('canceled');
      default: return status || t('unassigned');
    }
  };

  // Filter orders by status (no date filtering on client - done on server)
  const filteredOrders = orders.filter((order: any) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'unassigned') return !order.status;
    return order.status === statusFilter;
  });

  // Count orders by status - use full orders list, not filtered
  const statusCounts = {
    all: orders.length,
    unassigned: orders.filter((o: any) => !o.status).length,
    to_delivery: orders.filter((o: any) => o.status === 'to_delivery').length,
    in_delivery: orders.filter((o: any) => o.status === 'in_delivery').length,
    delivered: orders.filter((o: any) => o.status === 'delivered').length,
    canceled: orders.filter((o: any) => o.status === 'canceled').length,
  };

  // Selection handlers
  const toggleSelectOrder = (orderId: number) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((o: any) => o.OrderId));
    }
  };

  const clearSelection = () => setSelectedOrders([]);

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('orders')}</h1>
            <p className="text-slate-600">{t('viewAndAssignOrders')}</p>
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
                placeholder={t('searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full sm:w-80 ps-10 pe-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                setDateRange(range);
                if (range.start || range.end) {
                  setDateFilterType('custom');
                }
              }}
              placeholder={t('selectDate')}
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {[
              { key: 'all', label: t('all'), color: 'slate' },
              { key: 'unassigned', label: t('unassigned'), color: 'slate' },
              { key: 'to_delivery', label: t('toDelivery'), color: 'amber' },
              { key: 'in_delivery', label: t('inDelivery'), color: 'blue' },
              { key: 'delivered', label: t('delivered'), color: 'emerald' },
              { key: 'canceled', label: t('canceled'), color: 'red' }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key as any)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    statusFilter === filter.key
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {filter.label}
                  <span className={`ml-2 rtl:mr-2 rtl:ml-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    statusFilter === filter.key 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {statusCounts[filter.key as keyof typeof statusCounts]}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* Orders Content - Scrollable */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {ordersLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center flex-1 p-16">
              <div className="text-center">
                <Package className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-800 font-semibold text-lg mb-2">{t('noOrdersFound')}</p>
                <p className="text-sm text-slate-500">
                  {statusFilter === 'all' 
                    ? t('noOrdersFound')
                    : `${t('noOrdersFound')}`
                  }
                </p>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-3">
                {filteredOrders.map((order: any) => (
              <div
                key={order.OrderId}
                onClick={() => toggleSelectOrder(order.OrderId)}
                className={`relative bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${
                  selectedOrders.includes(order.OrderId)
                    ? 'border-amber-500 ring-2 ring-amber-500/20'
                    : 'border-slate-200/60 hover:border-slate-300/60'
                }`}
              >
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    {/* Selection Checkbox */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          selectedOrders.includes(order.OrderId)
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {selectedOrders.includes(order.OrderId) && (
                          <CheckSquare className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Order Number & Status */}
                    <div className="flex-shrink-0 w-32">
                      <span className="text-sm font-semibold text-slate-500">#{order.OrderNumber}</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${getStatusColor(order.status)}`}>
                        <span className="text-base">{getStatusIcon(order.status)}</span>
                        <span>{getStatusLabel(order.status)}</span>
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="w-48 min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/30">
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{order.CustomerName}</p>
                        <a href={`tel:${order.CustomerPhone}`} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 transition-colors">
                          <Phone className="w-3 h-3" />
                          {order.CustomerPhone}
                        </a>
                      </div>
                    </div>

                    {/* Address */}
                    {order.CustomerAddress && (
                      <div className="flex-1 min-w-0 flex items-center gap-2" title={order.CustomerAddress}>
                        <div className="w-6 h-6 bg-amber-100 rounded-md flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-3 h-3 text-amber-600" />
                        </div>
                        <p className="text-xs text-slate-600 truncate">{order.CustomerAddress}</p>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">{t('total')}</span>
                      <span className="text-base font-bold text-amber-600 block mt-0.5">
                        {order.totalAmount?.toFixed(2)} <span className="text-xs">{t('currency')}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map((order: any) => (
              <div 
                key={order.OrderId} 
                onClick={() => toggleSelectOrder(order.OrderId)}
                className={`relative bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  selectedOrders.includes(order.OrderId) 
                    ? 'border-amber-500 ring-2 ring-amber-500/20' 
                    : 'border-slate-200/60 hover:border-slate-300/60'
                }`}
              >
                {/* Card Header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        selectedOrders.includes(order.OrderId)
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {selectedOrders.includes(order.OrderId) && (
                        <CheckSquare className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2 ml-8">
                    <span className="text-xs font-semibold text-slate-500 tracking-wide">#{order.OrderNumber}</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${getStatusColor(order.status)}`}>
                      <span className="text-base">{getStatusIcon(order.status)}</span>
                      <span>{getStatusLabel(order.status)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Customer - Most Prominent */}
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/30">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{order.CustomerName}</p>
                      <a href={`tel:${order.CustomerPhone}`} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 mt-0.5 transition-colors">
                        <Phone className="w-3 h-3" />
                        {order.CustomerPhone}
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  {order.CustomerAddress && (
                    <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100" title={order.CustomerAddress}>
                      <div className="w-6 h-6 bg-amber-100 rounded-md flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-amber-600" />
                      </div>
                      <p className="text-xs text-slate-600 flex-1 line-clamp-1 leading-relaxed">{order.CustomerAddress}</p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-slate-100 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('total')}</span>
                      <span className="text-base font-bold text-amber-600">{order.totalAmount?.toFixed(2)} <span className="text-xs">{t('currency')}</span></span>
                    </div>
                  </div>
                </div>
              </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrderId && orderDetails && (
        <OrderDetailsModal
          order={orderDetails}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedOrders.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={selectedOrders.length === filteredOrders.length}
        totalCount={filteredOrders.length}
        actions={[
          {
            id: 'details',
            label: t('details'),
            icon: <Eye className="w-3.5 h-3.5" />,
            onClick: () => setSelectedOrderId(selectedOrders[0]),
            hidden: selectedOrders.length !== 1,
          },
          {
            id: 'receipt',
            label: t('receipt'),
            icon: <Download className="w-3.5 h-3.5" />,
            onClick: () => {
              toast.success(`${t('downloading')} ${selectedOrders.length} ${t('receipts')}...`);
            },
          },
          {
            id: 'invoice',
            label: t('invoice'),
            icon: <Download className="w-3.5 h-3.5" />,
            onClick: () => {
              toast.success(`${t('downloading')} ${selectedOrders.length} ${t('invoices')}...`);
            },
          },
        ]}
      >
        {/* Assign to Delivery - Custom Dropdown */}
        <div className="relative group">
          <select
            onChange={(e) => {
              if (e.target.value) {
                selectedOrders.forEach(orderId => {
                  const order = filteredOrders.find((o: any) => o.OrderId === orderId);
                  if (order && order.status !== 'delivered') {
                    handleAssign(orderId, e.target.value);
                  }
                });
                clearSelection();
                e.target.value = '';
              }
            }}
            className="px-3 py-1.5 bg-white text-amber-600 rounded-lg hover:bg-amber-50 transition-all shadow-md font-semibold text-sm cursor-pointer appearance-none pr-8"
          >
            <option value="">
              {t('assignToDelivery')}
            </option>
            {deliveryPersons.filter((p: any) => p.isActive).map((person: any) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </div>
      </FloatingActionBar>

      <AlertDialog open={unassignOrderId !== null} onOpenChange={(open) => !open && setUnassignOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('unassignOrder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('unassignOrderConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign}>{t('unassign')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
