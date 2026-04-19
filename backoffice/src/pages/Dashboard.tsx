import React, { useMemo, useState, useEffect } from 'react';

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AdminLayout } from '../components/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { statisticsService } from '../modules/statistics';
import { ordersService } from '../modules/orders';
import { formatCurrency } from '../lib/formatters';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Package,
  RefreshCw,
  Star,
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────
const L = {
  fr: {
    greeting: (h: number, name: string) =>
      `${h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'}, ${name} 👋`,
    today: "Aujourd'hui",
    moneyEarned: "Argent gagné aujourd'hui",
    ordersToday: "Commandes aujourd'hui",
    waiting: 'En attente',
    weekRevenue: 'Recettes cette semaine',
    topItems: 'Les 5 articles les plus commandés',
    ordersStatus: 'État des commandes',
    recentOrders: 'Dernières commandes',
    new: 'Nouvelles',
    inPrep: 'En préparation',
    delivered: 'Livrées',
    cancelled: 'Annulées',
    orderNum: 'N°',
    client: 'Client',
    amount: 'Montant',
    status: 'Statut',
    viewAll: 'Voir tout',
    qty: 'qté',
    days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    statusLabels: {
      draft: 'Brouillon',
      validated: 'Validée',
      in_progress: 'En cours',
      confirmed: 'Confirmée',
      picked_up: 'Récupérée',
      delivered: 'Livrée',
      cancelled: 'Annulée',
    } as Record<string, string>,
  },
  ar: {
    greeting: (h: number, name: string) =>
      `${h < 12 ? 'صباح الخير' : h < 18 ? 'مساء الخير' : 'مساء النور'}، ${name} 👋`,
    today: 'اليوم',
    moneyEarned: 'المال المكسوب اليوم',
    ordersToday: 'الطلبات اليوم',
    waiting: 'في الانتظار',
    weekRevenue: 'إيرادات هذا الأسبوع',
    topItems: 'أكثر 5 مواد طلباً',
    ordersStatus: 'حالة الطلبات',
    recentOrders: 'آخر الطلبات',
    new: 'جديد',
    inPrep: 'قيد التحضير',
    delivered: 'تم التسليم',
    cancelled: 'ملغاة',
    orderNum: 'رقم',
    client: 'العميل',
    amount: 'المبلغ',
    status: 'الحالة',
    viewAll: 'عرض الكل',
    qty: 'كمية',
    days: ['الإث', 'الثل', 'الأر', 'الخم', 'الجم', 'السب', 'الأح'],
    statusLabels: {
      draft: 'مسودة',
      validated: 'معتمدة',
      in_progress: 'جارٍ',
      confirmed: 'مؤكدة',
      picked_up: 'تم الأخذ',
      delivered: 'تم التسليم',
      cancelled: 'ملغاة',
    } as Record<string, string>,
  },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: '#f1f5f9', color: '#64748b' },
  validated: { bg: '#eff6ff', color: '#2563eb' },
  in_progress: { bg: '#fff7ed', color: '#c2410c' },
  confirmed: { bg: '#fef3c7', color: '#b45309' },
  picked_up: { bg: '#f0fdf4', color: '#15803d' },
  delivered: { bg: '#dcfce7', color: '#16a34a' },
  cancelled: { bg: '#fef2f2', color: '#dc2626' },
};

