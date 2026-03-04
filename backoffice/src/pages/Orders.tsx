import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService, deliveryPersonService, partnersService } from '../modules';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import { MultiSelect } from 'primereact/multiselect';
import { Phone, MapPin, X, Search, Package, Eye, Check, Square, UserPlus, ShoppingCart, Trash2, Info, Receipt, Truck, Clock, User, CheckCircle, AlertCircle, XCircle, Navigation, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { toastSuccess, toastDeleted, toastCancelled, toastError, toastWarning, toastConfirm } from '../services/toast.service';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { DataTable, DataTablePageEvent } from 'primereact/datatable';
import { Sidebar } from 'primereact/sidebar';
import { Column } from 'primereact/column';
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
  const [searchInput, setSearchInput] = useState('');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string[]>([]);
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
    deliveryStatus: [] as string[],
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
        const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0);
        const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999);
        return { start: s, end: e };
      }
      case 'month': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
      case 'year': return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
      case 'custom':
        if (appliedFilters.dateRange.start && appliedFilters.dateRange.end) return { start: appliedFilters.dateRange.start, end: appliedFilters.dateRange.end };
        if (appliedFilters.dateRange.start) { const e2 = new Date(appliedFilters.dateRange.start); e2.setHours(23, 59, 59, 999); return { start: appliedFilters.dateRange.start, end: e2 }; }
        return { start: undefined, end: undefined };
      default: return { start: undefined, end: undefined };
    }
  }, [appliedFilters.dateFilterType, appliedFilters.dateRange]);

  const { data: ordersData = { orders: [], count: 0, totalCount: 0, statusCounts: {} }, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', JSON.stringify(appliedFilters), currentPage, pageSize],
    queryFn: () => ordersService.getAll(
      appliedFilters.search, getDateRange.start, getDateRange.end, true,
      appliedFilters.deliveryStatus?.length > 0 ? appliedFilters.deliveryStatus : undefined,
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
      const m = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
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

  const deliveryStatusOptions = [
    { label: t('pending'), value: 'pending' },
    { label: t('assigned'), value: 'assigned' },
    { label: t('confirmed'), value: 'confirmed' },
    { label: t('pickedUp'), value: 'picked_up' },
    { label: t('toDelivery'), value: 'to_delivery' },
    { label: t('inDelivery'), value: 'in_delivery' },
    { label: t('delivered'), value: 'delivered' },
    { label: t('canceled'), value: 'canceled' },
  ];

  const resetFilters = () => {
    setOrderNumberSearch(''); setCustomerIdSearch(''); setCustomerPhoneSearch(''); setDeliveryPersonIdSearch('');
    setSearchInput(''); setFromClientFilter('all'); setDateFilterType('custom'); setDateRange({ start: undefined, end: undefined });
    setDeliveryStatusFilter([]);
    setCurrentPage(1); setPageSize(50);
    setAppliedFilters({ search: '', orderNumber: '', deliveryStatus: [], fromClient: 'all', dateFilterType: 'custom', dateRange: { start: undefined, end: undefined } });
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
      deliveryStatus: deliveryStatusFilter, fromClient: fromClientFilter,
      dateFilterType: 'custom', dateRange: { start: dateRange.start, end: dateRange.end },
    });
    setFiltersExpanded(false);
  };

  // Calendar date range state
  const calendarDates = dateRange.start && dateRange.end ? [dateRange.start, dateRange.end] : dateRange.start ? [dateRange.start] : null;

  return (
    <AdminLayout>
      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
          <PageHeader
            icon={ShoppingCart}
            title={t('orders')}
            subtitle={t('viewAndAssignOrders')}
            actions={
              <>
                {/* Filters Toggle */}
                <Button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  style={{
                    paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem',
                    backgroundColor: filtersExpanded ? '#f59e0b' : '#ffffff',
                    color: filtersExpanded ? '#ffffff' : '#334155',
                    boxShadow: filtersExpanded ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                    ...(filtersExpanded ? {} : { border: '1px solid #cbd5e1' }),
                  }}
                  text={!filtersExpanded}
                  icon={<Filter style={{ width: '1rem', height: '1rem' }} />}
                  label={t('filters')}
                  iconPos="left"
                >
                  {filtersExpanded ? <ChevronUp style={{ width: '1rem', height: '1rem' }} /> : <ChevronDown style={{ width: '1rem', height: '1rem' }} />}
                  {(appliedFilters.search || appliedFilters.fromClient !== 'all' || appliedFilters.dateRange.start || appliedFilters.dateRange.end || appliedFilters.deliveryStatus?.length > 0) && !filtersExpanded && (
                    <span style={{ marginLeft: '0.25rem', padding: '0.125rem 0.5rem', backgroundColor: '#f59e0b', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, borderRadius: '9999px' }}>
                      {[appliedFilters.search, appliedFilters.fromClient !== 'all', Boolean(appliedFilters.dateRange.start || appliedFilters.dateRange.end), appliedFilters.deliveryStatus?.length > 0].filter(Boolean).length}
                    </span>
                  )}
                </Button>
              </>
            }
          />
        </div>

        {/* Filters Overlay Panel */}
        <Sidebar
          visible={filtersExpanded}
          onHide={() => setFiltersExpanded(false)}
          position="right"
          style={{ width: '35rem' }}
          showCloseIcon={false}
          blockScroll
          pt={{ header: { style: { display: 'none' } }, content: { style: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' } } }}
        >
          {/* Panel Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(to right, #f59e0b, #d97706)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Filter style={{ width: '1.25rem', height: '1.25rem', color: '#ffffff' }} />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>{t('filters')}</h2>
            </div>
            <Button onClick={() => setFiltersExpanded(false)} text rounded icon={<X style={{ width: '1.25rem', height: '1.25rem', color: '#ffffff' }} />} style={{ padding: '0.5rem' }} />
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
                    showClear={orderNumberSearch !== ''}
                    placeholder="E.g., ORD-1001"
                    emptyMessage={t('noOrdersFound')}
                    style={{ width: '100%' }}
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
                    showClear={customerIdSearch !== ''}
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
                      <Button
                        onClick={() => setCustomerPhoneSearch('')}
                        text
                        rounded
                        icon={<X style={{ width: '1rem', height: '1rem' }} />}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 10 }}
                      />
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
                    showClear={deliveryPersonIdSearch !== ''}
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
                  <Button
                    key={filter.key}
                    onClick={() => setFromClientFilter(filter.key as any)}
                    label={filter.label}
                    text={fromClientFilter !== filter.key}
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: fromClientFilter === filter.key ? '#3b82f6' : '#f8fafc',
                      color: fromClientFilter === filter.key ? '#ffffff' : '#334155',
                      border: fromClientFilter === filter.key ? 'none' : '2px solid #e2e8f0',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Delivery Status Filter */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck style={{ width: '1rem', height: '1rem', color: '#d97706' }} />
                {t('deliveryStatus')}
              </div>
              <MultiSelect
                value={deliveryStatusFilter}
                onChange={(e) => setDeliveryStatusFilter(e.value)}
                options={deliveryStatusOptions}
                optionLabel="label"
                optionValue="value"
                placeholder={t('all')}
                display="chip"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Panel Footer */}
          <div style={{ borderTop: '1px solid #e2e8f0', padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', gap: '0.75rem' }}>
            <Button label={t('reset')} outlined onClick={resetFilters} style={{ flex: 1 }} />
            <Button label={t('apply')} onClick={applyFilters} style={{ flex: 1 }} />
          </div>
        </Sidebar>

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
                {(appliedFilters.search || appliedFilters.orderNumber || appliedFilters.deliveryStatus?.length > 0 || appliedFilters.fromClient !== 'all' || appliedFilters.dateRange.start || appliedFilters.dateRange.end)
                  ? "Aucune commande ne correspond à vos critères de recherche. Essayez de modifier les filtres."
                  : "Aucune commande pour le moment. Les nouvelles commandes apparaîtront ici."}
              </p>
              {(appliedFilters.search || appliedFilters.orderNumber || appliedFilters.deliveryStatus?.length > 0 || appliedFilters.fromClient !== 'all' || appliedFilters.dateRange.start || appliedFilters.dateRange.end) && (
                <Button label="Réinitialiser les filtres" onClick={resetFilters} style={{ marginTop: '1.5rem' }} />
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <style>{`
              .ord-datatable .p-datatable-thead > tr > th { background: #f8fafc; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
              .ord-datatable .p-datatable-tbody > tr > td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; }
              .ord-datatable .p-datatable-tbody > tr:hover > td { background: #f8fafc !important; }
              .ord-datatable .p-datatable-tbody > tr.p-highlight > td { background: #fffbeb !important; }
              .ord-datatable .p-paginator { border: none; border-bottom: 1px solid #e2e8f0; background: transparent; padding: 0.125rem 0.5rem; border-radius: 0; }
              .ord-datatable .p-paginator .p-paginator-page.p-highlight { background: #f59e0b; color: #fff; border-color: #f59e0b; }
            `}</style>
            <DataTable
              className="ord-datatable"
              value={orders}
              lazy
              totalRecords={totalCount}
              first={(currentPage - 1) * pageSize}
              onPage={(e: DataTablePageEvent) => {
                setCurrentPage(Math.floor(e.first / e.rows) + 1);
                setPageSize(e.rows);
              }}
              selection={orders.filter((o: any) => selectedOrders.includes(o.id))}
              onSelectionChange={(e) => setSelectedOrders((e.value as any[]).map((o) => o.id))}
              selectionMode="checkbox"
              dataKey="id"
              paginator
              paginatorPosition="top"
              rows={pageSize}
              rowsPerPageOptions={[10, 25, 50, 100]}
              removableSort
              loading={ordersLoading}
              emptyMessage="Aucune commande trouvée."
              paginatorTemplate="CurrentPageReport PrevPageLink NextPageLink RowsPerPageDropdown"
                currentPageReportTemplate="{first}-{last} of {totalRecords}"
            >
              <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
              <Column
                header={t('orderNumber')}
                sortable
                sortField="orderNumber"
                body={(order: any) => (
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>#{order.orderNumber}</span>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>{formatOrderDate(order.dateCreated)}</p>
                  </div>
                )}
              />
              <Column
                header={t('status')}
                body={(order: any) => {
                  const dsb = getDeliveryStatusBadge(order.deliveryStatus);
                  const sb = getSourceBadge(order);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.375rem', backgroundColor: dsb.bg, color: dsb.color, border: `1px solid ${dsb.border}` }}>
                        {dsb.icon}<span>{dsb.label}</span>
                      </span>
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>
                        {sb.icon}{sb.label}
                      </span>
                    </div>
                  );
                }}
              />
              <Column
                header={t('customer')}
                sortable
                sortField="customerName"
                body={(order: any) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '2rem', height: '2rem', background: 'linear-gradient(to bottom right, #fbbf24, #d97706)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package style={{ width: '0.75rem', height: '0.75rem', color: '#ffffff' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{order.customerName}</p>
                      <a href={`tel:${order.customerPhone}`} style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.125rem', textDecoration: 'none' }}>
                        <Phone style={{ width: '0.625rem', height: '0.625rem' }} />{order.customerPhone}
                      </a>
                    </div>
                  </div>
                )}
              />
              <Column
                header={t('address')}
                body={(order: any) => order.customerAddress ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <MapPin style={{ width: '0.75rem', height: '0.75rem', color: '#d97706', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>{order.customerAddress}</span>
                  </div>
                ) : <span style={{ color: '#cbd5e1' }}>—</span>}
              />
              <Column
                header={t('total')}
                sortable
                sortField="total"
                body={(order: any) => (
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#d97706' }}>
                    {order.total?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{t('currency')}</span>
                  </span>
                )}
              />
              <Column
                header={t('actions')}
                body={(order: any) => (
                  <Button
                    text
                    rounded
                    onClick={() => setSelectedOrderId(order.id)}
                    icon={<Info style={{ width: '1rem', height: '1rem', color: '#64748b' }} />}
                    title={t('details')}
                    style={{ padding: '0.375rem' }}
                  />
                )}
              />
            </DataTable>
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
