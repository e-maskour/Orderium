import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService, deliveryPersonService, partnersService } from '../modules';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Phone, MapPin, X, Search, Package, Eye, Check, Square, UserPlus, Grid3x3, List, ShoppingCart, Trash2, Info, Receipt, Truck, Clock, User, CheckCircle, AlertCircle, XCircle, Navigation, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { toastSuccess, toastDeleted, toastCancelled, toastError, toastWarning, toastConfirm } from '../services/toast.service';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
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

  const [orderNumberSearch, setOrderNumberSearch] = useState('');
  const [orderNumbers, setOrderNumbers] = useState<any[]>([]);
  const [orderNumbersLoading, setOrderNumbersLoading] = useState(false);
  const [customerIdSearch, setCustomerIdSearch] = useState('');
  const [customerPhoneSearch, setCustomerPhoneSearch] = useState('');
  const [deliveryPersonIdSearch, setDeliveryPersonIdSearch] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('custom');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({ start: undefined, end: undefined });
  const statusScrollRef = useRef<HTMLDivElement>(null);

  const scrollStatusLeft = () => { statusScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' }); };
  const scrollStatusRight = () => { statusScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' }); };

  const getDateRange = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    switch (appliedFilters.dateFilterType) {
      case 'today': return { start: startOfDay, end: endOfDay };
      case 'yesterday': {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        return { start: new Date(y.getFullYear(), y.getMonth(), y.getDate()), end: new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999) };
      }
      case 'week': {
        const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0,0,0,0);
        const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23,59,59,999);
        return { start: s, end: e };
      }
      case 'month': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
      case 'year': return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
      case 'custom':
        if (appliedFilters.dateRange.start && appliedFilters.dateRange.end) return { start: appliedFilters.dateRange.start, end: appliedFilters.dateRange.end };
        if (appliedFilters.dateRange.start) { const e2 = new Date(appliedFilters.dateRange.start); e2.setHours(23,59,59,999); return { start: appliedFilters.dateRange.start, end: e2 }; }
        return { start: undefined, end: undefined };
      default: return { start: undefined, end: undefined };
    }
  }, [appliedFilters.dateFilterType, appliedFilters.dateRange]);

  const { data: ordersData = { orders: [], count: 0, totalCount: 0, statusCounts: {} }, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', JSON.stringify(appliedFilters), currentPage, pageSize],
    queryFn: () => ordersService.getAll(
      appliedFilters.search, getDateRange.start, getDateRange.end, true,
      appliedFilters.deliveryStatus !== 'all' ? appliedFilters.deliveryStatus : undefined,
      appliedFilters.fromClient === 'client' ? true : appliedFilters.fromClient === 'locale' ? false : undefined,
      appliedFilters.orderNumber, currentPage, pageSize,
    ),
  });

  const orders = ordersData.orders || [];
  const deliveryStatusCounts = ordersData.statusCounts || {};
  const totalCount = ordersData.totalCount || 0;

  const { data: deliveryPersons = [] } = useQuery({ queryKey: ['deliveryPersons'], queryFn: deliveryPersonService.getAll });
  const { data: partnersData } = useQuery({ queryKey: ['partners'], queryFn: partnersService.getAll });
  const partners = partnersData?.partners || [];

  const { data: orderDetails, isLoading: orderDetailsLoading } = useQuery({
    queryKey: ['orderDetails', selectedOrderId],
    queryFn: () => ordersService.getById(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, deliveryPersonId }: { orderId: number; deliveryPersonId: number }) => ordersService.assignToDelivery(orderId, deliveryPersonId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); toastSuccess(t('orderAssigned')); },
    onError: (error: Error) => { toastError(`${t('failedToAssign')}: ${error.message}`); },
  });

  const unassignMutation = useMutation({
    mutationFn: (orderId: number) => ordersService.unassignOrder(orderId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); toastSuccess(t('orderUnassigned')); },
    onError: (error: Error) => { toastError(`${t('failedToUnassign')}: ${error.message}`); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderIds: number[]) => Promise.all(orderIds.map(async id => { await ordersService.delete(id); })),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); toastDeleted(t('ordersDeleted')); clearSelection(); },
    onError: (error: Error) => { toastError(`${t('failedToDelete')}: ${error.message}`); },
  });

  const cancelDeliveryMutation = useMutation({
    mutationFn: async (orderIds: number[]) => Promise.all(orderIds.map(async id => ordersService.update(id, { deliveryStatus: 'canceled' }))),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); toastCancelled(t('deliveryCanceled')); clearSelection(); },
    onError: (error: Error) => { toastError(`${t('failedToCancelDelivery')}: ${error.message}`); },
  });

  const handleOrderNumberSearch = async (searchValue: string) => {
    setOrderNumberSearch(searchValue);
    if (!searchValue) { setOrderNumbers([]); return; }
    try {
      setOrderNumbersLoading(true);
      const results = await ordersService.getOrderNumbers(searchValue);
      setOrderNumbers(results);
    } catch { setOrderNumbers([]); } finally { setOrderNumbersLoading(false); }
  };

  const handleAssign = (orderId: number, deliveryPersonId: string) => {
    if (!deliveryPersonId) return;
    assignMutation.mutate({ orderId, deliveryPersonId: parseInt(deliveryPersonId) });
  };

  const handlePreview = (documentType: 'receipt' | 'delivery-note') => {
    if (selectedOrders.length !== 1) { toastError(t('selectOneOrder')); return; }
    const orderId = selectedOrders[0];
    const order = orders.find((o: any) => o.id === orderId);
    const label = pdfService.getDocumentLabel(documentType);
    const url = pdfService.getPDFUrl(documentType, orderId, 'preview');
    setPdfUrl(url); setPdfTitle(`${label} ${order?.orderNumber || ''}`.trim()); setShowPDFPreview(true);
  };

  const getSourceBadge = (order: any) => {
    if (order?.fromClient) {
      return { label: t('client'), icon: <ShoppingCart style={{ width: '0.75rem', height: '0.75rem' }} />, bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    }
    return { label: t('local'), icon: <Package style={{ width: '0.75rem', height: '0.75rem' }} />, bg: '#f1f5f9', color: '#334155', border: '#e2e8f0' };
  };

  const getDeliveryStatusBadge = (deliveryStatus: string | null | undefined) => {
    const map: Record<string, { label: string; icon: JSX.Element; bg: string; color: string; border: string }> = {
      pending: { label: t('pending'), icon: <Clock style={{ width: '0.875rem', height: '0.875rem' }} />, bg: '#f8fafc', color: '#334155', border: '#e2e8f0' },
      assigned: { label: t('assigned'), icon: <User style={{ width: '0.875rem', height: '0.875rem' }} />, bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
      confirmed: { label: t('confirmed'), icon: <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />, bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
      picked_up: { label: t('pickedUp'), icon: <Package style={{ width: '0.875rem', height: '0.875rem' }} />, bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
      to_delivery: { label: t('toDelivery'), icon: <AlertCircle style={{ width: '0.875rem', height: '0.875rem' }} />, bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
      in_delivery: { label: t('inDelivery'), icon: <Navigation style={{ width: '0.875rem', height: '0.875rem' }} />, bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
      delivered: { label: t('delivered'), icon: <CheckCircle style={{ width: '0.875rem', height: '0.875rem' }} />, bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
      canceled: { label: t('canceled'), icon: <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />, bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    };
    return map[deliveryStatus || ''] || map.pending;
  };

  const formatOrderDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const time = `${hours}:${minutes}`;
    if (language?.startsWith('fr')) {
      const m = ['Jan','Fev','Mar','Avr','Mai','Juin','Juil','Aou','Sep','Oct','Nov','Dec'];
      return `${date.getDate()} ${m[date.getMonth()]} ${date.getFullYear()} ${time}`;
    }
    return new Intl.DateTimeFormat('ar-MA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  };

  const toggleSelectOrder = (orderId: number) => { setSelectedOrders(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]); };
  const toggleSelectAll = () => { selectedOrders.length === orders.length ? setSelectedOrders([]) : setSelectedOrders(orders.map((o: any) => o.id)); };
  const clearSelection = () => setSelectedOrders([]);

  const pageSizeOptions = [
    { label: '10', value: 10 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
    { label: '500', value: 500 },
    { label: '1000', value: 1000 },
  ];

  const orderNumberOptions = orderNumbers.map((on: any) => ({ label: typeof on === 'string' ? on : on.label || String(on.value), value: typeof on === 'string' ? on : String(on.value) }));
  const customerOptions = partners.map((partner: any) => ({ label: `${partner.name}${partner.phone ? ` (${partner.phone})` : ''}`, value: String(partner.id) }));
  const deliveryPersonOptions = deliveryPersons.filter((p: any) => p.isActive).map((person: any) => ({ label: person.name, value: String(person.id) }));

  const resetFilters = () => {
    setOrderNumberSearch(''); setCustomerIdSearch(''); setCustomerPhoneSearch(''); setDeliveryPersonIdSearch('');
    setSearchInput(''); setFromClientFilter('all'); setDateFilterType('custom'); setDateRange({ start: undefined, end: undefined });
    setCurrentPage(1); setPageSize(50);
    setAppliedFilters({ search: '', orderNumber: '', deliveryStatus: 'all', fromClient: 'all', dateFilterType: 'custom', dateRange: { start: undefined, end: undefined } });
  };

  const applyFilters = () => {
    const searchParts: string[] = [];
    if (orderNumberSearch) searchParts.push(`order:${orderNumberSearch}`);
    if (customerIdSearch) searchParts.push(`customerId:${customerIdSearch}`);
    if (customerPhoneSearch) searchParts.push(`phone:${customerPhoneSearch}`);
    if (deliveryPersonIdSearch) searchParts.push(`deliveryPersonId:${deliveryPersonIdSearch}`);
    setCurrentPage(1); setPageSize(50);
    setAppliedFilters({
      search: searchParts.join(' '), orderNumber: orderNumberSearch,
      deliveryStatus: appliedFilters.deliveryStatus, fromClient: fromClientFilter,
      dateFilterType: 'custom', dateRange: { start: dateRange.start, end: dateRange.end },
    });
    setFiltersExpanded(false);
  };

  // Calendar date range state
  const calendarDates = dateRange.start && dateRange.end ? [dateRange.start, dateRange.end] : dateRange.start ? [dateRange.start] : null;

  return (
    <AdminLayout>
      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', maxWidth: '80rem', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
          <PageHeader
            icon={ShoppingCart}
            title={t('orders')}
            subtitle={t('viewAndAssignOrders')}
            actions={
              <>
                {/* View Mode Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', padding: '0.25rem' }}>
                  <button
                    onClick={() => setViewMode('card')}
                    style={{
                      padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer',
                      backgroundColor: viewMode === 'card' ? '#ffffff' : 'transparent',
                      color: viewMode === 'card' ? '#0f172a' : '#475569',
                      boxShadow: viewMode === 'card' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    <Grid3x3 style={{ width: '1rem', height: '1rem' }} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer',
                      backgroundColor: viewMode === 'list' ? '#ffffff' : 'transparent',
                      color: viewMode === 'list' ? '#0f172a' : '#475569',
                      boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    <List style={{ width: '1rem', height: '1rem' }} />
                  </button>
                </div>

                {/* Filters Toggle */}
                <button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500, fontSize: '0.875rem', border: 'none', cursor: 'pointer',
                    backgroundColor: filtersExpanded ? '#f59e0b' : '#ffffff',
                    color: filtersExpanded ? '#ffffff' : '#334155',
                    boxShadow: filtersExpanded ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                    ...(filtersExpanded ? {} : { border: '1px solid #cbd5e1' }),
                  }}
                >
                  <Filter style={{ width: '1rem', height: '1rem' }} />
                  <span>{t('filters')}</span>
                  {filtersExpanded ? <ChevronUp style={{ width: '1rem', height: '1rem' }} /> : <ChevronDown style={{ width: '1rem', height: '1rem' }} />}
                  {(appliedFilters.search || appliedFilters.fromClient !== 'all' || appliedFilters.dateRange.start || appliedFilters.dateRange.end) && !filtersExpanded && (
                    <span style={{ marginLeft: '0.25rem', padding: '0.125rem 0.5rem', backgroundColor: '#f59e0b', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, borderRadius: '9999px' }}>
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
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 40 }} onClick={() => setFiltersExpanded(false)} />
            <div style={{ position: 'fixed', top: 0, bottom: 0, right: 0, width: '35rem', maxWidth: '100%', backgroundColor: '#ffffff', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
              {/* Panel Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(to right, #f59e0b, #d97706)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Filter style={{ width: '1.25rem', height: '1.25rem', color: '#ffffff' }} />
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>{t('filters')}</h2>
                </div>
                <button onClick={() => setFiltersExpanded(false)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'none', cursor: 'pointer' }}>
                  <X style={{ width: '1.25rem', height: '1.25rem', color: '#ffffff' }} />
                </button>
              </div>

              {/* Panel Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Search */}
                <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Search style={{ width: '1rem', height: '1rem', color: '#d97706' }} />
                    {t('search')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Order Number */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('orderNumber')}</label>
                      <Dropdown
                        value={orderNumberSearch}
                        onChange={(e) => { setOrderNumberSearch(e.value); handleOrderNumberSearch(e.value || ''); }}
                        options={orderNumberOptions}
                        optionLabel="label"
                        optionValue="value"
                        filter
                        showClear
                        placeholder="E.g., ORD-1001"
                        emptyMessage={t('noOrdersFound')}
                        style={{ width: '100%' }}
                        editable
                      />
                    </div>
                    {/* Customer Name */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('customerName')}</label>
                      <Dropdown
                        value={customerIdSearch}
                        onChange={(e) => setCustomerIdSearch(e.value)}
                        options={customerOptions}
                        optionLabel="label"
                        optionValue="value"
                        filter
                        showClear
                        placeholder={t('typeCustomerName')}
                        emptyMessage={t('noCustomersFound')}
                        style={{ width: '100%' }}
                      />
                    </div>
                    {/* Customer Phone */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('phoneNumber')}</label>
                      <div style={{ position: 'relative' }}>
                        <InputText
                          type="tel"
                          placeholder="E.g., 0612345678..."
                          value={customerPhoneSearch}
                          onChange={(e) => setCustomerPhoneSearch(e.target.value)}
                          style={{ width: '100%' }}
                        />
                        {customerPhoneSearch && (
                          <button
                            onClick={() => setCustomerPhoneSearch('')}
                            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', zIndex: 10 }}
                          >
                            <X style={{ width: '1rem', height: '1rem' }} />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Delivery Person */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('deliveryPerson')}</label>
                      <Dropdown
                        value={deliveryPersonIdSearch}
                        onChange={(e) => setDeliveryPersonIdSearch(e.value)}
                        options={deliveryPersonOptions}
                        optionLabel="label"
                        optionValue="value"
                        filter
                        showClear
                        placeholder={t('selectDeliveryPerson')}
                        emptyMessage={t('noDeliveryPersons')}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock style={{ width: '1rem', height: '1rem', color: '#d97706' }} />
                    {t('dateRange')}
                  </div>
                  <Calendar
                    value={calendarDates as any}
                    onChange={(e) => {
                      const val = e.value as Date[] | null;
                      if (val && val.length >= 1) {
                        setDateRange({ start: val[0], end: val[1] || undefined });
                        if (val[0]) setDateFilterType('custom');
                      } else {
                        setDateRange({ start: undefined, end: undefined });
                      }
                    }}
                    selectionMode="range"
                    placeholder={t('selectDate')}
                    dateFormat="dd/mm/yy"
                    showIcon
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Source Filter */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart style={{ width: '1rem', height: '1rem', color: '#d97706' }} />
                    {t('orderSource')}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {[
                      { key: 'all', label: t('all') },
                      { key: 'locale', label: t('local') },
                      { key: 'client', label: t('client') }
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setFromClientFilter(filter.key as any)}
                        style={{
                          padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                          backgroundColor: fromClientFilter === filter.key ? '#3b82f6' : '#f8fafc',
                          color: fromClientFilter === filter.key ? '#ffffff' : '#334155',
                          border: fromClientFilter === filter.key ? 'none' : '2px solid #e2e8f0',
                        }}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Footer */}
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', gap: '0.75rem' }}>
                <Button label={t('reset')} outlined onClick={resetFilters} style={{ flex: 1 }} />
                <Button label={t('apply')} onClick={applyFilters} style={{ flex: 1 }} />
              </div>
            </div>
          </>
        )}

        {/* Delivery Status Filter Bar */}
        <div style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck style={{ width: '1rem', height: '1rem', color: '#d97706' }} />
                <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{t('deliveryStatus')}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button onClick={scrollStatusLeft} style={{ backgroundColor: '#f1f5f9', borderRadius: '9999px', padding: '0.375rem', border: 'none', cursor: 'pointer' }}>
                  <ChevronLeft style={{ width: '1rem', height: '1rem', color: '#475569' }} />
                </button>
                <button onClick={scrollStatusRight} style={{ backgroundColor: '#f1f5f9', borderRadius: '9999px', padding: '0.375rem', border: 'none', cursor: 'pointer' }}>
                  <ChevronRight style={{ width: '1rem', height: '1rem', color: '#475569' }} />
                </button>
              </div>
            </div>
            <div ref={statusScrollRef} style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', scrollBehavior: 'smooth' }}>
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
                    setAppliedFilters(prev => ({ ...prev, deliveryStatus: filter.key as any, dateFilterType: 'custom', dateRange: { start: prev.dateRange.start, end: prev.dateRange.end } }));
                  }}
                  style={{
                    padding: '0.375rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0, border: 'none', cursor: 'pointer',
                    backgroundColor: deliveryStatusFilter === filter.key ? '#f59e0b' : '#f8fafc',
                    color: deliveryStatusFilter === filter.key ? '#ffffff' : '#334155',
                    ...(deliveryStatusFilter !== filter.key ? { border: '2px solid #e2e8f0' } : {}),
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>{filter.icon}</span>
                  <span style={{ whiteSpace: 'nowrap' }}>{filter.label}</span>
                  <span style={{
                    padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700,
                    backgroundColor: deliveryStatusFilter === filter.key ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: deliveryStatusFilter === filter.key ? '#ffffff' : '#475569',
                  }}>
                    {deliveryStatusCounts[filter.key as keyof typeof deliveryStatusCounts]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pagination Info */}
        {orders.length > 0 && (
          <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                {t('showing')} <span style={{ fontWeight: 600 }}>{(currentPage - 1) * pageSize + 1}</span> {t('to')}{' '}
                <span style={{ fontWeight: 600 }}>{Math.min(currentPage * pageSize, totalCount)}</span> {t('of')} <span style={{ fontWeight: 600 }}>{totalCount}</span> {t('results')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569' }}>{t('perPage')}</span>
                <Dropdown
                  value={pageSize}
                  onChange={(e) => { setPageSize(e.value); setCurrentPage(1); }}
                  options={pageSizeOptions}
                  optionLabel="label"
                  optionValue="value"
                  style={{ width: '5rem' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, background: 'none' }}
                >
                  <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <InputText
                    type="number"
                    min={1}
                    max={Math.ceil(totalCount / pageSize)}
                    value={String(currentPage)}
                    onChange={(e) => {
                      const page = parseInt(e.target.value, 10);
                      const maxPage = Math.ceil(totalCount / pageSize);
                      if (!isNaN(page) && page >= 1 && page <= maxPage) setCurrentPage(page);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    style={{ width: '3rem', textAlign: 'center' }}
                    aria-label="Page number"
                  />
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>/</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>{Math.ceil(totalCount / pageSize)}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / pageSize), currentPage + 1))}
                  disabled={currentPage === Math.ceil(totalCount / pageSize)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', cursor: currentPage === Math.ceil(totalCount / pageSize) ? 'not-allowed' : 'pointer', opacity: currentPage === Math.ceil(totalCount / pageSize) ? 0.5 : 1, background: 'none' }}
                >
                  <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Orders Content */}
        {ordersLoading ? (
          <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ height: '2.5rem', width: '2.5rem', backgroundColor: '#e2e8f0', borderRadius: '0.5rem' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ height: '1rem', width: '8rem', backgroundColor: '#e2e8f0', borderRadius: '0.25rem' }} />
                    <div style={{ height: '0.75rem', width: '12rem', backgroundColor: '#e2e8f0', borderRadius: '0.25rem' }} />
                  </div>
                  <div style={{ height: '1.5rem', width: '5rem', backgroundColor: '#e2e8f0', borderRadius: '9999px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '4rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ backgroundColor: '#fffbeb', borderRadius: '1rem', padding: '2rem', border: '2px solid #fef3c7' }}>
                  <Package style={{ width: '4rem', height: '4rem', color: '#f59e0b', margin: '0 auto', display: 'block' }} strokeWidth={1.5} />
                </div>
              </div>
              <h3 style={{ marginTop: '1.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{t('noOrdersFound')}</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b', maxWidth: '24rem', textAlign: 'center' }}>
                {(appliedFilters.search || appliedFilters.orderNumber || appliedFilters.deliveryStatus !== 'all' || appliedFilters.fromClient !== 'all' || appliedFilters.dateRange.start || appliedFilters.dateRange.end)
                  ? "Aucune commande ne correspond à vos critères de recherche. Essayez de modifier les filtres."
                  : "Aucune commande pour le moment. Les nouvelles commandes apparaîtront ici."}
              </p>
              {(appliedFilters.search || appliedFilters.orderNumber || appliedFilters.deliveryStatus !== 'all' || appliedFilters.fromClient !== 'all' || appliedFilters.dateRange.start || appliedFilters.dateRange.end) && (
                <Button label="Réinitialiser les filtres" onClick={() => { resetFilters(); setDeliveryStatusFilter('all'); }} style={{ marginTop: '1.5rem' }} />
              )}
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {orders.map((order: any) => {
                const dsb = getDeliveryStatusBadge(order.deliveryStatus);
                const sb = getSourceBadge(order);
                return (
                  <div
                    key={order.id}
                    onClick={() => toggleSelectOrder(order.id)}
                    style={{
                      position: 'relative', backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden', cursor: 'pointer',
                      border: selectedOrders.includes(order.id) ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ padding: '0.625rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 'min-content', overflowX: 'auto' }}>
                        {/* Checkbox */}
                        <div style={{ flexShrink: 0 }}>
                          <div style={{
                            width: '1.5rem', height: '1.5rem', borderRadius: '0.375rem', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: selectedOrders.includes(order.id) ? '#f59e0b' : '#ffffff',
                            borderColor: selectedOrders.includes(order.id) ? '#f59e0b' : '#cbd5e1',
                            color: selectedOrders.includes(order.id) ? '#ffffff' : 'transparent',
                          }}>
                            {selectedOrders.includes(order.id) && <Check style={{ width: '1rem', height: '1rem' }} />}
                          </div>
                        </div>
                        {/* Order Number */}
                        <div style={{ flexShrink: 0, minWidth: 'fit-content' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>#{order.orderNumber}</span>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem', whiteSpace: 'nowrap', margin: 0 }}>{formatOrderDate(order.dateCreated)}</p>
                        </div>
                        {/* Status badges */}
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: dsb.bg, color: dsb.color, border: `1px solid ${dsb.border}` }}>
                            {dsb.icon}
                            <span>{dsb.label}</span>
                          </span>
                          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', backgroundColor: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>
                            {sb.icon}
                            {sb.label}
                          </span>
                        </div>
                        {/* Customer */}
                        <div style={{ display: 'flex', width: '10rem', minWidth: 'fit-content', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '2rem', height: '2rem', background: 'linear-gradient(to bottom right, #fbbf24, #d97706)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Package style={{ width: '0.75rem', height: '0.75rem', color: '#ffffff' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{order.customerName}</p>
                            <a href={`tel:${order.customerPhone}`} style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.125rem', textDecoration: 'none' }}>
                              <Phone style={{ width: '0.625rem', height: '0.625rem' }} />
                              {order.customerPhone}
                            </a>
                          </div>
                        </div>
                        {/* Address */}
                        {order.customerAddress && (
                          <div style={{ display: 'flex', flex: 1, minWidth: 'fit-content', alignItems: 'center', gap: '0.375rem' }} title={order.customerAddress}>
                            <div style={{ width: '1.25rem', height: '1.25rem', backgroundColor: '#fef3c7', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <MapPin style={{ width: '0.625rem', height: '0.625rem', color: '#d97706' }} />
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{order.customerAddress}</p>
                          </div>
                        )}
                        {/* Total */}
                        <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 'fit-content' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>{t('total')}</span>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#d97706', display: 'block', marginTop: '0.125rem' }}>
                            {order.total?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '0.75rem' }}>{t('currency')}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {orders.map((order: any) => {
                const dsb = getDeliveryStatusBadge(order.deliveryStatus);
                const sb = getSourceBadge(order);
                return (
                  <div
                    key={order.id}
                    onClick={() => toggleSelectOrder(order.id)}
                    style={{
                      position: 'relative', backgroundColor: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '16rem', overflow: 'hidden', cursor: 'pointer',
                      border: selectedOrders.includes(order.id) ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ padding: '0.75rem 1rem', background: 'linear-gradient(to right, #f8fafc, #ffffff, #f8fafc)', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>#{order.orderNumber}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatOrderDate(order.dateCreated)}</span>
                          </div>
                        </div>
                        <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <div style={{
                            width: '1.5rem', height: '1.5rem', borderRadius: '0.375rem', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: selectedOrders.includes(order.id) ? '#f59e0b' : '#ffffff',
                            borderColor: selectedOrders.includes(order.id) ? '#f59e0b' : '#cbd5e1',
                            color: selectedOrders.includes(order.id) ? '#ffffff' : 'transparent',
                          }}>
                            {selectedOrders.includes(order.id) && <Check style={{ width: '1rem', height: '1rem' }} />}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.625rem', width: '100%' }}>
                        <span style={{ padding: '0.25rem 0.625rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', backgroundColor: dsb.bg, color: dsb.color, border: `1px solid ${dsb.border}` }}>
                          {dsb.icon}
                          <span>{dsb.label}</span>
                        </span>
                        <span style={{ padding: '0.25rem 0.625rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.375rem', backgroundColor: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>
                          {sb.icon}
                          <span>{sb.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ width: '1.75rem', height: '1.75rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #fde68a' }}>
                          <Package style={{ width: '0.875rem', height: '0.875rem', color: '#d97706' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{order.customerName}</p>
                          <a href={`tel:${order.customerPhone}`} style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem', textDecoration: 'none' }}>
                            <Phone style={{ width: '0.75rem', height: '0.75rem', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customerPhone}</span>
                          </a>
                        </div>
                      </div>
                      {order.customerAddress && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem', padding: '0.625rem', border: '1px solid #dbeafe' }}>
                          <div style={{ width: '1rem', height: '1rem', backgroundColor: '#dbeafe', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.125rem' }}>
                            <MapPin style={{ width: '0.625rem', height: '0.625rem', color: '#2563eb' }} />
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#334155', lineHeight: 1.3, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0 }}>{order.customerAddress}</p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div style={{ borderTop: '1px solid #e2e8f0', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('total')}</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{order.total?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{t('currency')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrderId && orderDetails && (
        <OrderDetailsModal order={orderDetails.order || orderDetails} onClose={() => setSelectedOrderId(null)} />
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedOrders.length}
        onClearSelection={clearSelection}
        onSelectAll={toggleSelectAll}
        isAllSelected={selectedOrders.length === orders.length}
        totalCount={orders.length}
        actions={[
          { id: 'details', label: t('details'), icon: <Info style={{ width: '0.875rem', height: '0.875rem' }} />, onClick: () => setSelectedOrderId(selectedOrders[0]), hidden: selectedOrders.length !== 1 },
          { id: 'preview-receipt', label: t('previewReceipt'), icon: <Receipt style={{ width: '0.875rem', height: '0.875rem' }} />, onClick: () => handlePreview('receipt'), hidden: selectedOrders.length !== 1 },
          { id: 'preview-delivery-note', label: t('previewDeliveryNote'), icon: <Truck style={{ width: '0.875rem', height: '0.875rem' }} />, onClick: () => handlePreview('delivery-note'), hidden: selectedOrders.length !== 1 },
          { id: 'cancel-delivery', label: t('cancelDelivery'), icon: <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />, onClick: () => cancelDeliveryMutation.mutate(selectedOrders), variant: 'danger' as const, hidden: !selectedOrders.every(orderId => { const order = orders.find((o: any) => o.id === orderId); return order && ['pending', 'assigned', 'confirmed'].includes(order.deliveryStatus); }) },
          { id: 'delete', label: t('delete'), icon: <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />, onClick: () => toastConfirm(t('deleteOrders'), () => deleteMutation.mutate(selectedOrders), { description: t('confirmDeleteOrders'), confirmLabel: t('delete') }), variant: 'danger' as const },
        ]}
      >
        {/* Assign to Delivery */}
        <div style={{ position: 'relative' }}>
          <User style={{ width: '0.875rem', height: '0.875rem', color: '#d97706', position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 10 }} />
          <Dropdown
            onChange={(e) => {
              if (e.value) {
                let assignedCount = 0;
                let skippedCount = 0;
                selectedOrders.forEach(orderId => {
                  const order = orders.find((o: any) => o.id === orderId);
                  if (order && order.deliveryStatus === 'pending') { handleAssign(orderId, e.value); assignedCount++; } else { skippedCount++; }
                });
                if (assignedCount > 0) toastSuccess(`${assignedCount} ${t('ordersAssigned')}`);
                if (skippedCount > 0) toastWarning(`${skippedCount} ${t('ordersSkippedNotPending')}`);
                clearSelection();
              }
            }}
            options={deliveryPersons.filter((p: any) => p.isActive).map((person: any) => ({ label: person.name, value: String(person.id) }))}
            optionLabel="label"
            optionValue="value"
            placeholder={t('assignToDelivery')}
            style={{ maxWidth: '10rem', paddingLeft: '2rem' }}
          />
        </div>
      </FloatingActionBar>

      <PDFPreviewModal isOpen={showPDFPreview} onClose={() => setShowPDFPreview(false)} pdfUrl={pdfUrl} title={pdfTitle} />
    </AdminLayout>
  );
}
