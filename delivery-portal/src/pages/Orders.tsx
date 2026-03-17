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
import { RefreshCw, Phone } from 'lucide-react';
import type { Order } from '../types';

const PRI = '#df7817';
const PRI_DARK = '#b86314';

function getStripeColor(status: string | null) {
  if (status === 'confirmed') return '#4f46e5';
  return PRI;
}

function getActionConfig(status: string | null) {
  if (status === 'assigned')  return { label: 'Confirmer',  nextStatus: 'confirmed'  as const, bg: PRI,      color: '#fff' };
  if (status === 'confirmed') return { label: 'Récupérer',  nextStatus: 'picked_up'  as const, bg: '#4f46e5', color: '#fff' };
  return null;
}

function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex' }}>
      <div style={{ width: '5px', background: '#e5e7eb', flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '1rem' }}>
        {[60, 40, 80, 50].map((w, i) => (
          <div key={i} style={{ height: '14px', borderRadius: '7px', background: '#f3f4f6',
            width: `${w}%`, marginBottom: i < 3 ? '0.625rem' : 0 }} />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem', lineHeight: 1 }}>📭</div>
      <p style={{ color: '#6b7280', fontSize: '1rem', fontWeight: 600, margin: 0 }}>{message}</p>
    </div>
  );
}

function OrderCard({ order, onAction, actionLoading }: {
  order: Order;
  onAction: (orderId: number, status: 'confirmed' | 'picked_up') => void;
  actionLoading: boolean;
}) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const action = getActionConfig(order.status ?? null);
  const stripe = getStripeColor(order.status ?? null);

  return (
    <div
      onClick={() => navigate(`/orders/${order.orderId}`, { state: { order } })}
      style={{
        background: '#fff', borderRadius: '18px', overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
        display: 'flex', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent', userSelect: 'none',
      }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.985)'; }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{ width: '5px', background: stripe, flexShrink: 0 }} />

      <div style={{ flex: 1, padding: '0.875rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: stripe,
            background: stripe + '18', borderRadius: '999px', padding: '0.15rem 0.6rem' }}>
            #{order.orderNumber ?? order.orderId}
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: PRI }}>
            {formatCurrency(order.totalAmount ?? 0, language as any)}
          </span>
        </div>

        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: '0 0 0.25rem',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {order.customerName}
        </p>

        <a
          href={`tel:${order.customerPhone}`}
          onClick={e => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            color: '#2563eb', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none',
            marginBottom: '0.375rem' }}
        >
          <Phone size={14} />
          {order.customerPhone}
        </a>

        {order.customerAddress && (
          <p style={{ fontSize: '0.83rem', color: '#6b7280', margin: '0 0 0.75rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📍 {order.customerAddress}
          </p>
        )}

        {action && (
          <button
            onClick={e => { e.stopPropagation(); onAction(order.orderId, action.nextStatus); }}
            disabled={actionLoading}
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '12px',
              background: actionLoading ? '#9ca3af' : action.bg,
              color: action.color, border: 'none', cursor: actionLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.01em',
              WebkitTapHighlightColor: 'transparent',
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
      <div style={{
        background: `linear-gradient(135deg, ${PRI_DARK} 0%, ${PRI} 60%, #e8891f 100%)`,
        padding: '1rem 1.25rem 3rem',
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
          <img src={orderiumLogo} alt="Orderium" style={{ height: '32px', width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }} />
          <span style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.3px', opacity: 0.95 }}>Orderium</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.25rem' }}>
              {t('myDeliveries')}
            </p>
            <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
              {deliveryPerson?.name}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <NotificationBell />
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px',
                width: '38px', height: '38px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >
              <RefreshCw size={18} color="#fff" style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
          <Chip label={`📦 ${toPickUp.length} ${language === 'ar' ? 'للاستلام' : 'à récupérer'}`} />
          {activeCount > 0 && (
            <Chip label={`🚚 ${activeCount} ${language === 'ar' ? 'جارية' : 'en cours'}`} color="rgba(255,255,255,0.15)" />
          )}
        </div>
      </div>

      <div style={{ padding: '0 1rem', marginTop: '-1.75rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div style={{ background: '#fef2f2', borderRadius: '16px', padding: '1.25rem',
            textAlign: 'center', border: '1px solid #fecaca' }}>
            <p style={{ color: '#dc2626', fontWeight: 700, margin: '0 0 0.5rem' }}>Erreur de chargement</p>
            <button
              onClick={() => refetch()}
              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px',
                padding: '0.5rem 1.25rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Réessayer
            </button>
          </div>
        ) : toPickUp.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <EmptyState message={t('noOrdersAssigned')} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {toPickUp.map((order: Order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                onAction={(id, status) => mutation.mutate({ orderId: id, status })}
                actionLoading={mutation.isPending}
              />
            ))}
          </div>
        )}
        <div style={{ height: '0.5rem' }} />
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span style={{
      background: color ?? 'rgba(255,255,255,0.25)',
      color: '#fff', fontSize: '0.8rem', fontWeight: 700,
      borderRadius: '999px', padding: '0.3rem 0.75rem',
      backdropFilter: 'blur(4px)',
    }}>
      {label}
    </span>
  );
}
