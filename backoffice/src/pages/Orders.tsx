import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService, deliveryPersonService, partnersService } from '../modules';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { useState, useEffect, useMemo } from 'react';
import { Phone, MapPin, X, Search, Package, Eye, CheckSquare, Square, UserPlus, Grid3x3, List, ShoppingCart, Trash2, Info, Receipt, Truck, Clock, User, CheckCircle, AlertCircle, XCircle, Navigation, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { Autocomplete } from '../components/ui/autocomplete';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { PDFPreviewModal } from '../components/PDFPreviewModal';
import { pdfService } from '../services/pdf.service';

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
  const { t, language } = useLanguage();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [unassignOrderId, setUnassignOrderId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchInput, setSearchInput] = useState('');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered' | 'canceled'>('all');
  const [fromClientFilter, setFromClientFilter] = useState<'all' | 'locale' | 'client'>('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Applied filters state - only these trigger API requests
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    deliveryStatus: 'all' as any,
    fromClient: 'all' as any,
    dateFilterType: 'today' as any,
    dateRange: (() => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start: startOfDay, end: endOfDay };
    })(),
  });
  
  // Search filter states - individual fields
  const [orderNumberSearch, setOrderNumberSearch] = useState('');
  const [customerNameSearch, setCustomerNameSearch] = useState('');
  const [customerPhoneSearch, setCustomerPhoneSearch] = useState('');
  const [deliveryPersonSearch, setDeliveryPersonSearch] = useState('');
  
  // Date filter states
  const [dateFilterType, setDateFilterType] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>(() => {
    // Initialize with today's date
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start: startOfDay, end: endOfDay };
  });

  // Get date range based on applied filter type
  const getDateRange = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (appliedFilters.dateFilterType) {
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
        if (appliedFilters.dateRange.start && appliedFilters.dateRange.end) {
          return { start: appliedFilters.dateRange.start, end: appliedFilters.dateRange.end };
        } else if (appliedFilters.dateRange.start) {
          const endCustom = new Date(appliedFilters.dateRange.start);
          endCustom.setHours(23, 59, 59, 999);
          return { start: appliedFilters.dateRange.start, end: endCustom };
        }
        return { start: startOfDay, end: endOfDay };
      
      default:
        return { start: startOfDay, end: endOfDay };
    }
  }, [appliedFilters.dateFilterType, appliedFilters.dateRange]);

  // Enable real-time notifications
  useOrderNotifications({
    token: (localStorage.getItem('adminToken') ?? undefined) as string | undefined,
    enabled: !!admin,
  });

  const { data: ordersData = { orders: [], count: 0, statusCounts: {} }, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', JSON.stringify(appliedFilters)],
    queryFn: () => ordersService.getAll(
      appliedFilters.search,
      getDateRange.start,
      getDateRange.end,
      true,
      appliedFilters.deliveryStatus !== 'all' ? appliedFilters.deliveryStatus : undefined,
      appliedFilters.fromClient !== 'locale' ? (appliedFilters.fromClient === 'client' ? true : undefined) : false,
    ),
  });

  const orders = ordersData.orders || [];
  const deliveryStatusCounts = ordersData.statusCounts || {};
  const fromClientCounts = {
    all: (deliveryStatusCounts.locale || 0) + (deliveryStatusCounts.client || 0),
    locale: deliveryStatusCounts.locale || 0,
    client: deliveryStatusCounts.client || 0,
  };

  const { data: deliveryPersons = [] } = useQuery({
    queryKey: ['deliveryPersons'],
    queryFn: deliveryPersonService.getAll,
  });

  const { data: partnersData } = useQuery({
    queryKey: ['partners'],
    queryFn: partnersService.getAll,
  });

  const partners = partnersData?.partners || [];

  const { data: orderDetails, isLoading: orderDetailsLoading } = useQuery({
    queryKey: ['orderDetails', selectedOrderId],
    queryFn: () => ordersService.getById(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, deliveryPersonId }: { orderId: number; deliveryPersonId: number }) =>
      ordersService.assignToDelivery(orderId, deliveryPersonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('orderAssigned'));
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToAssign')}: ${error.message}`);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (orderId: number) => ordersService.unassignOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('orderUnassigned'));
      setUnassignOrderId(null);
    },
    onError: (error: Error) => {
      toast.error(`${t('failedToUnassign')}: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      console.log('Deleting orders:', orderIds);
      return Promise.all(orderIds.map(async id => {
        try {
          await ordersService.delete(id);
          console.log('Deleted order:', id);
        } catch (error) {
          console.error('Failed to delete order:', id, error);
          throw error;
        }
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('ordersDeleted'));
      clearSelection();
      setDeleteConfirmOpen(false);
    },
    onError: (error: Error) => {
      console.error('Delete mutation error:', error);
      toast.error(`${t('failedToDelete')}: ${error.message}`);
      setDeleteConfirmOpen(false);
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

  const handlePreview = (documentType: 'receipt' | 'delivery-note') => {
    if (selectedOrders.length !== 1) {
      toast.error(t('selectOneOrder'));
      return;
    }

    const orderId = selectedOrders[0];
    const order = orders.find((o: any) => o.id === orderId);
    const label = pdfService.getDocumentLabel(documentType);
    const url = pdfService.getPDFUrl(documentType, orderId, 'preview');

    setPdfUrl(url);
    setPdfTitle(`${label} ${order?.orderNumber || ''}`.trim());
    setShowPDFPreview(true);
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

  const getSourceLabel = (order: any) => (order?.fromClient ? t('client') : t('local'));

  const getSourceBadge = (order: any) => {
    if (order?.fromClient) {
      return {
        label: t('client'),
        icon: <ShoppingCart className="w-3 h-3" />,
        className: 'bg-blue-50 text-blue-700 border border-blue-200',
      };
    }
    return {
      label: t('local'),
      icon: <Package className="w-3 h-3" />,
      className: 'bg-slate-100 text-slate-700 border border-slate-200',
    };
  };

  const getDeliveryStatusBadge = (deliveryStatus: string | null | undefined) => {
    switch (deliveryStatus) {
      case 'pending':
        return {
          label: t('pending'),
          icon: <Clock className="w-3.5 h-3.5" />,
          className: 'bg-slate-50 text-slate-700 border border-slate-200',
        };
      case 'assigned':
        return {
          label: t('assigned'),
          icon: <User className="w-3.5 h-3.5" />,
          className: 'bg-purple-50 text-purple-700 border border-purple-200',
        };
      case 'confirmed':
        return {
          label: t('confirmed'),
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          className: 'bg-blue-50 text-blue-700 border border-blue-200',
        };
      case 'picked_up':
        return {
          label: t('pickedUp'),
          icon: <Package className="w-3.5 h-3.5" />,
          className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
        };
      case 'to_delivery':
        return {
          label: t('toDelivery'),
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          className: 'bg-amber-50 text-amber-700 border border-amber-200',
        };
      case 'in_delivery':
        return {
          label: t('inDelivery'),
          icon: <Navigation className="w-3.5 h-3.5" />,
          className: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
        };
      case 'delivered':
        return {
          label: t('delivered'),
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        };
      case 'canceled':
        return {
          label: t('canceled'),
          icon: <XCircle className="w-3.5 h-3.5" />,
          className: 'bg-red-50 text-red-700 border border-red-200',
        };
      default:
        return {
          label: t('pending'),
          icon: <Clock className="w-3.5 h-3.5" />,
          className: 'bg-slate-50 text-slate-700 border border-slate-200',
        };
    }
  };

  const formatOrderDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const time = `${hours}:${minutes}`;
    
    if (language?.startsWith('fr')) {
      const monthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${date.getDate()} ${monthLabels[date.getMonth()]} ${date.getFullYear()} ${time}`;
    }
    
    const formattedDate = new Intl.DateTimeFormat('ar-MA', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
    
    return formattedDate;
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
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o: any) => o.id));
    }
  };

  const clearSelection = () => setSelectedOrders([]);

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex-shrink-0">
          <PageHeader
            icon={ShoppingCart}
            title={t('orders')}
            subtitle={t('viewAndAssignOrders')}
            actions={
              <>
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

                {/* Filters Toggle Button */}
                <button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filtersExpanded
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>{t('filters')}</span>
                  {filtersExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {/* Active Filter Count Badge */}
                  {(appliedFilters.search || appliedFilters.deliveryStatus !== 'all' || appliedFilters.fromClient !== 'all' || appliedFilters.dateFilterType !== 'today') && !filtersExpanded && (
                    <span className="ml-1 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                      {[appliedFilters.search, appliedFilters.deliveryStatus !== 'all', appliedFilters.fromClient !== 'all', appliedFilters.dateFilterType !== 'today'].filter(Boolean).length}
                    </span>
                  )}
                </button>
              </>
            }
          />
        </div>

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
                </div>
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Panel Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Search Filters Section */}
                <div className="pb-6 border-b border-slate-200">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 block flex items-center gap-2">
                    <Search className="w-4 h-4 text-amber-600" />
                    {t('search')}
                  </label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Order Number Search */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-2 block">{t('orderNumber')}</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="E.g., ORD-1001"
                          value={orderNumberSearch}
                          onChange={(e) => setOrderNumberSearch(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                        />
                        {orderNumberSearch && (
                          <button
                            onClick={() => setOrderNumberSearch('')}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Customer Name Search - Autocomplete */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-2 block">{t('customerName')}</label>
                      <Autocomplete
                        options={partners.map((partner: any) => ({
                          value: partner.name,
                          label: `${partner.name}${partner.phone ? ` (${partner.phone})` : ''}`
                        }))}
                        value={customerNameSearch}
                        onValueChange={setCustomerNameSearch}
                        placeholder={t('typeCustomerName')}
                        emptyMessage={t('noCustomersFound')}
                        allowCustomValue={true}
                      />
                    </div>

                    {/* Customer Phone Search */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-2 block">{t('phoneNumber')}</label>
                      <div className="relative">
                        <input
                          type="tel"
                          placeholder="E.g., 0612345678..."
                          value={customerPhoneSearch}
                          onChange={(e) => setCustomerPhoneSearch(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                        />
                        {customerPhoneSearch && (
                          <button
                            onClick={() => setCustomerPhoneSearch('')}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delivery Person Search */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-2 block">{t('deliveryPerson')}</label>
                      <select
                        value={deliveryPersonSearch}
                        onChange={(e) => setDeliveryPersonSearch(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all bg-white"
                      >
                        <option value="">{t('selectDeliveryPerson')}</option>
                        {deliveryPersons.filter((p: any) => p.isActive).map((person: any) => (
                          <option key={person.id} value={person.name}>{person.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 block flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    {t('dateRange')}
                  </label>
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

                {/* Delivery Status Filter - 3 Column Grid */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 block flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-600" />
                    {t('deliveryStatus')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
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
                        onClick={() => setDeliveryStatusFilter(filter.key as any)}
                        className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                          deliveryStatusFilter === filter.key
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-lg">{filter.icon}</span>
                        <span className="line-clamp-2 text-center leading-tight">{filter.label}</span>
                        <span className={`text-[10px] font-bold ${
                          deliveryStatusFilter === filter.key 
                            ? 'bg-white/25 text-white' 
                            : 'text-slate-500'
                        }`}>
                          {deliveryStatusCounts[filter.key as keyof typeof deliveryStatusCounts]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source Filter */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 block flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-amber-600" />
                    {t('orderSource')}
                  </label>
                  <div className="flex flex-col gap-2">
                    {[
                      { key: 'all', label: t('all') },
                      { key: 'locale', label: t('local') },
                      { key: 'client', label: t('client') }
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setFromClientFilter(filter.key as any)}
                        className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-between ${
                          fromClientFilter === filter.key
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span>{filter.label}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          fromClientFilter === filter.key 
                            ? 'bg-white/25 text-white' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {fromClientCounts[filter.key as keyof typeof fromClientCounts]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Footer */}
              <div className="border-t border-slate-200 p-4 bg-slate-50 flex gap-3">
                <button
                  onClick={() => {
                    // Reset temporary filters
                    setOrderNumberSearch('');
                    setCustomerNameSearch('');
                    setCustomerPhoneSearch('');
                    setDeliveryPersonSearch('');
                    setSearchInput('');
                    setDeliveryStatusFilter('all');
                    setFromClientFilter('all');
                    setDateFilterType('today');
                    // Update applied filters with reset values and today's date
                    const now = new Date();
                    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                    setAppliedFilters({
                      search: '',
                      deliveryStatus: 'all',
                      fromClient: 'all',
                      dateFilterType: 'today',
                      dateRange: { start: startOfDay, end: endOfDay },
                    });
                  }}
                  className="flex-1 px-4 py-2.5 bg-white text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-100 border border-slate-300 transition-colors"
                >
                  {t('reset')}
                </button>
                <button
                  onClick={() => {
                    // Combine all search fields into a search string
                    const searchParts = [];
                    if (orderNumberSearch) searchParts.push(`order:${orderNumberSearch}`);
                    if (customerNameSearch) searchParts.push(`name:${customerNameSearch}`);
                    if (customerPhoneSearch) searchParts.push(`phone:${customerPhoneSearch}`);
                    if (deliveryPersonSearch) searchParts.push(`delivery:${deliveryPersonSearch}`);
                    const combinedSearch = searchParts.join(' ');

                    // Apply current temporary filters
                    const now = new Date();
                    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                    
                    let finalDateRange = { start: startOfDay, end: endOfDay };
                    if (dateFilterType === 'custom') {
                      finalDateRange = {
                        start: dateRange.start || startOfDay,
                        end: dateRange.end || endOfDay,
                      };
                    }
                    
                    setAppliedFilters({
                      search: combinedSearch,
                      deliveryStatus: deliveryStatusFilter,
                      fromClient: fromClientFilter,
                      dateFilterType: dateFilterType,
                      dateRange: finalDateRange,
                    });
                    setFiltersExpanded(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition-colors"
                >
                  {t('apply')}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Orders Content - Scrollable */}
        <div className="flex-1 bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {ordersLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex items-center justify-center flex-1 p-16">
              <div className="text-center">
                <Package className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-800 font-semibold text-lg mb-2">{t('noOrdersFound')}</p>
                <p className="text-sm text-slate-500">
                  {deliveryStatusFilter === 'all' 
                    ? t('noOrdersFound')
                    : `${t('noOrdersFound')}`
                  }
                </p>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              <div className="space-y-2 sm:space-y-3 p-2 sm:p-3">
                {orders.map((order: any) => (
              <div
                key={order.id}
                onClick={() => toggleSelectOrder(order.id)}
                className={`relative bg-white rounded-lg sm:rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${
                  selectedOrders.includes(order.id)
                    ? 'border-amber-500 ring-2 ring-amber-500/20'
                    : 'border-slate-200/60 hover:border-slate-300/60'
                }`}
              >
                <div className="px-3 sm:px-5 py-2.5 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-min overflow-x-auto">
                    {/* Selection Checkbox */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-5 sm:w-6 h-5 sm:h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          selectedOrders.includes(order.id)
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {selectedOrders.includes(order.id) && (
                          <CheckSquare className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Order Number & Status */}
                    <div className="flex-shrink-0 min-w-fit">
                      <span className="text-xs sm:text-sm font-semibold text-slate-500">#{order.orderNumber}</span>
                      <p className="text-xs text-slate-400 mt-0.5 whitespace-nowrap">
                        {formatOrderDate(order.dateCreated)}
                      </p>
                    </div>

                    {/* Delivery Status */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm ${getDeliveryStatusBadge(order.deliveryStatus).className}`}>
                        {getDeliveryStatusBadge(order.deliveryStatus).icon}
                        <span className="hidden sm:inline">{getDeliveryStatusBadge(order.deliveryStatus).label}</span>
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold border whitespace-nowrap inline-flex items-center gap-1 ${getSourceBadge(order).className}`}>
                        {getSourceBadge(order).icon}
                        {getSourceBadge(order).label}
                      </span>
                    </div>

                    {/* Customer Info - Hide on mobile, show on md+ */}
                    <div className="hidden md:flex w-40 min-w-fit items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/30">
                        <Package className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{order.customerName}</p>
                        <a href={`tel:${order.customerPhone}`} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5 transition-colors">
                          <Phone className="w-2.5 h-2.5" />
                          {order.customerPhone}
                        </a>
                      </div>
                    </div>

                    {/* Address - Hide on mobile, show on lg+ */}
                    {order.customerAddress && (
                      <div className="hidden lg:flex flex-1 min-w-fit items-center gap-1.5" title={order.customerAddress}>
                        <div className="w-5 h-5 bg-amber-100 rounded-md flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-2.5 h-2.5 text-amber-600" />
                        </div>
                        <p className="text-xs text-slate-600 truncate">{order.customerAddress}</p>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex-shrink-0 text-right min-w-fit">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block hidden sm:block">{t('total')}</span>
                      <span className="text-sm sm:text-base font-bold text-amber-600 block mt-0.5">
                        {order.total?.toFixed(2)} <span className="text-xs">{t('currency')}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-2 sm:p-3">
              <div className="grid gap-3 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map((order: any) => (
              <div 
                key={order.id} 
                onClick={() => toggleSelectOrder(order.id)}
                className={`group relative bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col h-64 overflow-hidden ${
                  selectedOrders.includes(order.id) 
                    ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-md' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Fixed Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-900">#{order.orderNumber}</span>
                        <span className="text-xs text-slate-500">{formatOrderDate(order.dateCreated)}</span>
                      </div>
                    </div>
                    <div 
                      className="flex-shrink-0 -mr-2 -mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          selectedOrders.includes(order.id)
                            ? 'bg-amber-400 border-amber-400 text-slate-900'
                            : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {selectedOrders.includes(order.id) && (
                          <CheckSquare className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Delivery Status & Source Badges Row */}
                  <div className="flex items-center justify-between gap-2 mt-2.5 w-full">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm ${getDeliveryStatusBadge(order.deliveryStatus).className}`}>
                      {getDeliveryStatusBadge(order.deliveryStatus).icon}
                      <span>{getDeliveryStatusBadge(order.deliveryStatus).label}</span>
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 ${getSourceBadge(order).className}`}>
                      {getSourceBadge(order).icon}
                      <span>{getSourceBadge(order).label}</span>
                    </span>
                  </div>
                </div>

                {/* Compact Content */}
                <div className="px-4 py-3 space-y-2.5 flex-1 overflow-y-auto">
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
                </div>

                {/* Fixed Footer */}
                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('total')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-amber-600">{order.total?.toFixed(2)}</span>
                    <span className="text-xs font-semibold text-slate-500">{t('currency')}</span>
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
          order={orderDetails.order || orderDetails}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedOrders.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={selectedOrders.length === orders.length}
        totalCount={orders.length}
        actions={[
          {
            id: 'details',
            label: t('details'),
            icon: <Info className="w-3.5 h-3.5" />,
            onClick: () => setSelectedOrderId(selectedOrders[0]),
            hidden: selectedOrders.length !== 1,
          },
          {
            id: 'preview-receipt',
            label: t('previewReceipt'),
            icon: <Receipt className="w-3.5 h-3.5" />,
            onClick: () => handlePreview('receipt'),
            hidden: selectedOrders.length !== 1,
          },
          {
            id: 'preview-delivery-note',
            label: t('previewDeliveryNote'),
            icon: <Truck className="w-3.5 h-3.5" />,
            onClick: () => handlePreview('delivery-note'),
            hidden: selectedOrders.length !== 1,
          },
          {
            id: 'delete',
            label: t('delete'),
            icon: <Trash2 className="w-3.5 h-3.5" />,
            onClick: () => setDeleteConfirmOpen(true),
            variant: 'danger' as const,
          },
        ]}
      >
        {/* Assign to Delivery - Custom Dropdown */}
        <div className="relative group">
          <select
            onChange={(e) => {
              if (e.target.value) {
                selectedOrders.forEach(orderId => {
                  const order = orders.find((o: any) => o.id === orderId);
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

      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        pdfUrl={pdfUrl}
        title={pdfTitle}
      />

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

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteOrders')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteOrders')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(selectedOrders)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
