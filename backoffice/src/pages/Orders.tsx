import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, deliveryPersonService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Package, Phone, MapPin, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { DateRangePicker } from '../components/ui/date-range-picker';
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
    if (statusFilter === 'unassigned') return !order.Status;
    return order.Status === statusFilter;
  });

  // Count orders by status
  const statusCounts = {
    all: filteredOrders.length,
    unassigned: filteredOrders.filter((o: any) => !o.Status).length,
    to_delivery: filteredOrders.filter((o: any) => o.Status === 'to_delivery').length,
    in_delivery: filteredOrders.filter((o: any) => o.Status === 'in_delivery').length,
    delivered: filteredOrders.filter((o: any) => o.Status === 'delivered').length,
    canceled: filteredOrders.filter((o: any) => o.Status === 'canceled').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200/60 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-slate-700 hover:text-amber-600 font-semibold flex items-center gap-2 transition-colors">
                <Package className="w-5 h-5" />
                ← {t('dashboard')}
              </Link>
              <h1 className="text-xl font-bold text-slate-800">{t('orderManagement')}</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Search and Filter */}
      <div className="bg-white border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* Search Bar and Date Picker Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-700 placeholder:text-slate-400"
              />
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
              placeholder={t('selectDate') || 'Select date range'}
            />
          </div>

          {/* Status Filter Tabs */}
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {ordersLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-slate-200/60">
            <Package className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-800 font-semibold text-lg mb-2">{t('noOrdersFound')}</p>
            <p className="text-sm text-slate-500">
              {statusFilter === 'all' 
                ? t('noOrdersFound')
                : `${t('noOrdersFound')}`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map((order: any) => (
              <div key={order.OrderId} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-lg hover:border-slate-300/60 transition-all duration-200">
                {/* Card Header */}
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 tracking-wide">#{order.OrderNumber}</span>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${getStatusColor(order.Status)}`}>
                      <span className="text-base">{getStatusIcon(order.Status)}</span>
                      <span>{getStatusLabel(order.Status)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    {new Date(order.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  {/* Customer - Most Prominent */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/30">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-800 leading-snug">{order.CustomerName}</p>
                      <a href={`tel:${order.CustomerPhone}`} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1.5 mt-1 transition-colors">
                        <Phone className="w-3.5 h-3.5" />
                        {order.CustomerPhone}
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  {order.CustomerAddress && (
                    <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-xs text-slate-600 flex-1 line-clamp-2 leading-relaxed">{order.CustomerAddress}</p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('total')}</span>
                      <span className="text-lg font-bold text-amber-600">{order.TotalAmount?.toFixed(2)} <span className="text-sm">{t('currency')}</span></span>
                    </div>
                  </div>

                  {/* Assignment - More Prominent */}
                  <div className="border-t border-slate-100 pt-4">
                    <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wide">
                      {t('assignTo')}
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={order.DeliveryPersonId || ''}
                        onChange={(e) => handleAssign(order.OrderId, e.target.value)}
                        className={`flex-1 border-2 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium ${
                          order.DeliveryPersonId 
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50' 
                            : 'border-slate-200 text-slate-600 hover:border-amber-400'
                        }`}
                        disabled={order.Status === 'delivered'}
                      >
                        <option value="">{order.DeliveryPersonId ? '✓ Assigned' : t('selectDeliveryPerson')}</option>
                        {deliveryPersons.filter((p: any) => p.IsActive).map((person: any) => (
                          <option key={person.Id} value={person.Id}>{person.Name}</option>
                        ))}
                      </select>
                      {order.DeliveryPersonId && (
                        <button
                          onClick={() => setUnassignOrderId(order.OrderId)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
                          title={t('unassign')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}