// ─── Big KPI Card ──────────────────────────────────────────────────────────
function BigCard({
  icon: Icon,
  label,
  value,
  bg,
  iconBg,
  iconColor,
  onClick,
  compact,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  bg: string;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: bg,
        borderRadius: compact ? '0.75rem' : '1rem',
        padding: compact ? '0.625rem 0.75rem' : '0.875rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '0.3rem' : '0.5rem',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          width: compact ? '1.75rem' : '2.25rem',
          height: compact ? '1.75rem' : '2.25rem',
          borderRadius: compact ? '0.4rem' : '0.625rem',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={compact ? 14 : 18} color={iconColor} strokeWidth={2.5} />
      </div>
      <div
        style={{
          fontSize: compact ? '0.65rem' : '0.75rem',
          fontWeight: 600,
          color: '#64748b',
          lineHeight: 1.2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: compact ? '1rem' : '1.375rem',
          fontWeight: 800,
          color: '#0f172a',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Status Pill ───────────────────────────────────────────────────────────
function StatusPill({
  icon: Icon,
  label,
  count,
  bg,
  color,
  iconBg,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  bg: string;
  color: string;
  iconBg: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: bg,
        borderRadius: '1rem',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: onClick ? 'pointer' : 'default',
        border: `2px solid ${color}22`,
        transition: 'transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      <div
        style={{
          width: '2.75rem',
          height: '2.75rem',
          borderRadius: '50%',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color={color} strokeWidth={2.5} />
      </div>
      <span style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1 }}>{count}</span>
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color,
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { admin } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const tx = L[language as 'fr' | 'ar'] ?? L.fr;
  const isRtl = language === 'ar';

  const {
    data: comprehensiveStats,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['statistics', 'comprehensive'],
    queryFn: () => statisticsService.getComprehensiveStats(7),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { data: recentOrdersData } = useQuery({
    queryKey: ['orders', 'recent-dashboard'],
    queryFn: () =>
      ordersService.getAll(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        8,
        'VENTE',
      ),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const statistics = comprehensiveStats?.overview;
  const dailyStats = useMemo(() => comprehensiveStats?.dailyStats ?? [], [comprehensiveStats]);
  const topProducts = comprehensiveStats?.topProducts ?? [];
  const recentOrders = recentOrdersData?.orders ?? [];

  // Today = last entry in dailyStats
  const today = dailyStats[dailyStats.length - 1];
  const todayRevenue = today?.revenue ?? 0;
  const todayOrders = today?.orders ?? 0;

  const pendingOrders = statistics?.PendingOrders ?? 0;
  const inDeliveryOrders = statistics?.InDeliveryOrders ?? 0;
  const deliveredOrders = statistics?.DeliveredOrders ?? 0;
  const cancelledOrders = statistics?.CancelledOrders ?? 0;

  const isMobile = useIsMobile(640);

  // Week bar chart options
  const barOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'bar',
        toolbar: { show: false },
        animations: { enabled: true, speed: 600 },
        fontFamily: 'inherit',
        width: '100%',
      },
      plotOptions: {
        bar: { borderRadius: 6, columnWidth: '60%', distributed: true },
      },
      colors: dailyStats.map((_, i) => (i === dailyStats.length - 1 ? '#16a34a' : '#86efac')),
      dataLabels: { enabled: false },
      xaxis: {
        categories: dailyStats.map((s) =>
          new Date(s.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', {
            weekday: 'short',
          }),
        ),
        tickAmount: dailyStats.length,
        labels: {
          style: { fontSize: '12px', fontWeight: 600 },
          rotate: 0,
          hideOverlappingLabels: false,
          trim: false,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (v: number) => formatCurrency(v, language),
          style: { fontSize: '11px' },
          maxWidth: 70,
        },
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
      },
      tooltip: {
        y: { formatter: (v: number) => formatCurrency(v, language) },
        theme: 'light',
        style: { fontSize: '12px' },
        fixed: isMobile
          ? { enabled: true, position: 'topLeft', offsetX: 0, offsetY: -10 }
          : { enabled: false },
      },
      legend: { show: false },
      responsive: [
        {
          breakpoint: 480,
          options: {
            plotOptions: { bar: { columnWidth: '75%' } },
            xaxis: { labels: { style: { fontSize: '10px' } } },
            yaxis: { labels: { show: false } },
            chart: { height: 180 },
          },
        },
      ],
    }),
    [dailyStats, language, isMobile],
  );

  const barSeries = useMemo(
    () => [
      {
        name: tx.moneyEarned,
        data: dailyStats.map((s) => s.revenue),
      },
    ],
    [dailyStats, tx],
  );

  const now = new Date();
  const greet = tx.greeting(
    now.getHours(),
    (admin?.fullName ?? admin?.name ?? '').split(' ')[0] || 'Admin',
  );

  // Skeleton card
  const SkCard = () => (
    <div
      style={{
        borderRadius: '1rem',
        background: '#f1f5f9',
        height: '6rem',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );

  // ── Layout constants
  const cardGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
  };
  const pillGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))',
    gap: '0.875rem',
  };
  const sectionCard: React.CSSProperties = {
    background: '#fff',
    borderRadius: '1.25rem',
    padding: '1.25rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #f1f5f9',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '0 0 2rem', direction: isRtl ? 'rtl' : 'ltr' }}>
        {/* ── Header ──────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{greet}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              {now.toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.875rem',
              borderRadius: '0.625rem',
              border: '1px solid #e2e8f0',
              background: '#fff',
              cursor: isFetching ? 'not-allowed' : 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#64748b',
              opacity: isFetching ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={14}
              style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }}
            />
            {!isLoading && !isFetching && (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#16a34a',
                  display: 'inline-block',
                }}
              />
            )}
          </button>
        </div>

        {/* ── 1 · Today's Snapshot ────────────────── */}
        {isLoading ? (
          <div style={{ ...cardGrid, marginBottom: '1.25rem' }}>
            {[0, 1, 2].map((i) => (
              <SkCard key={i} />
            ))}
          </div>
        ) : (
          <div style={{ ...cardGrid, marginBottom: '1.25rem' }}>
            <BigCard
              icon={DollarSign}
              label={tx.moneyEarned}
              value={formatCurrency(todayRevenue, language)}
              bg="linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
              iconBg="#bbf7d0"
              iconColor="#16a34a"
              onClick={() => navigate('/orders')}
              compact={isMobile}
            />
            <BigCard
              icon={ShoppingCart}
              label={tx.ordersToday}
              value={todayOrders}
              bg="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
              iconBg="#bfdbfe"
              iconColor="#2563eb"
              onClick={() => navigate('/orders')}
              compact={isMobile}
            />
            <BigCard
              icon={Clock}
              label={tx.waiting}
              value={pendingOrders}
              bg={
                pendingOrders > 0
                  ? 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)'
                  : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
              }
              iconBg={pendingOrders > 0 ? '#fdba74' : '#e2e8f0'}
              iconColor={pendingOrders > 0 ? '#c2410c' : '#94a3b8'}
              onClick={() => navigate('/orders')}
              compact={isMobile}
            />
          </div>
        )}

        {/* ── 2 · Week Revenue Bar Chart ───────────── */}
        <div style={{ ...sectionCard, marginBottom: '1.25rem', overflow: 'hidden' }}>
          <div style={sectionTitle}>
            <span style={{ fontSize: '1.25rem' }}>📊</span>
            {tx.weekRevenue}
          </div>
          {isLoading ? (
            <div
              style={{
                height: '12rem',
                background: '#f1f5f9',
                borderRadius: '0.75rem',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ) : (
            <div style={{ width: '100%', minWidth: 0 }}>
              <ReactApexChart
                key={language}
                type="bar"
                height={isMobile ? 180 : 220}
                width="100%"
                options={barOptions}
                series={barSeries}
              />
            </div>
          )}
        </div>

        {/* ── 3+4 · Two-column: Top Items + Order Status ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          {/* Top 5 Items */}
          <div style={sectionCard}>
            <div style={sectionTitle}>
              <span style={{ fontSize: '1.25rem' }}>🏆</span>
              {tx.topItems}
            </div>
            {isLoading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: '2.5rem',
                    background: '#f1f5f9',
                    borderRadius: '0.5rem',
                    marginBottom: '0.5rem',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              ))
            ) : topProducts.slice(0, 5).length === 0 ? (
              <div
                style={{
                  color: '#94a3b8',
                  textAlign: 'center',
                  padding: '2rem 0',
                  fontSize: '0.875rem',
                }}
              >
                —
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {topProducts.slice(0, 5).map((p, idx) => (
                  <div
                    key={p.productId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.625rem 0.75rem',
                      borderRadius: '0.75rem',
                      background: idx === 0 ? '#fefce8' : '#f8fafc',
                      border: idx === 0 ? '1.5px solid #fde68a' : '1px solid #f1f5f9',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: idx === 0 ? '#b45309' : '#94a3b8',
                        minWidth: '1.5rem',
                        textAlign: 'center',
                      }}
                    >
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.productName}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        flexShrink: 0,
                      }}
                    >
                      <Package size={12} color="#16a34a" />
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#16a34a' }}>
                        {p.sales} {tx.qty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Status Summary */}
          <div style={sectionCard}>
            <div style={sectionTitle}>
              <span style={{ fontSize: '1.25rem' }}>📋</span>
              {tx.ordersStatus}
            </div>
            <div style={pillGrid}>
              <StatusPill
                icon={Star}
                label={tx.new}
                count={pendingOrders}
                bg="#fff7ed"
                color="#c2410c"
                iconBg="#fed7aa"
                onClick={() => navigate('/orders')}
              />
              <StatusPill
                icon={Truck}
                label={tx.inPrep}
                count={inDeliveryOrders}
                bg="#eff6ff"
                color="#2563eb"
                iconBg="#bfdbfe"
                onClick={() => navigate('/orders')}
              />
              <StatusPill
                icon={CheckCircle}
                label={tx.delivered}
                count={deliveredOrders}
                bg="#f0fdf4"
                color="#16a34a"
                iconBg="#bbf7d0"
                onClick={() => navigate('/orders')}
              />
              <StatusPill
                icon={XCircle}
                label={tx.cancelled}
                count={cancelledOrders}
                bg="#fef2f2"
                color="#dc2626"
                iconBg="#fecaca"
                onClick={() => navigate('/orders')}
              />
            </div>
          </div>
        </div>

        {/* ── 5 · Recent Orders ────────────────────── */}
        <div style={sectionCard}>
          <div style={{ ...sectionTitle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🕐</span>
              {tx.recentOrders}
            </span>
            <button
              onClick={() => navigate('/orders')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#2563eb',
                fontSize: '0.8125rem',
                fontWeight: 600,
                padding: '0.25rem 0.5rem',
                borderRadius: '0.5rem',
              }}
            >
              {tx.viewAll} →
            </button>
          </div>

          {isMobile ? (
            /* ── Mobile: card list ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {isLoading ? (
                [0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: '4.5rem',
                      background: '#f1f5f9',
                      borderRadius: '0.75rem',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                ))
              ) : recentOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>—</div>
              ) : (
                recentOrders.map((order) => {
                  const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.draft;
                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          #{order.orderNumber}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '10rem',
                          }}
                        >
                          {order.customerName ?? '—'}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isRtl ? 'flex-start' : 'flex-end',
                          gap: '0.25rem',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>
                          {formatCurrency(order.total, language)}
                        </span>
                        <span
                          style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: sc.bg,
                            color: sc.color,
                          }}
                        >
                          {tx.statusLabels[order.status] ?? order.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ── Desktop: table ── */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    {[tx.orderNum, tx.client, tx.amount, tx.status].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '0.5rem 0.75rem',
                          textAlign: isRtl ? 'right' : 'left',
                          fontWeight: 700,
                          color: '#64748b',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    [0, 1, 2, 3, 4].map((i) => (
                      <tr key={i}>
                        {[0, 1, 2, 3].map((j) => (
                          <td key={j} style={{ padding: '0.75rem' }}>
                            <div
                              style={{
                                height: '1rem',
                                background: '#f1f5f9',
                                borderRadius: '0.25rem',
                                animation: 'pulse 1.5s ease-in-out infinite',
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}
                      >
                        —
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order, idx) => {
                      const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.draft;
                      return (
                        <tr
                          key={order.id}
                          onClick={() => navigate(`/orders/${order.id}`)}
                          style={{
                            borderBottom:
                              idx < recentOrders.length - 1 ? '1px solid #f1f5f9' : 'none',
                            cursor: 'pointer',
                            transition: 'background 0.1s ease',
                          }}
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.background = '#f8fafc')
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.background = 'transparent')
                          }
                        >
                          <td
                            style={{
                              padding: '0.75rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            #{order.orderNumber}
                          </td>
                          <td
                            style={{
                              padding: '0.75rem',
                              color: '#334155',
                              maxWidth: '10rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {order.customerName ?? '—'}
                          </td>
                          <td
                            style={{
                              padding: '0.75rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatCurrency(order.total, language)}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.625rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: sc.bg,
                                color: sc.color,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {tx.statusLabels[order.status] ?? order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
