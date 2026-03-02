import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toastSuccess, toastError } from '../services/toast.service';
import { deliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { NotificationBell } from '../components/NotificationBell';
import { Package, Truck, Phone, MapPin } from 'lucide-react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Sidebar } from 'primereact/sidebar';
import { Calendar } from 'primereact/calendar';
import { Paginator } from 'primereact/paginator';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
import type { Order } from '../types';

export default function Orders() {
  const { deliveryPerson, logout } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Applied filters
  const [appliedFilters, setAppliedFilters] = useState({
    orderNumber: '',
    customerName: '',
    startDate: '',
    endDate: '',
  });

  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['orders', deliveryPerson?.id, currentPage + 1, pageSize, appliedFilters],
    queryFn: () => deliveryPerson ? deliveryService.getMyOrders(deliveryPerson.id, {
      page: currentPage + 1,
      pageSize,
      ...appliedFilters,
    }) : Promise.resolve({ success: true, orders: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }),
    enabled: !!deliveryPerson,
  });

  const orders = ordersData?.orders || [];
  const totalCount = ordersData?.total || 0;

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered' }) =>
      deliveryService.updateOrderStatus(orderId, status, deliveryPerson!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('statusUpdated'));
    },
    onError: () => {
      toastError(t('statusUpdateFailed'));
    },
  });

  const filteredOrders = orders.filter((order: Order) =>
    deliveryStatusFilter === 'all' || order.status === deliveryStatusFilter
  );

  const deliveryStatusCounts = {
    all: orders.length,
    pending: orders.filter((o: Order) => o.status === 'pending').length,
    assigned: orders.filter((o: Order) => o.status === 'assigned').length,
    confirmed: orders.filter((o: Order) => o.status === 'confirmed').length,
    picked_up: orders.filter((o: Order) => o.status === 'picked_up').length,
    to_delivery: orders.filter((o: Order) => o.status === 'to_delivery').length,
    in_delivery: orders.filter((o: Order) => o.status === 'in_delivery').length,
    delivered: orders.filter((o: Order) => o.status === 'delivered').length,
    canceled: orders.filter((o: Order) => o.status === 'canceled').length,
  };

  const applyFilters = () => {
    setAppliedFilters({
      orderNumber: orderNumberFilter,
      customerName: customerNameFilter,
      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
      endDate: endDate ? endDate.toISOString().split('T')[0] : '',
    });
    setCurrentPage(0);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setOrderNumberFilter('');
    setCustomerNameFilter('');
    setStartDate(null);
    setEndDate(null);
    setAppliedFilters({ orderNumber: '', customerName: '', startDate: '', endDate: '' });
    setCurrentPage(0);
    setShowFilters(false);
  };

  const getStatusSeverity = (status: string | null): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | null => {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      pending: 'secondary',
      assigned: 'info',
      confirmed: 'info',
      picked_up: 'warning',
      to_delivery: 'warning',
      in_delivery: 'warning',
      delivered: 'success',
      canceled: 'danger',
    };
    return map[status || 'pending'] || 'secondary';
  };

  const getStatusLabel = (status: string | null): string => {
    const map: Record<string, string> = {
      pending: t('pending'),
      assigned: t('assigned'),
      confirmed: t('confirmed'),
      picked_up: t('pickedUp'),
      to_delivery: t('toDelivery'),
      in_delivery: t('inDelivery'),
      delivered: t('delivered'),
      canceled: t('canceled'),
    };
    return map[status || 'pending'] || t('pending');
  };

  const getStatusIcon = (status: string | null): string => {
    const map: Record<string, string> = {
      pending: '⏳', assigned: '👤', confirmed: '✓', picked_up: '📦',
      to_delivery: '⚠️', in_delivery: '🚗', delivered: '✅', canceled: '❌',
    };
    return map[status || 'pending'] || '⏳';
  };

  const getStatusTimestamp = (order: Order): string | null => {
    const timestampMap: Record<string, string | undefined> = {
      pending: order.pendingAt, assigned: order.assignedAt, confirmed: order.confirmedAt,
      picked_up: order.pickedUpAt, to_delivery: order.toDeliveryAt,
      in_delivery: order.inDeliveryAt, delivered: order.deliveredAt, canceled: order.canceledAt,
    };
    return timestampMap[order.status || 'pending'] || null;
  };

  const formatStatusTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const openNavigation = (order: Order, app: 'google' | 'waze') => {
    if (!order.latitude || !order.longitude) return;
    const url = app === 'waze'
      ? `https://waze.com/ul?ll=${order.latitude},${order.longitude}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`;
    window.open(url, '_blank');
  };

  const getWorkflowAction = (order: Order): { label: string; nextStatus: 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered'; severity: 'info' | 'warning' | 'success' | 'help' } | null => {
    const statusActions: Record<string, { label: string; nextStatus: 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered'; severity: 'info' | 'warning' | 'success' | 'help' }> = {
      assigned: { label: t('confirmOrder'), nextStatus: 'confirmed', severity: 'info' },
      confirmed: { label: t('pickUpOrder'), nextStatus: 'picked_up', severity: 'help' },
      picked_up: { label: t('startToDelivery'), nextStatus: 'to_delivery', severity: 'warning' },
      to_delivery: { label: t('startDelivery'), nextStatus: 'in_delivery', severity: 'warning' },
      in_delivery: { label: t('markAsDelivered'), nextStatus: 'delivered', severity: 'success' },
    };
    return statusActions[order.status || ''] || null;
  };

  const formatOrderDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusFilterItems = [
    { key: 'all', label: `📦 ${t('all')}`, count: deliveryStatusCounts.all },
    { key: 'pending', label: `⏳ ${t('pending')}`, count: deliveryStatusCounts.pending },
    { key: 'assigned', label: `👤 ${t('assigned')}`, count: deliveryStatusCounts.assigned },
    { key: 'confirmed', label: `✓ ${t('confirmed')}`, count: deliveryStatusCounts.confirmed },
    { key: 'picked_up', label: `📦 ${t('pickedUp')}`, count: deliveryStatusCounts.picked_up },
    { key: 'to_delivery', label: `⚠️ ${t('toDelivery')}`, count: deliveryStatusCounts.to_delivery },
    { key: 'in_delivery', label: `🚗 ${t('inDelivery')}`, count: deliveryStatusCounts.in_delivery },
    { key: 'delivered', label: `✅ ${t('delivered')}`, count: deliveryStatusCounts.delivered },
    { key: 'canceled', label: `❌ ${t('canceled')}`, count: deliveryStatusCounts.canceled },
  ];

  const activeFilterCount = [appliedFilters.orderNumber, appliedFilters.customerName, appliedFilters.startDate, appliedFilters.endDate].filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--orderium-bg)' }}>
      {/* Header */}
      <div className="surface-card shadow-1 sticky" style={{ top: 0, zIndex: 10 }}>
        <div className="flex align-items-center justify-content-between px-3 md:px-5 py-3" style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div className="flex align-items-center gap-3">
            <div className="flex align-items-center justify-content-center border-round-xl"
              style={{ width: '2.75rem', height: '2.75rem', background: 'linear-gradient(135deg, var(--orderium-primary), var(--orderium-primary-dark))' }}>
              <span className="text-2xl font-bold text-white">O</span>
            </div>
            <div>
              <h1 className="text-xl font-bold m-0" style={{ color: 'var(--orderium-text)' }}>{t('myDeliveries')}</h1>
              <p className="text-sm m-0 mt-1" style={{ color: 'var(--orderium-text-secondary)' }}>
                {t('welcomeBack')}, {deliveryPerson?.name}
              </p>
            </div>
          </div>
          <div className="flex align-items-center gap-2">
            <NotificationBell />
            <LanguageToggle />
            <Button
              icon="pi pi-sign-out"
              label={t('signOut')}
              severity="secondary"
              text
              size="small"
              onClick={logout}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 md:px-5 py-4" style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Filter Button */}
        <div className="flex justify-content-end mb-3">
          <Button
            icon="pi pi-filter"
            label={t('filters')}
            severity="secondary"
            outlined
            size="small"
            badge={activeFilterCount > 0 ? String(activeFilterCount) : undefined}
            onClick={() => setShowFilters(true)}
          />
        </div>

        {/* Filter Sidebar */}
        <Sidebar
          visible={showFilters}
          position="right"
          onHide={() => setShowFilters(false)}
          header={
            <div className="flex align-items-center gap-2">
              <i className="pi pi-filter" />
              <span className="font-bold">{t('filters')}</span>
            </div>
          }
          style={{ width: '28rem' }}
        >
          <div className="flex flex-column gap-4">
            <div className="flex flex-column gap-2">
              <label className="font-semibold text-sm">{t('orderNumber')}</label>
              <InputText
                value={orderNumberFilter}
                onChange={(e) => setOrderNumberFilter(e.target.value)}
                placeholder={t('enterOrderNumber')}
                className="w-full"
              />
            </div>

            <div className="flex flex-column gap-2">
              <label className="font-semibold text-sm">{t('customerName')}</label>
              <InputText
                value={customerNameFilter}
                onChange={(e) => setCustomerNameFilter(e.target.value)}
                placeholder={t('enterCustomerName')}
                className="w-full"
              />
            </div>

            <Divider />

            <div className="flex flex-column gap-2">
              <label className="font-bold text-sm text-uppercase">{t('dateRange')}</label>
              <div className="grid">
                <div className="col-6">
                  <label className="text-sm mb-1 block">{t('start')}</label>
                  <Calendar
                    value={startDate}
                    onChange={(e) => setStartDate(e.value as Date)}
                    dateFormat="dd/mm/yy"
                    placeholder={t('start')}
                    showIcon
                    className="w-full"
                  />
                </div>
                <div className="col-6">
                  <label className="text-sm mb-1 block">{t('end')}</label>
                  <Calendar
                    value={endDate}
                    onChange={(e) => setEndDate(e.value as Date)}
                    dateFormat="dd/mm/yy"
                    placeholder={t('end')}
                    showIcon
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <Divider />

            <div className="flex gap-3">
              <Button
                label={t('reset')}
                severity="secondary"
                outlined
                className="flex-1"
                onClick={resetFilters}
              />
              <Button
                label={t('apply')}
                className="flex-1"
                onClick={applyFilters}
              />
            </div>
          </div>
        </Sidebar>

        {/* Status Filter Bar */}
        <Card className="mb-3">
          <div className="flex align-items-center gap-2 mb-3">
            <Truck size={16} style={{ color: 'var(--orderium-primary)' }} />
            <span className="font-bold text-sm text-uppercase" style={{ color: 'var(--orderium-text-secondary)', letterSpacing: '0.05em' }}>
              {t('deliveryStatus')}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusFilterItems.map((filter) => (
              <Button
                key={filter.key}
                label={`${filter.label} (${filter.count})`}
                size="small"
                severity={deliveryStatusFilter === filter.key ? 'warning' : 'secondary'}
                outlined={deliveryStatusFilter !== filter.key}
                onClick={() => setDeliveryStatusFilter(filter.key)}
              />
            ))}
          </div>
        </Card>

        {/* Paginator */}
        {totalCount > 0 && (
          <Paginator
            first={currentPage * pageSize}
            rows={pageSize}
            totalRecords={totalCount}
            rowsPerPageOptions={[10, 50, 100]}
            onPageChange={(e) => { setCurrentPage(e.page); setPageSize(e.rows); }}
            className="mb-3"
          />
        )}

        {/* Orders Grid */}
        {isLoading ? (
          <div className="flex align-items-center justify-content-center" style={{ height: '16rem' }}>
            <ProgressSpinner />
          </div>
        ) : error ? (
          <Message severity="error" text={t('error')} className="w-full" />
        ) : filteredOrders.length === 0 ? (
          <Card className="text-center">
            <Package size={64} style={{ color: 'var(--orderium-text-muted)' }} className="mb-3" />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--orderium-text)' }}>{t('noOrdersFound')}</h3>
            <p style={{ color: 'var(--orderium-text-secondary)' }}>
              {deliveryStatusFilter === 'all'
                ? t('noOrdersAssigned')
                : `${t('noOrdersMessage')} ${getStatusLabel(deliveryStatusFilter)}`
              }
            </p>
          </Card>
        ) : (
          <div className="grid">
            {filteredOrders.map((order: Order) => (
              <div key={order.orderId} className="col-12 sm:col-6 lg:col-4 xl:col-3">
                <Card className="h-full">
                  {/* Header */}
                  <div className="flex align-items-center justify-content-between mb-2">
                    <span className="font-bold text-sm">#{order.orderNumber}</span>
                    <span className="text-xs" style={{ color: 'var(--orderium-text-muted)' }}>{formatOrderDate(order.createdAt)}</span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex align-items-center gap-2 mb-3 flex-wrap">
                    <Tag
                      value={`${getStatusIcon(order.status || null)} ${getStatusLabel(order.status || null)}`}
                      severity={getStatusSeverity(order.status || null)}
                    />
                    {getStatusTimestamp(order) && (
                      <span className="text-xs" style={{ color: 'var(--orderium-text-muted)' }}>
                        {formatStatusTimestamp(getStatusTimestamp(order))}
                      </span>
                    )}
                  </div>

                  {/* Customer */}
                  <div className="flex align-items-start gap-2 mb-2">
                    <div className="flex align-items-center justify-content-center border-round"
                      style={{ width: '1.75rem', height: '1.75rem', background: '#fff3e0', flexShrink: 0 }}>
                      <Package size={14} style={{ color: 'var(--orderium-primary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm m-0 white-space-nowrap overflow-hidden text-overflow-ellipsis">{order.customerName}</p>
                      <a href={`tel:${order.customerPhone}`} className="text-sm flex align-items-center gap-1 mt-1 no-underline" style={{ color: 'var(--orderium-primary)' }}>
                        <Phone size={12} />
                        <span>{order.customerPhone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  {order.customerAddress && (
                    <div className="flex align-items-start gap-2 p-2 border-round mb-2" style={{ background: '#eff6ff', border: '1px solid #dbeafe' }}>
                      <MapPin size={12} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
                      <p className="text-xs m-0 line-height-3" style={{ color: 'var(--orderium-text)' }}>{order.customerAddress}</p>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  {order.latitude && order.longitude && (
                    <div className="flex gap-2 mb-2">
                      <Button
                        label="Google Maps"
                        icon="pi pi-map"
                        size="small"
                        severity="info"
                        className="flex-1"
                        onClick={() => openNavigation(order, 'google')}
                      />
                      <Button
                        label="Waze"
                        icon="pi pi-compass"
                        size="small"
                        severity="help"
                        className="flex-1"
                        onClick={() => openNavigation(order, 'waze')}
                      />
                    </div>
                  )}

                  {/* Workflow Action */}
                  {order.status === 'delivered' ? (
                    <Message severity="success" text={t('orderDelivered')} className="w-full" />
                  ) : order.status === 'canceled' ? (
                    <Message severity="error" text={t('orderCanceled')} className="w-full" />
                  ) : (() => {
                    const action = getWorkflowAction(order);
                    return action ? (
                      <Button
                        label={updateStatusMutation.isPending ? t('updating') : action.label}
                        severity={action.severity}
                        className="w-full"
                        loading={updateStatusMutation.isPending}
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatusMutation.mutate({ orderId: order.orderId, status: action.nextStatus })}
                      />
                    ) : null;
                  })()}

                  {/* Footer */}
                  <Divider className="my-2" />
                  <div className="flex align-items-center justify-content-between">
                    <span className="text-xs font-semibold text-uppercase" style={{ color: 'var(--orderium-text-secondary)', letterSpacing: '0.05em' }}>{t('total')}</span>
                    <div className="flex align-items-baseline gap-1">
                      <span className="text-xl font-bold" style={{ color: 'var(--orderium-primary)' }}>{order.totalAmount?.toFixed(2)}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--orderium-text-muted)' }}>{t('currency')}</span>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
