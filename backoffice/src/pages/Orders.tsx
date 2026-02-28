import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService, deliveryPersonService, partnersService } from '../modules';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Phone, MapPin, X, Search, Package, Eye, Check, Square, UserPlus, Grid3x3, List, ShoppingCart, Trash2, Info, Receipt, Truck, Clock, User, CheckCircle, AlertCircle, XCircle, Navigation, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { toastSuccess, toastDeleted, toastCancelled, toastError, toastWarning, toastConfirm } from '../services/toast.service';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { Autocomplete } from '../components/ui/autocomplete';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { NativeSelect } from '../components/ui/native-select';
import { FormField } from '../components/ui/form-field';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { PDFPreviewModal } from '../components/PDFPreviewModal';
import { pdfService } from '../services/pdf.service';

export default function Orders() {
  const { t, language } = useLanguage();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Applied filters state - only these trigger API requests
  const [appliedFilters, setAppliedFilters] = useState<{
    search: string;
    orderNumber: string;
    deliveryStatus: any;
    fromClient: any;
    dateFilterType: any;
    dateRange: { start: Date | undefined; end: Date | undefined };
  }>({
    search: '',
    orderNumber: '',
    deliveryStatus: 'all' as any,
    fromClient: 'all' as any,
    dateFilterType: 'custom' as any,
    dateRange: { start: undefined, end: undefined },
  });

  // Search filter states - individual fields
  const [orderNumberSearch, setOrderNumberSearch] = useState('');
  const [orderNumbers, setOrderNumbers] = useState<any[]>([]);
  const [orderNumbersLoading, setOrderNumbersLoading] = useState(false);
  const [customerIdSearch, setCustomerIdSearch] = useState('');
  const [customerPhoneSearch, setCustomerPhoneSearch] = useState('');
  const [deliveryPersonIdSearch, setDeliveryPersonIdSearch] = useState('');

  // Date filter states
  const [dateFilterType, setDateFilterType] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('custom');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({ start: undefined, end: undefined });

  // Ref for status filter scroll
  const statusScrollRef = useRef<HTMLDivElement>(null);

  // Scroll functions for mobile status filter
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
        return { start: undefined, end: undefined };

      default:
        return { start: undefined, end: undefined };
    }
  }, [appliedFilters.dateFilterType, appliedFilters.dateRange]);

  const { data: ordersData = { orders: [], count: 0, totalCount: 0, statusCounts: {} }, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', JSON.stringify(appliedFilters), currentPage, pageSize],
    queryFn: () => ordersService.getAll(
      appliedFilters.search,
      getDateRange.start,
      getDateRange.end,
      true,
      appliedFilters.deliveryStatus !== 'all' ? appliedFilters.deliveryStatus : undefined,
      appliedFilters.fromClient === 'client' ? true : appliedFilters.fromClient === 'locale' ? false : undefined,
      appliedFilters.orderNumber,
      currentPage,
      pageSize,
    ),
  });

  const orders = ordersData.orders || [];
  const deliveryStatusCounts = ordersData.statusCounts || {};
  const totalCount = ordersData.totalCount || 0;

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
      toastSuccess(t('orderAssigned'));
    },
    onError: (error: Error) => {
      toastError(`${t('failedToAssign')}: ${error.message}`);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (orderId: number) => ordersService.unassignOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('orderUnassigned'));
    },
    onError: (error: Error) => {
      toastError(`${t('failedToUnassign')}: ${error.message}`);
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
      toastDeleted(t('ordersDeleted'));
      clearSelection();
    },
    onError: (error: Error) => {
      console.error('Delete mutation error:', error);
      toastError(`${t('failedToDelete')}: ${error.message}`);
    },
  });

  const cancelDeliveryMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      return Promise.all(orderIds.map(async id => {
        return ordersService.update(id, { deliveryStatus: 'canceled' });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastCancelled(t('deliveryCanceled'));
      clearSelection();
    },
    onError: (error: Error) => {
      toastError(`${t('failedToCancelDelivery')}: ${error.message}`);
    },
  });

  const handleOrderNumberSearch = async (searchValue: string) => {
    setOrderNumberSearch(searchValue);
    if (!searchValue) {
      setOrderNumbers([]);
      return;
    }

    try {
      setOrderNumbersLoading(true);
      const results = await ordersService.getOrderNumbers(searchValue);
      setOrderNumbers(results);
    } catch (error) {
      console.error('Failed to fetch order numbers:', error);
      setOrderNumbers([]);
    } finally {
      setOrderNumbersLoading(false);
    }
  };

  const handleAssign = (orderId: number, deliveryPersonId: string) => {
    if (!deliveryPersonId) return;
    assignMutation.mutate({ orderId, deliveryPersonId: parseInt(deliveryPersonId) });
  };

  const handlePreview = (documentType: 'receipt' | 'delivery-note') => {
    if (selectedOrders.length !== 1) {
      toastError(t('selectOneOrder'));
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
      <div className="min-h-[calc(100vh-64px)] flex flex-col max-w-7xl mx-auto w-full">
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

                {/* Filters Toggle Button */}
                <button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${filtersExpanded
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
                  {(appliedFilters.search || appliedFilters.fromClient !== 'all' || appliedFilters.dateRange.start || appliedFilters.dateRange.end) && !filtersExpanded && (
                    <span className="ml-1 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                      {[appliedFilters.search, appliedFilters.fromClient !== 'all', Boolean(appliedFilters.dateRange.start || appliedFilters.dateRange.end)].filter(Boolean).length}
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
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Search className="w-4 h-4 text-amber-600" />
                    {t('search')}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Order Number Search - Autocomplete */}
                    <FormField label={t('orderNumber')}>
                      <Autocomplete
                        options={orderNumbers}
                        value={orderNumberSearch}
                        onValueChange={handleOrderNumberSearch}
                        placeholder="E.g., ORD-1001"
                        emptyMessage={t('noOrdersFound')}
                        allowCustomValue={true}
                      />
                    </FormField>

                    {/* Customer Name Search - Autocomplete */}
                    <FormField label={t('customerName')}>
                      <Autocomplete
                        options={partners.map((partner: any) => ({
                          value: String(partner.id),
                          label: `${partner.name}${partner.phone ? ` (${partner.phone})` : ''}`
                        }))}
                        value={customerIdSearch}
                        onValueChange={setCustomerIdSearch}
                        placeholder={t('typeCustomerName')}
                        emptyMessage={t('noCustomersFound')}
                        allowCustomValue={false}
                      />
                    </FormField>

                    {/* Customer Phone Search */}
                    <FormField label={t('phoneNumber')}>
                      <div className="relative">
                        <Input
                          type="tel"
                          placeholder="E.g., 0612345678..."
                          value={customerPhoneSearch}
                          onChange={(e) => setCustomerPhoneSearch(e.target.value)}
                          fullWidth
                        />
                        {customerPhoneSearch && (
                          <button
                            onClick={() => setCustomerPhoneSearch('')}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </FormField>

                    {/* Delivery Person Search - Autocomplete */}
                    <FormField label={t('deliveryPerson')}>
                      <Autocomplete
                        options={deliveryPersons.filter((p: any) => p.isActive).map((person: any) => ({
                          value: String(person.id),
                          label: person.name
                        }))}
                        value={deliveryPersonIdSearch}
                        onValueChange={setDeliveryPersonIdSearch}
                        placeholder={t('selectDeliveryPerson')}
                        emptyMessage={t('noDeliveryPersons')}
                        allowCustomValue={false}
                      />
                    </FormField>
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    {t('dateRange')}
                  </div>
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

                {/* Source Filter */}
                <div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-amber-600" />
                    {t('orderSource')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: t('all') },
                      { key: 'locale', label: t('local') },
                      { key: 'client', label: t('client') }
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setFromClientFilter(filter.key as any)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${fromClientFilter === filter.key
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
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
                  className="flex-1"
                  onClick={() => {
                    // Reset temporary filters
                    setOrderNumberSearch('');
                    setCustomerIdSearch('');
                    setCustomerPhoneSearch('');
                    setDeliveryPersonIdSearch('');
                    setSearchInput('');
                    setFromClientFilter('all');
                    setDateFilterType('custom');
                    setDateRange({ start: undefined, end: undefined });
                    setCurrentPage(1);
                    setPageSize(50);
                    setAppliedFilters({
                      search: '',
                      orderNumber: '',
                      deliveryStatus: 'all',
                      fromClient: 'all',
                      dateFilterType: 'custom',
                      dateRange: { start: undefined, end: undefined },
                    });
                  }}
                >
                  {t('reset')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    // Combine all search fields into a search string
                    const searchParts = [];
                    if (orderNumberSearch) searchParts.push(`order:${orderNumberSearch}`);
                    if (customerIdSearch) searchParts.push(`customerId:${customerIdSearch}`);
                    if (customerPhoneSearch) searchParts.push(`phone:${customerPhoneSearch}`);
                    if (deliveryPersonIdSearch) searchParts.push(`deliveryPersonId:${deliveryPersonIdSearch}`);
                    const combinedSearch = searchParts.join(' ');

                    let finalDateRange = { start: dateRange.start, end: dateRange.end };

                    setCurrentPage(1);
                    setPageSize(50);
                    setAppliedFilters({
                      search: combinedSearch,
                      orderNumber: orderNumberSearch,
                      deliveryStatus: appliedFilters.deliveryStatus, // Keep delivery status as is
                      fromClient: fromClientFilter,
                      dateFilterType: 'custom',
                      dateRange: finalDateRange,
                    });
                    setFiltersExpanded(false);
                  }}
                >
                  {t('apply')}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Delivery Status Filter Bar - Always Visible */}
        <div className="mb-3 flex-shrink-0">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-2.5 sm:p-3">
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
                  onClick={() => {
                    setDeliveryStatusFilter(filter.key as any);
                    setAppliedFilters(prev => ({
                      ...prev,
                      deliveryStatus: filter.key as any,
                      dateFilterType: 'custom',
                      dateRange: { start: prev.dateRange.start, end: prev.dateRange.end },
                    }));
                  }}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${deliveryStatusFilter === filter.key
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <span className="text-sm">{filter.icon}</span>
                  <span className="whitespace-nowrap">{filter.label}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${deliveryStatusFilter === filter.key
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

        {/* Pagination Info Bar - Top */}
        {orders.length > 0 && (
          <div className="bg-slate-50 py-2 px-1">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-slate-600">
                {t('showing')} <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> {t('to')}{' '}
                <span className="font-semibold">{Math.min(currentPage * pageSize, totalCount)}</span> {t('of')} <span className="font-semibold">{totalCount}</span> {t('results')}
              </div>

              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">{t('perPage')}</span>
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
                    max={Math.ceil(totalCount / pageSize)}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value, 10);
                      const maxPage = Math.ceil(totalCount / pageSize);
                      if (!isNaN(page) && page >= 1 && page <= maxPage) {
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
                  <span className="text-sm font-medium text-slate-700">{Math.ceil(totalCount / pageSize)}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / pageSize), currentPage + 1))}
                  disabled={currentPage === Math.ceil(totalCount / pageSize)}
                  className="inline-flex items-center justify-center px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Orders Content - Scrollable */}
        {ordersLoading ? (
          <div className="space-y-3 px-4 py-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-slate-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-48 bg-slate-200 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-slate-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center flex-1 p-16">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full"></div>
                <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border-2 border-amber-100">
                  <Package className="w-16 h-16 text-amber-500 mx-auto" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-800">{t('noOrdersFound')}</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-sm text-center">
                {(appliedFilters.search ||
                  appliedFilters.orderNumber ||
                  appliedFilters.deliveryStatus !== 'all' ||
                  appliedFilters.fromClient !== 'all' ||
                  appliedFilters.dateRange.start ||
                  appliedFilters.dateRange.end)
                  ? "Aucune commande ne correspond à vos critères de recherche. Essayez de modifier les filtres."
                  : "Aucune commande pour le moment. Les nouvelles commandes apparaîtront ici."}
              </p>
              {(appliedFilters.search ||
                appliedFilters.orderNumber ||
                appliedFilters.deliveryStatus !== 'all' ||
                appliedFilters.fromClient !== 'all' ||
                appliedFilters.dateRange.start ||
                appliedFilters.dateRange.end) && (
                  <Button
                    onClick={() => {
                      setOrderNumberSearch('');
                      setCustomerIdSearch('');
                      setCustomerPhoneSearch('');
                      setDeliveryPersonIdSearch('');
                      setSearchInput('');
                      setFromClientFilter('all');
                      setDateFilterType('custom');
                      setDateRange({ start: undefined, end: undefined });
                      setDeliveryStatusFilter('all');
                      setCurrentPage(1);
                      setAppliedFilters({
                        search: '',
                        orderNumber: '',
                        deliveryStatus: 'all',
                        fromClient: 'all',
                        dateFilterType: 'custom',
                        dateRange: { start: undefined, end: undefined },
                      });
                    }}
                    className="mt-6"
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <>
            <div className="flex-1">
              <div className="space-y-1 sm:space-y-2">
                {orders.map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() => toggleSelectOrder(order.id)}
                    className={`relative bg-white rounded-lg sm:rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${selectedOrders.includes(order.id)
                      ? 'border-amber-500 ring-2 ring-amber-500/20'
                      : 'border-slate-200/60 hover:border-slate-300/60'
                      }`}
                  >
                    <div className="px-3 sm:px-5 py-2.5 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-4 min-w-min overflow-x-auto">
                        {/* Selection Checkbox */}
                        <div className="flex-shrink-0">
                          <div
                            className={`w-5 sm:w-6 h-5 sm:h-6 rounded-md border-2 flex items-center justify-center transition-all ${selectedOrders.includes(order.id)
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-white border-slate-300'
                              }`}
                          >
                            {selectedOrders.includes(order.id) && (
                              <Check className="w-4 h-4" />
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
                            {order.total?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs">{t('currency')}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1">
              <div className="grid gap-3 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {orders.map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() => toggleSelectOrder(order.id)}
                    className={`group relative bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col h-64 overflow-hidden ${selectedOrders.includes(order.id)
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
                            className={`w-5 sm:w-6 h-5 sm:h-6 rounded-md border-2 flex items-center justify-center transition-all ${selectedOrders.includes(order.id)
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-white border-slate-300'
                              }`}
                          >
                            {selectedOrders.includes(order.id) && (
                              <Check className="w-4 h-4" />
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
                        <span className="text-xl font-bold text-amber-600">{order.total?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-xs font-semibold text-slate-500">{t('currency')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
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
            id: 'cancel-delivery',
            label: t('cancelDelivery'),
            icon: <XCircle className="w-3.5 h-3.5" />,
            onClick: () => cancelDeliveryMutation.mutate(selectedOrders),
            variant: 'danger' as const,
            hidden: !selectedOrders.every(orderId => {
              const order = orders.find((o: any) => o.id === orderId);
              return order && ['pending', 'assigned', 'confirmed'].includes(order.deliveryStatus);
            }),
          },
          {
            id: 'delete',
            label: t('delete'),
            icon: <Trash2 className="w-3.5 h-3.5" />,
            onClick: () => toastConfirm(t('deleteOrders'), () => deleteMutation.mutate(selectedOrders), { description: t('confirmDeleteOrders'), confirmLabel: t('delete') }),
            variant: 'danger' as const,
          },
        ]}
      >
        {/* Assign to Delivery - Custom Dropdown */}
        <div className="relative group">
          <User className="w-3.5 h-3.5 text-amber-600 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <NativeSelect
            onChange={(e) => {
              if (e.target.value) {
                const deliveryPersonId = e.target.value;
                let assignedCount = 0;
                let skippedCount = 0;

                selectedOrders.forEach(orderId => {
                  const order = orders.find((o: any) => o.id === orderId);
                  if (order && order.deliveryStatus === 'pending') {
                    handleAssign(orderId, deliveryPersonId);
                    assignedCount++;
                  } else {
                    skippedCount++;
                  }
                });

                if (assignedCount > 0) {
                  toastSuccess(`${assignedCount} ${t('ordersAssigned')}`);
                }
                if (skippedCount > 0) {
                  toastWarning(`${skippedCount} ${t('ordersSkippedNotPending')}`);
                }

                clearSelection();
                e.target.value = '';
              }
            }}
            selectSize="sm"
            className="max-w-[120px] pl-8 sm:pl-9 truncate"
          >
            <option value="">
              {t('assignToDelivery')}
            </option>
            {deliveryPersons.filter((p: any) => p.isActive).map((person: any) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </NativeSelect>
        </div>
      </FloatingActionBar>

      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        pdfUrl={pdfUrl}
        title={pdfTitle}
      />
    </AdminLayout>
  );
}
