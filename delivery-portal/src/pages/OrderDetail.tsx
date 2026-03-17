import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/i18n';
import { toastSuccess, toastError } from '../services/toast.service';
import { ArrowLeft, Phone, MapPin, Navigation, Package } from 'lucide-react';
import type { Order } from '../types';

const PRI = '#df7817';

type WorkflowStatus = 'confirmed' | 'picked_up' | 'to_delivery' | 'in_delivery' | 'delivered';

interface StatusVisuals {
  stripe: string;
  bg: string;
  badgeBg: string;
  badgeText: string;
  label: string;
}

function getStatusVisuals(status: string | null | undefined): StatusVisuals {
  switch (status) {
    case 'assigned':   return { stripe: '#df7817', bg: '#fff7ed', badgeBg: '#fff3e0', badgeText: '#9a4300', label: 'assigned' };
    case 'confirmed':  return { stripe: '#6366f1', bg: '#eef2ff', badgeBg: '#e0e7ff', badgeText: '#3730a3', label: 'confirmed' };
    case 'picked_up':  return { stripe: '#2563eb', bg: '#eff6ff', badgeBg: '#dbeafe', badgeText: '#1d4ed8', label: 'pickedUp' };
    case 'to_delivery':return { stripe: '#f59e0b', bg: '#fffbeb', badgeBg: '#fef3c7', badgeText: '#b45309', label: 'toDelivery' };
    case 'in_delivery':return { stripe: '#df7817', bg: '#fff7ed', badgeBg: '#fff3e0', badgeText: '#9a4300', label: 'inDelivery' };
    case 'delivered':  return { stripe: '#16a34a', bg: '#f0fdf4', badgeBg: '#dcfce7', badgeText: '#15803d', label: 'delivered' };
    case 'canceled':   return { stripe: '#dc2626', bg: '#fef2f2', badgeBg: '#fee2e2', badgeText: '#dc2626', label: 'canceled' };
    default:           return { stripe: '#94a3b8', bg: '#f9fafb', badgeBg: '#f1f5f9', badgeText: '#475569', label: 'pending' };
  }
}

