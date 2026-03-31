import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toastSuccess, toastError } from '../services/toast.service';
import { deliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/i18n';
import { AppLayout } from '../components/AppLayout';
import { NotificationBell } from '../components/NotificationBell';
import orderiumLogo from '../assets/logo-delivery.svg';
import { RefreshCw, Phone, MapPin, Navigation, Package } from 'lucide-react';
import type { Order } from '../types';

const PRI = '#df7817';
const PRI_DARK = '#b86314';

function getStripeColor(status: string | null) {
  if (status === 'confirmed') return '#2563eb';
  return PRI;
}

function getActionConfig(status: string | null) {
  if (status === 'assigned') return { label: 'Confirmer', nextStatus: 'confirmed' as const, bg: PRI, shadow: 'rgba(223,120,23,0.35)' };
  if (status === 'confirmed') return { label: 'Récupérer', nextStatus: 'picked_up' as const, bg: '#2563eb', shadow: 'rgba(37,99,235,0.35)' };
  return null;
}

function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', display: 'flex', minHeight: '200px' }}>
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
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: '20px', padding: '3.5rem 1.5rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>📭</div>
      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>{message}</p>
    </div>
  );
}

function OrderCard({ order, onAction, actionLoading, language }: {
  order: Order;
  onAction: (orderId: number, status: 'confirmed' | 'picked_up') => void;
  actionLoading: boolean;
  language: string;
}) {
  const navigate = useNavigate();
  const action = getActionConfig(order.status ?? null);
  const stripe = getStripeColor(order.status ?? null);

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
      <div style={{ width: '5px', background: stripe, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '0.9375rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>#{order.orderNumber ?? order.orderId}</span>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: stripe }} />
        </div>

        {/* Customer name */}
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
            {order.items?.length ?? 0} article{(order.items?.length ?? 0) !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: PRI }}>
            {formatCurrency(order.totalAmount ?? 0, language as any)}
          </span>
        </div>

        {/* Action button */}
        {action && (
          <button
            onClick={e => { e.stopPropagation(); onAction(order.orderId, action.nextStatus); }}
            disabled={actionLoading}
            style={{
              width: '100%', height: '52px', marginTop: '0.75rem',
              background: actionLoading ? `${action.bg}80` : action.bg,
              color: '#fff', fontSize: '1rem', fontWeight: 700,
              border: 'none', borderRadius: '13px', cursor: actionLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: actionLoading ? 'none' : `0 4px 14px ${action.shadow}`,
              letterSpacing: '0.02em', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {actionLoading ? '...' : action.label}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Orders() {
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

  const mutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: 'confirmed' | 'picked_up' }) =>
      deliveryService.updateOrderStatus(orderId, status, deliveryPerson!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', deliveryPerson?.id] });
      toastSuccess(t('statusUpdated'));
    },
    onError: () => toastError(t('statusUpdateFailed')),
  });

  const allOrders = ordersData?.orders ?? [];
  const toPickUp = allOrders.filter((o: Order) => ['assigned', 'confirmed'].includes(o.status ?? ''));
  const activeCount = allOrders.filter((o: Order) => ['picked_up', 'to_delivery', 'in_delivery'].includes(o.status ?? '')).length;

  return (
    <AppLayout>
      {/* Slim sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: `linear-gradient(135deg, ${PRI_DARK} 0%, ${PRI} 100%)`,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        boxShadow: '0 2px 12px rgba(190,102,20,0.4)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0.625rem 1rem', gap: '0.625rem', minHeight: '56px',
        }}>
          <img src={orderiumLogo} alt="Morocom" style={{ height: '28px', width: 'auto', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.2))', flexShrink: 0 }} />
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
              <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 800 }}>{toPickUp.length}</span>
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
              <RefreshCw size={17} color="#fff" style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
        {activeCount > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.18)', padding: '0.3rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
            🚚 {activeCount} commande{activeCount > 1 ? 's' : ''} en cours de livraison
          </div>
        )}
      </div>

      {/* Card list */}
      <div style={{ padding: '1rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {isLoading ? (
          [0, 1, 2].map(i => <SkeletonCard key={i} />)
        ) : error ? (
          <div style={{ background: '#fef2f2', borderRadius: '16px', padding: '1.25rem', textAlign: 'center', border: '1px solid #fecaca' }}>
            <p style={{ color: '#dc2626', fontWeight: 700, margin: '0 0 0.5rem' }}>Erreur de chargement</p>
            <button onClick={() => refetch()} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.6rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}>
              Réessayer
            </button>
          </div>
        ) : toPickUp.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <EmptyState message={t('noOrdersAssigned')} />
          </div>
        ) : (
          toPickUp.map((order: Order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              language={language}
              onAction={(id, status) => mutation.mutate({ orderId: id, status })}
              actionLoading={mutation.isPending}
            />
          ))
        )}
        <div style={{ height: '0.5rem' }} />
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}


