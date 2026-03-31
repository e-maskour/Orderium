import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../lib/i18n';
import { AppLayout } from '../components/AppLayout';
import orderiumLogo from '../assets/logo-delivery.svg';
import { LanguageToggle } from '../components/LanguageToggle';
import { LogOut, Phone, User } from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';
import { deliveryService } from '../services/api';
import type { Order } from '../types';

const PRI = '#df7817';

export default function Profile() {
  const { deliveryPerson, logout } = useAuth();
  const { t, language } = useLanguage();

  const { data: ordersData } = useQuery({
    queryKey: ['orders', deliveryPerson?.id],
    queryFn: () =>
      deliveryPerson
        ? deliveryService.getMyOrders(deliveryPerson.id, { page: 1, pageSize: 200 })
        : Promise.resolve({ success: true, orders: [], total: 0, page: 1, pageSize: 200, totalPages: 0 }),
    enabled: !!deliveryPerson,
  });

  const allOrders = ordersData?.orders ?? [];
  const deliveredOrders = allOrders.filter((o: Order) => o.status === 'delivered');
  const todayDelivered = deliveredOrders.filter((o: Order) => {
    const today = new Date().toDateString();
    return new Date(o.deliveredAt ?? o.createdAt).toDateString() === today;
  });

  const initial = deliveryPerson?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <AppLayout>
      {/* Slim sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: `linear-gradient(135deg, #7c420d 0%, ${PRI} 100%)`,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        boxShadow: '0 2px 12px rgba(124,66,13,0.4)',
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
            <NotificationBell />
            <button
              onClick={logout}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', flexShrink: 0,
              }}
              title="Déconnexion"
            >
              <LogOut size={17} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      {/* Avatar card */}
      <div style={{ padding: '0 1rem', marginTop: '1rem' }}>
        <div style={{
          background: '#fff', borderRadius: '22px',
          padding: '1.5rem 1.25rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '1.125rem',
        }}>
          {/* Avatar */}
          <div style={{
            width: '68px', height: '68px', borderRadius: '20px',
            background: `linear-gradient(135deg, ${PRI}, #b86314)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(223,120,23,0.35)',
          }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{initial}</span>
          </div>
          <div>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '0 0 0.25rem' }}>
              {deliveryPerson?.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280' }}>
              <Phone size={14} />
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{deliveryPerson?.phoneNumber}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0.875rem 1rem 0' }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: '0.875rem' }}>
          <StatCard emoji="📦" value={String(allOrders.filter((o: Order) => ['assigned', 'confirmed'].includes(o.status ?? '')).length)} label="À récup." />
          <StatCard emoji="🚚" value={String(allOrders.filter((o: Order) => ['picked_up', 'to_delivery', 'in_delivery'].includes(o.status ?? '')).length)} label="En cours" />
          <StatCard emoji="✅" value={String(deliveredOrders.length)} label="Livrées" />
        </div>

        {/* Today's summary */}
        {todayDelivered.length > 0 && (
          <div style={{
            background: '#f0fdf4', border: '1.5px solid #bbf7d0',
            borderRadius: '16px', padding: '1rem 1.125rem',
            marginBottom: '0.875rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
                Aujourd'hui 🎯
              </p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d', margin: 0 }}>
                {todayDelivered.length} livraison{todayDelivered.length !== 1 ? 's' : ''}
              </p>
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a' }}>
              {formatCurrency(todayDelivered.reduce((s: number, o: Order) => s + (o.totalAmount ?? 0), 0), language as any)}
            </span>
          </div>
        )}

        {/* Info section */}
        <div style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '0.875rem' }}>
          <InfoRow icon={<User size={18} color="#6b7280" />} label={t('name')} value={deliveryPerson?.name ?? '—'} />
          <InfoRow icon={<Phone size={18} color="#6b7280" />} label={t('phoneNumber')} value={deliveryPerson?.phoneNumber ?? '—'} last />
        </div>

        {/* Actions */}
        <div style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '0.875rem' }}>
          {/* Language toggle row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.125rem',
            borderBottom: '1px solid #f3f4f6',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.1rem' }}>🌐</span>
              </div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>Langue</span>
            </div>
            <LanguageToggle />
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '1rem 1.125rem',
              background: 'none', border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent', textAlign: 'left',
            }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LogOut size={18} color="#dc2626" />
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626' }}>
              {t('signOut')}
            </span>
          </button>
        </div>

        {/* Version */}
        <p style={{ textAlign: 'center', color: '#d1d5db', fontSize: '0.8rem', fontWeight: 500 }}>
          Morocom Delivery · v1.0
        </p>
      </div>
    </AppLayout>
  );
}

function StatCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '14px', padding: '0.875rem 0.75rem',
      textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: '1.4rem', marginBottom: '0.25rem', lineHeight: 1 }}>{emoji}</div>
      <p style={{ fontSize: '1.35rem', fontWeight: 900, color: '#111827', margin: '0 0 0.2rem', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</p>
    </div>
  );
}

function InfoRow({ icon, label, value, last }: {
  icon: React.ReactNode; label: string; value: string; last?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      padding: '0.9375rem 1.125rem',
      borderBottom: last ? 'none' : '1px solid #f3f4f6',
    }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.15rem' }}>{label}</p>
        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', margin: 0 }}>{value}</p>
      </div>
    </div>
  );
}