function getWorkflowAction(status: string | null | undefined, t: (k: any) => string): {
  label: string; next: WorkflowStatus; bg: string; shadow: string;
} | null {
  switch (status) {
    case 'assigned':   return { label: t('confirmOrder'),    next: 'confirmed',   bg: '#df7817', shadow: 'rgba(223,120,23,0.4)' };
    case 'confirmed':  return { label: t('pickUpOrder'),     next: 'picked_up',   bg: '#6366f1', shadow: 'rgba(99,102,241,0.4)' };
    case 'picked_up':  return { label: t('startToDelivery'), next: 'to_delivery', bg: '#2563eb', shadow: 'rgba(37,99,235,0.4)' };
    case 'to_delivery':return { label: t('startDelivery'),   next: 'in_delivery', bg: '#f59e0b', shadow: 'rgba(245,158,11,0.4)' };
    case 'in_delivery':return { label: '✓ ' + t('markAsDelivered'), next: 'delivered', bg: '#16a34a', shadow: 'rgba(22,163,74,0.4)' };
    default: return null;
  }
}

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { deliveryPerson } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  // Try to get order from router state first, fall back to query cache
  const stateOrder = (location.state as { order?: Order })?.order;
  const cachedData = queryClient.getQueryData<{ orders: Order[] }>(['orders', deliveryPerson?.id]);
  const cachedOrder = cachedData?.orders.find(o => o.orderId === Number(orderId));
  const order: Order | undefined = stateOrder ?? cachedOrder;

  // Sync query only if order isn't in cache at all
  const { data: freshData } = useQuery({
    queryKey: ['orders', deliveryPerson?.id],
    queryFn: () =>
      deliveryPerson
        ? deliveryService.getMyOrders(deliveryPerson.id, { page: 1, pageSize: 200 })
        : Promise.resolve({ success: true, orders: [], total: 0, page: 1, pageSize: 200, totalPages: 0 }),
    enabled: !!deliveryPerson && !order,
  });

  const resolvedOrder: Order | undefined = order ?? freshData?.orders.find((o: Order) => o.orderId === Number(orderId));

  const mutation = useMutation({
    mutationFn: (status: WorkflowStatus) =>
      deliveryService.updateOrderStatus(Number(orderId), status, deliveryPerson!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toastSuccess(t('statusUpdated'));
      navigate(-1);
    },
    onError: () => toastError(t('statusUpdateFailed')),
  });

  if (!resolvedOrder) {
    return (
      <div style={{ minHeight: '100dvh', background: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem', textAlign: 'center' }}>Commande introuvable</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: PRI, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
          {t('backToOrders')}
        </button>
      </div>
    );
  }

  const visuals = getStatusVisuals(resolvedOrder.status);
  const action = getWorkflowAction(resolvedOrder.status, t);
  const isTerminal = resolvedOrder.status === 'delivered' || resolvedOrder.status === 'canceled';

  const openGoogleMaps = () => {
    if (resolvedOrder.latitude && resolvedOrder.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${resolvedOrder.latitude},${resolvedOrder.longitude}`, '_blank');
    } else if (resolvedOrder.customerAddress) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resolvedOrder.customerAddress)}`, '_blank');
    }
  };

  const openWaze = () => {
    if (resolvedOrder.latitude && resolvedOrder.longitude) {
      window.open(`https://waze.com/ul?ll=${resolvedOrder.latitude},${resolvedOrder.longitude}&navigate=yes`, '_blank');
    } else if (resolvedOrder.customerAddress) {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(resolvedOrder.customerAddress)}&navigate=yes`, '_blank');
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: visuals.bg,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column',
      paddingBottom: action ? '92px' : '1.5rem',
    }}>
      {/* Top bar */}
      <div style={{
        background: visuals.stripe,
        padding: '0 1.25rem 1rem',
        paddingTop: 'calc(0.875rem + env(safe-area-inset-top, 0px))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent', flexShrink: 0,
            }}
          >
            <ArrowLeft size={20} color="#fff" />
          </button>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: 600 }}>
            {t('backToOrders')}
          </span>
        </div>

        {/* Order number + status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
          <span style={{
            background: visuals.badgeBg, color: visuals.badgeText,
            fontWeight: 800, fontSize: '0.8rem', borderRadius: '8px',
            padding: '0.2rem 0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {t(visuals.label as any)}
          </span>
        </div>
        <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>
          #{resolvedOrder.orderNumber}
        </h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1rem 1rem 0' }}>

        {/* Customer card */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '1.125rem', marginBottom: '0.75rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: visuals.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Package size={22} color={visuals.stripe} />
            </div>
            <div>
              <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                {resolvedOrder.customerName}
              </p>
            </div>
          </div>

          {/* Phone — big call button */}
          <a
            href={`tel:${resolvedOrder.customerPhone}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fff7ed', border: '2px solid #fed7aa',
              borderRadius: '14px', padding: '0.875rem 1rem',
              textDecoration: 'none', marginBottom: '0.625rem',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Phone size={20} color={PRI} strokeWidth={2.5} />
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', letterSpacing: '0.02em' }}>
                {resolvedOrder.customerPhone}
              </span>
            </div>
            <span style={{
              background: PRI, color: '#fff', fontSize: '0.8rem', fontWeight: 700,
              borderRadius: '8px', padding: '0.35rem 0.75rem', letterSpacing: '0.03em',
            }}>
              {t('callCustomer')}
            </span>
          </a>

          {/* Address + navigation */}
          {resolvedOrder.customerAddress && (
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '0.875rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <MapPin size={18} color="#6b7280" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.5, fontWeight: 500 }}>
                  {resolvedOrder.customerAddress}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button
                  onClick={openGoogleMaps}
                  style={{
                    flex: 1, height: '44px', background: '#4285f4', color: '#fff',
                    border: 'none', borderRadius: '11px', fontWeight: 700, fontSize: '0.875rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <Navigation size={16} /> Google Maps
                </button>
                <button
                  onClick={openWaze}
                  style={{
                    flex: 1, height: '44px', background: '#00aef0', color: '#fff',
                    border: 'none', borderRadius: '11px', fontWeight: 700, fontSize: '0.875rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <Navigation size={16} /> Waze
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Items card */}
        {resolvedOrder.items && resolvedOrder.items.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '18px', padding: '1.125rem', marginBottom: '0.75rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.875rem' }}>
              {t('orderItems')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {resolvedOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 0',
                    borderBottom: idx < resolvedOrder.items!.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                      background: '#f8fafc', border: '1px solid #e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 800, color: '#9ca3af',
                    }}>
                      {item.quantity}×
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', lineHeight: 1.35, flexGrow: 1 }}>
                      {item.productName}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {formatCurrency(item.price * item.quantity, language as any)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total card */}
        <div style={{
          background: '#fff', borderRadius: '18px', padding: '1rem 1.125rem',
          marginBottom: '0.75rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#374151' }}>
            {t('totalAmount')}
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 900, color: PRI }}>
            {formatCurrency(resolvedOrder.totalAmount ?? 0, language as any)}
          </span>
        </div>

        {/* Terminal status messages */}
        {resolvedOrder.status === 'delivered' && (
          <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '16px', padding: '1.125rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
            <p style={{ fontWeight: 800, color: '#15803d', fontSize: '1.1rem', margin: 0 }}>{t('orderDelivered')}</p>
          </div>
        )}
        {resolvedOrder.status === 'canceled' && (
          <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '16px', padding: '1.125rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>❌</div>
            <p style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.1rem', margin: 0 }}>{t('orderCanceled')}</p>
          </div>
        )}
      </div>

      {/* Sticky action button */}
      {action && !isTerminal && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff',
          boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -4px 16px rgba(0,0,0,0.08)',
          padding: '0.875rem 1rem',
          paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))',
          zIndex: 500,
        }}>
          <button
            onClick={() => mutation.mutate(action.next)}
            disabled={mutation.isPending}
            style={{
              width: '100%', height: '58px',
              background: mutation.isPending ? `${action.bg}80` : action.bg,
              color: '#fff', fontSize: '1.1rem', fontWeight: 800,
              border: 'none', borderRadius: '16px',
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
              boxShadow: mutation.isPending ? 'none' : `0 5px 18px ${action.shadow}`,
              letterSpacing: '0.02em', WebkitTapHighlightColor: 'transparent',
              transition: 'opacity 0.15s',
            }}
          >
            {mutation.isPending ? (
              <>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'dlv-spin 0.75s linear infinite', display: 'inline-block' }} />
                {t('updating')}
              </>
            ) : action.label}
          </button>
          <style>{`@keyframes dlv-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
