import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/i18n';
import { ordersService } from '@/modules/orders';
import { Order, OrderItem } from '@/modules/orders/orders.interface';
import { Dialog } from 'primereact/dialog';
import { Sidebar } from 'primereact/sidebar';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { OrderTracking } from '@/components/OrderTracking';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { Package, MapPin, Calendar as CalendarIcon, ShoppingBag, Eye, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-ground)' }} dir={dir}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', border: '3px solid var(--surface-border)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'cl-spin 0.75s linear infinite' }} />
          <p style={{ color: 'var(--text-color-secondary)', margin: 0 }}>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user?.customerId) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-ground)', padding: '1.5rem 1rem' }} dir={dir}>
        <div style={{ maxWidth: '40rem', margin: '4rem auto', textAlign: 'center' }}>
          <div className="cl-empty-icon"><Package style={{ width: '2.5rem', height: '2.5rem', color: '#d1d5db' }} /></div>
          <h3 style={{ color: 'var(--text-color)', fontWeight: 600, marginBottom: '0.5rem' }}>{t('cannotLoadOrders')}</h3>
          <p style={{ color: 'var(--text-color-secondary)' }}>{t('noCustomerId')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-ground)' }} dir={dir}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem' }}>

        {/* Page header */}
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary-color)' }} />
            {t('myOrders')}
          </h1>
          <button
            onClick={() => setFiltersExpanded(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '0.75rem',
              background: (appliedFilters.orderNumber || appliedFilters.dateRange.start) ? 'var(--primary-color)' : 'var(--surface-card)',
              color: (appliedFilters.orderNumber || appliedFilters.dateRange.start) ? 'white' : 'var(--text-color)',
              border: '1px solid var(--surface-border)', cursor: 'pointer',
              fontWeight: 500, fontSize: '0.875rem', transition: 'all 0.2s',
            }}
          >
            <Filter style={{ width: '0.875rem', height: '0.875rem' }} />
            {t('filters')}
            {(appliedFilters.orderNumber || appliedFilters.dateRange.start) && (
              <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '9999px', padding: '0.1rem 0.4rem', fontSize: '0.75rem', fontWeight: 700 }}>
                {[Boolean(appliedFilters.orderNumber), Boolean(appliedFilters.dateRange.start)].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Status filter chips */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem', scrollbarWidth: 'none' }}>
          {[
            { key: 'all', label: t('all') },
            { key: 'pending', label: t('statusPending') },
            { key: 'assigned', label: t('statusAssigned') },
            { key: 'confirmed', label: t('statusConfirmed') },
            { key: 'picked_up', label: t('statusPickedUp') },
            { key: 'to_delivery', label: t('statusToDelivery') },
            { key: 'in_delivery', label: t('statusInDelivery') },
            { key: 'delivered', label: t('statusDelivered') },
            { key: 'canceled', label: t('statusCanceled') },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key as typeof statusFilter); setCurrentPage(1); }}
              style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.875rem', borderRadius: '9999px',
                background: statusFilter === f.key ? 'var(--primary-color)' : 'var(--surface-card)',
                color: statusFilter === f.key ? 'white' : 'var(--text-color)',
                border: statusFilter === f.key ? 'none' : '1px solid var(--surface-border)',
                fontWeight: statusFilter === f.key ? 600 : 400,
                fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: statusFilter === f.key ? '0 2px 8px rgba(5,150,105,0.3)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
              <span style={{
                background: statusFilter === f.key ? 'rgba(255,255,255,0.25)' : 'var(--surface-100)',
                color: statusFilter === f.key ? 'white' : 'var(--text-color-secondary)',
                borderRadius: '9999px', padding: '0.05rem 0.375rem', fontSize: '0.7rem', fontWeight: 600,
              }}>
                {statusCounts[f.key as keyof typeof statusCounts]}
              </span>
            </button>
          ))}
        </div>

        {/* Orders list */}
        {orders.length === 0 ? (
          <div className="cl-empty" style={{ padding: '4rem 0' }}>
            <div className="cl-empty-icon"><Package style={{ width: '2.5rem', height: '2.5rem', color: '#d1d5db' }} /></div>
            <h3 style={{ fontWeight: 600, color: 'var(--text-color)', margin: '0 0 0.5rem' }}>{t('noOrdersFound')}</h3>
            <p style={{ color: 'var(--text-color-secondary)', margin: 0, fontSize: '0.875rem' }}>
              {appliedFilters.orderNumber ? t('noResultsMessage') : t('noOrdersYet')}
            </p>
          </div>
        ) : (
          <>
            {/* Pagination bar */}
            {totalCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>
                  {t('showing')} <strong style={{ color: 'var(--text-color)' }}>{startIndex}–{endIndex}</strong> {t('of')} <strong style={{ color: 'var(--text-color)' }}>{totalCount}</strong>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Dropdown
                    value={pageSize}
                    onChange={e => { setPageSize(e.value); setCurrentPage(1); }}
                    options={[{ label: '10', value: 10 }, { label: '20', value: 20 }, { label: '50', value: 50 }]}
                    optionLabel="label" optionValue="value"
                    style={{ height: '2.25rem', fontSize: '0.8125rem' }}
                  />
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="cl-page-btn"
                    style={{ opacity: currentPage === 1 ? 0.4 : 1 }}
                  >
                    <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
                  </button>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-color)' }}>{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="cl-page-btn"
                    style={{ opacity: currentPage === totalPages ? 0.4 : 1 }}
                  >
                    <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                  </button>
                </div>
              </div>
            )}

            {/* Order cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {orders.map(order => {
                const status = getStatusStyle(order.deliveryStatus);
                return (
                  <div key={order.id} style={{ background: 'var(--surface-card)', borderRadius: '1rem', border: '1px solid var(--surface-border)', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                    {/* Card header */}
                    <div style={{ padding: '0.875rem', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-50)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package style={{ width: '1rem', height: '1rem', color: 'var(--primary-color)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'monospace', color: 'var(--text-color)' }}>{order.orderNumber}</span>
                      </div>
                      <span style={{ background: status.bg, color: status.color, padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {status.label}
                      </span>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '0.875rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>
                        <CalendarIcon style={{ width: '0.875rem', height: '0.875rem', flexShrink: 0 }} />
                        {formatDate(order.dateCreated)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.625rem', borderTop: '1px solid var(--surface-border)' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{t('totalAmount')}</span>
                        <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--primary-color)' }}>{formatCurrency(order.total || 0, language)}</span>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                        <button
                          onClick={() => handleViewItems(order)}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                            padding: '0.625rem', borderRadius: '0.625rem', border: '1px solid var(--surface-border)',
                            background: 'var(--surface-50)', color: 'var(--text-color)', cursor: 'pointer',
                            fontSize: '0.8125rem', fontWeight: 500, transition: 'all 0.15s',
                          }}
                        >
                          <Eye style={{ width: '0.875rem', height: '0.875rem' }} />
                          {t('viewDetails')}
                        </button>
                        {order.deliveryStatus !== 'delivered' && order.deliveryStatus !== 'canceled' && (
                          <button
                            onClick={() => setSelectedOrder(order.orderNumber)}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                              padding: '0.625rem', borderRadius: '0.625rem', border: 'none',
                              background: 'var(--primary-color)', color: 'white', cursor: 'pointer',
                              fontSize: '0.8125rem', fontWeight: 600, transition: 'all 0.15s',
                            }}
                          >
                            <MapPin style={{ width: '0.875rem', height: '0.875rem' }} />
                            {t('track')}
                          </button>
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

      {/* Filters Sidebar */}
      <Sidebar
        visible={filtersExpanded}
        onHide={() => setFiltersExpanded(false)}
        position={dir === 'rtl' ? 'left' : 'right'}
        style={{ width: '24rem' }}
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter style={{ width: '1.125rem', height: '1.125rem' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{t('filters')}</span>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem', height: '100%' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
              <Search style={{ width: '0.875rem', height: '0.875rem' }} /> {t('orderNumber')}
            </label>
            <InputText
              placeholder={t('enterOrderNumber')}
              value={orderNumberSearch}
              onChange={e => setOrderNumberSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
              <CalendarIcon style={{ width: '0.875rem', height: '0.875rem' }} /> {t('dateRange')}
            </label>
            <Calendar
              value={dateRange}
              onChange={e => setDateRange(e.value as Date[] | undefined)}
              selectionMode="range"
              placeholder={t('selectDate')}
              className="w-full"
              showIcon readOnlyInput
            />
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => {
                setOrderNumberSearch(''); setDateRange(undefined); setStatusFilter('all'); setCurrentPage(1);
                setAppliedFilters({ orderNumber: '', dateRange: { start: undefined, end: undefined } });
                setFiltersExpanded(false);
              }}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-color)', cursor: 'pointer', fontWeight: 500 }}
            >
              {t('reset')}
            </button>
            <button
              onClick={() => {
                setCurrentPage(1);
                setAppliedFilters({ orderNumber: orderNumberSearch, dateRange: { start: dateRange?.[0], end: dateRange?.[1] } });
                setFiltersExpanded(false);
              }}
              className="cl-btn-primary"
              style={{ flex: 1, padding: '0.75rem' }}
            >
              {t('apply')}
            </button>
          </div>
        </div>
      </Sidebar>

      {/* Tracking Dialog */}
      <Dialog
        visible={!!selectedOrder}
        onHide={() => setSelectedOrder(null)}
        header={<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin style={{ width: '1.125rem', height: '1.125rem', color: 'var(--primary-color)' }} /><span>{t('trackOrder')}</span></div>}
        modal style={{ width: '95vw', maxWidth: '42rem' }}
        contentStyle={{ maxHeight: '80vh', overflow: 'auto' }}
      >
        {selectedOrder && user?.customerId && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ background: 'var(--surface-100)', borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>{t('orderNumber')}</p>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary-color)', fontFamily: 'monospace' }}>{selectedOrder}</p>
            </div>
            <OrderTracking orderNumber={selectedOrder} customerId={user.customerId} />
          </div>
        )}
      </Dialog>

      {/* Order Items Dialog */}
      <Dialog
        visible={!!selectedOrderItems}
        onHide={() => setSelectedOrderItems(null)}
        header={<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShoppingBag style={{ width: '1.125rem', height: '1.125rem', color: 'var(--primary-color)' }} /><span>{t('orderDetails')}</span></div>}
        modal style={{ width: '95vw', maxWidth: '48rem' }}
        contentStyle={{ padding: 0 }}
        footer={selectedOrderItems && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{t('total')}</span>
              <span style={{ fontWeight: 800, fontSize: '1.375rem', color: 'var(--primary-color)' }}>{formatCurrency(selectedOrderItems.order.total || 0, language)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button onClick={() => handlePreview('receipt')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--surface-border)', background: 'var(--surface-card)', cursor: 'pointer', fontWeight: 500 }}>
                <Eye style={{ width: '0.875rem', height: '0.875rem' }} /> {t('receipt')}
              </button>
              <button onClick={() => handlePreview('invoice')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--surface-border)', background: 'var(--surface-card)', cursor: 'pointer', fontWeight: 500 }}>
                <Eye style={{ width: '0.875rem', height: '0.875rem' }} /> {t('deliveryNote')}
              </button>
            </div>
          </div>
        )}
      >
        {selectedOrderItems && (
          <div style={{ padding: '1rem' }}>
            <div style={{ background: 'var(--surface-100)', borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div><p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>{t('orderNumber')}</p><p style={{ margin: 0, fontWeight: 700, color: 'var(--primary-color)', fontFamily: 'monospace' }}>{selectedOrderItems.order.orderNumber}</p></div>
              <div><p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>{t('date')}</p><p style={{ margin: 0, fontWeight: 500 }}>{formatDate(selectedOrderItems.order.dateCreated)}</p></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectedOrderItems.items.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem', fontWeight: 500, color: 'var(--text-color)' }}>{item.productName || `${t('cartProduct')} ${item.productId}`}</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-color-secondary)' }}>{item.quantity} × {formatCurrency(item.unitPrice, language)}</p>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{formatCurrency(item.total, language)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog>

      <PDFPreviewModal isOpen={showPDFPreview} onClose={() => setShowPDFPreview(false)} pdfUrl={pdfUrl} title={pdfTitle} />
    </div>
  );
}
