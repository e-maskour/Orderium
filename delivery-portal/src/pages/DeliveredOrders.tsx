import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { deliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/i18n';
import { AppLayout } from '../components/AppLayout';
import orderiumLogo from '../assets/logo-delivery.svg';
import { RefreshCw, ChevronRight, Package } from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';
import type { Order } from '../types';

export default function DeliveredOrders() {
  const { deliveryPerson } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const { data: ordersData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['orders', deliveryPerson?.id],
    queryFn: () =>
      deliveryPerson
        ? deliveryService.getMyOrders(deliveryPerson.id, { page: 1, pageSize: 200 })
        : Promise.resolve({ success: true, orders: [], total: 0, page: 1, pageSize: 200, totalPages: 0 }),
    enabled: !!deliveryPerson,
  });

  const allOrders = ordersData?.orders ?? [];
  const orders = allOrders
    .filter((o: Order) => o.status === 'delivered')
    .sort((a: Order, b: Order) => new Date(b.deliveredAt ?? b.createdAt).getTime() - new Date(a.deliveredAt ?? a.createdAt).getTime());

  // Group by date
  const grouped: Record<string, Order[]> = {};
  orders.forEach((order: Order) => {
    const date = new Date(order.deliveredAt ?? order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(order);
  });

  const totalAmount = orders.reduce((sum: number, o: Order) => sum + (o.totalAmount ?? 0), 0);

  return (
    <AppLayout>
      <style>{`@keyframes dlv-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Slim sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        boxShadow: '0 2px 12px rgba(21,128,61,0.4)',
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
        {/* Summary card */}
        {orders.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: '18px', padding: '1rem 1.125rem',
            marginBottom: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
                Total encaissé
              </p>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a' }}>
                {formatCurrency(totalAmount, language as any)}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
                Livrées
              </p>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a' }}>{orders.length}</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <SkeletonList />
        ) : error ? (
          <EmptyState icon="⚠️" title={t('error')} sub={t('tryAgain')} />
        ) : orders.length === 0 ? (
          <EmptyState icon="✅" title={t('noDeliveredOrders')} sub="Vos livraisons complétées apparaîtront ici" />
        ) : (
          <div>
            {Object.entries(grouped).map(([date, dayOrders]) => (
              <div key={date} style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.5rem 0.25rem' }}>
                  {date}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {dayOrders.map((order: Order) => (
                    <DeliveredRow
                      key={order.orderId}
                      order={order}
                      language={language}
                      onTap={() => navigate(`/orders/${order.orderId}`, { state: { order } })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DeliveredRow({ order, language, onTap }: {
  order: Order; language: string; onTap: () => void;
}) {
  return (
    <div
      onClick={onTap}
      style={{
        background: '#fff', borderRadius: '14px', padding: '0.875rem 1rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
      }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.99)'; }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {/* Green check */}
      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '1.3rem' }}>✅</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
          <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {order.customerName}
          </p>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a', flexShrink: 0, marginLeft: '0.5rem' }}>
            {formatCurrency(order.totalAmount ?? 0, language as any)}
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>
          #{order.orderNumber}
          {order.deliveredAt && ` · ${new Date(order.deliveredAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
        </p>
      </div>

      <ChevronRight size={16} color="#d1d5db" style={{ flexShrink: 0 }} />
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '0.875rem 1rem', display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f3f4f6', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ width: '60%', height: '14px', background: '#f3f4f6', borderRadius: '6px' }} />
            <div style={{ width: '35%', height: '11px', background: '#f3f4f6', borderRadius: '6px' }} />
          </div>
          <div style={{ width: '20%', height: '16px', background: '#f3f4f6', borderRadius: '6px' }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: '20px', padding: '3.5rem 1.5rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>{icon}</div>
      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>{title}</p>
      <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>{sub}</p>
    </div>
  );
}
