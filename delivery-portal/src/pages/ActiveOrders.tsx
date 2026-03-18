import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { deliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/i18n';
import { toastSuccess, toastError } from '../services/toast.service';
import { AppLayout } from '../components/AppLayout';
import orderiumLogo from '../assets/logo-delivery.svg';
import { NotificationBell } from '../components/NotificationBell';
import { Phone, MapPin, RefreshCw, Navigation, Package } from 'lucide-react';
import type { Order } from '../types';

const PRI = '#df7817';

type ActiveStatus = 'to_delivery' | 'in_delivery' | 'delivered';

function getStatusBadge(status: string | null | undefined) {
  if (status === 'picked_up') return { stripe: '#2563eb', bg: '#eff6ff', text: '#1d4ed8' };
  if (status === 'to_delivery') return { stripe: '#f59e0b', bg: '#fffbeb', text: '#b45309' };
  if (status === 'in_delivery') return { stripe: '#df7817', bg: '#fff7ed', text: '#9a4300' };
  return { stripe: '#94a3b8', bg: '#f1f5f9', text: '#475569' };
}

function getAction(status: string | null | undefined, t: (k: any) => string): {
  label: string; next: ActiveStatus; bg: string; shadow: string;
} | null {
  if (status === 'picked_up') return { label: t('startToDelivery'), next: 'to_delivery', bg: '#2563eb', shadow: 'rgba(37,99,235,0.35)' };
  if (status === 'to_delivery') return { label: t('startDelivery'), next: 'in_delivery', bg: '#f59e0b', shadow: 'rgba(245,158,11,0.35)' };
  if (status === 'in_delivery') return { label: t('markAsDelivered'), next: 'delivered', bg: '#16a34a', shadow: 'rgba(22,163,74,0.35)' };
  return null;
}

export default function ActiveOrders() {
  const { deliveryPerson } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  const { data: ordersData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['orders', deliveryPerson?.id],
    queryFn: () =>
      deliveryPerson
        ? deliveryService.getMyOrders(deliveryPerson.id, { page: 1, pageSize: 200 })
        : Promise.resolve({ success: true, orders: [], total: 0, page: 1, pageSize: 200, totalPages: 0 }),
    enabled: !!deliveryPerson,
  });

  const allOrders = ordersData?.orders ?? [];
  const orders = allOrders.filter((o: Order) =>
    ['picked_up', 'to_delivery', 'in_delivery'].includes(o.status ?? '')
  );

  const mutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: ActiveStatus }) =>
      deliveryService.updateOrderStatus(orderId, status, deliveryPerson!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('statusUpdated'));
    },
    onError: () => toastError(t('statusUpdateFailed')),
  });

  return (
    <AppLayout>
      <style>{`@keyframes dlv-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Slim sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        boxShadow: '0 2px 12px rgba(30,64,175,0.4)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0.625rem 1rem', gap: '0.625rem', minHeight: '56px',
        }}>
          <img src={orderiumLogo} alt="Orderium" style={{ height: '28px', width: 'auto', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.2))', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Livreur
            </div>
            <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {deliveryPerson?.name}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '999px', padding: '0.2rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Package size={13} color="#fff" />
              <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 800 }}>{orders.length}</span>
            </div>
            <NotificationBell />
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', flexShrink: 0,
              }}
            >
              <RefreshCw size={17} color="#fff" style={{ animation: isFetching ? 'dlv-spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0.875rem' }}>
        {isLoading ? (
          <SkeletonList />
        ) : error ? (
          <EmptyState icon="⚠️" title={t('error')} sub={t('tryAgain')} cta={{ label: t('retry'), onClick: () => refetch() }} />
        ) : orders.length === 0 ? (
          <EmptyState icon="🚚" title={t('noInProgressOrders')} sub="Vos livraisons actives apparaîtront ici" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.map((order: Order) => (
              <ActiveCard
                key={order.orderId}
                order={order}
                language={language}
                t={t}
                isPending={mutation.isPending}
                onAction={(next) => mutation.mutate({ orderId: order.orderId, status: next })}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ActiveCard({ order, language, t, isPending, onAction }: {
  order: Order; language: string; t: (k: any) => string;
  isPending: boolean; onAction: (next: ActiveStatus) => void;
}) {
  const navigate = useNavigate();
  const badge = getStatusBadge(order.status);
  const action = getAction(order.status, t);

  const openMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (order.googleMapsUrl) {
      window.open(order.googleMapsUrl, '_blank');
    } else if (order.latitude && order.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`, '_blank');
    } else if (order.customerAddress) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress)}`, '_blank');
    }
  };

  return (
    <div
      onClick={() => navigate(`/orders/${order.orderId}`, { state: { order } })}
      style={{
        background: '#fff', borderRadius: '18px', overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.07), 0 4px 14px rgba(0,0,0,0.05)',
        display: 'flex', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent', userSelect: 'none',
      }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.988)'; }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{ width: '5px', background: badge.stripe, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '0.9375rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>#{order.orderNumber}</span>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: badge.stripe }} />
        </div>

        {/* Customer */}
        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: '0 0 0.375rem', lineHeight: 1.25 }}>
          {order.customerName}
        </p>

        {/* Phone */}
        <a
          href={`tel:${order.customerPhone}`}
          onClick={e => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: PRI, textDecoration: 'none', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', WebkitTapHighlightColor: 'transparent' }}
        >
          <Phone size={15} strokeWidth={2.5} />
          {order.customerPhone}
        </a>

        {/* Address + navigate */}
        {order.customerAddress && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', flex: 1 }}>
              <MapPin size={14} color="#9ca3af" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.45 }}>{order.customerAddress}</span>
            </div>
            <button
              onClick={openMaps}
              style={{
                flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px',
                background: '#eff6ff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Navigation size={17} color="#2563eb" />
            </button>
          </div>
        )}

        {/* Total row */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>
            {order.items?.length ?? 0} {order.items?.length === 1 ? t('itemsCount') : t('articlesSuffix')}
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: PRI }}>
            {formatCurrency(order.totalAmount ?? 0, language as any)}
          </span>
        </div>

        {/* Action button */}
        {action && (
          <button
            onClick={e => { e.stopPropagation(); onAction(action.next); }}
            disabled={isPending}
            style={{
              width: '100%', height: '52px', marginTop: '0.75rem',
              background: isPending ? `${action.bg}80` : action.bg,
              color: '#fff', fontSize: '1rem', fontWeight: 700,
              border: 'none', borderRadius: '13px', cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isPending ? 'none' : `0 4px 14px ${action.shadow}`,
              letterSpacing: '0.02em', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isPending ? t('updating') : action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {[0, 1].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', display: 'flex', minHeight: '200px' }}>
          <div style={{ width: '5px', background: '#e5e7eb' }} />
          <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '25%', height: '13px', background: '#f3f4f6', borderRadius: '6px' }} />
              <div style={{ width: '20%', height: '13px', background: '#f3f4f6', borderRadius: '6px' }} />
            </div>
            <div style={{ width: '70%', height: '22px', background: '#f3f4f6', borderRadius: '8px' }} />
            <div style={{ width: '45%', height: '16px', background: '#f3f4f6', borderRadius: '6px' }} />
            <div style={{ width: '100%', height: '48px', background: '#f3f4f6', borderRadius: '12px', marginTop: 'auto' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, sub, cta }: {
  icon: string; title: string; sub: string; cta?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{ background: '#fff', borderRadius: '20px', padding: '3.5rem 1.5rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>{icon}</div>
      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>{title}</p>
      <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>{sub}</p>
      {cta && (
        <button onClick={cta.onClick} style={{ marginTop: '1.5rem', padding: '0.75rem 2rem', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '0.95rem', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
          {cta.label}
        </button>
      )}
    </div>
  );
}
