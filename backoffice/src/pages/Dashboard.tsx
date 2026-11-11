import React, { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Box,
  CalendarDays,
  Clock,
  DollarSign,
  Download,
  FileText,
  Layers,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AdminLayout } from '../components/AdminLayout';
import { useTenantModules } from '../components/TenantStatusGuard';
import { statisticsService } from '../modules/statistics';
import type { DashboardPeriod, IDashboardKpi, IDashboardStats } from '../modules/statistics';
import { APP_LOCALE, formatDate } from '@orderium/ui';
import { formatCurrency, formatNumber } from '../lib/formatters';
import './Dashboard.css';

// ─── Copy ────────────────────────────────────────────────────────────────────
const L = {
  fr: {
    welcome: (name: string) => `Bon retour, ${name} !`,
    heroLead: "Voici ce qui se passe dans votre commerce aujourd'hui.",
    heroLow: (n: React.ReactNode) => <>Vous avez {n} en stock faible.</>,
    heroOk: 'Tout votre stock est au-dessus du seuil.',
    items: (n: number) => `${n} article${n > 1 ? 's' : ''}`,
    mtd: 'Mois en cours',
    ytd: 'Année en cours',
    export: 'Exporter',
    refresh: 'Actualiser',
    totalSales: 'Ventes',
    revenue: "Chiffre d'affaires",
    cost: 'Coût des ventes',
    profit: 'Bénéfice',
    vsPrev: 'vs période précédente',
    salesStats: 'Statistiques des ventes',
    salesStatsSub: {
      daily: '30 derniers jours',
      weekly: '12 dernières semaines',
      monthly: '12 derniers mois',
    },
    daily: 'Jour',
    weekly: 'Semaine',
    monthly: 'Mois',
    vsLast: 'vs période précédente',
    breakdown: 'Répartition du CA',
    transactions: (n: number) => `${formatNumber(n, 0)} transaction${n > 1 ? 's' : ''}`,
    collected: 'Encaissé',
    collectedSub: 'Paiements reçus',
    outstanding: 'Reste à encaisser',
    outstandingSub: 'Montant non payé',
    profitSub: (m: string) => `Marge ${m}`,
    inventory: 'Aperçu du stock',
    qtyInHand: 'Quantité en stock',
    incoming: 'À recevoir',
    partners: 'Clients & fournisseurs',
    customers: 'Clients',
    suppliers: 'Fournisseurs',
    stockOverview: 'État du stock',
    lowStock: 'Articles en stock faible',
    categories: 'Catégories',
    products: 'Articles',
    customerStats: 'Statistiques clients',
    customerStatsSub: 'Nouveaux vs fidèles',
    newCustomers: 'Nouveaux',
    returningCustomers: 'Fidèles',
    peakMonth: 'clients au meilleur mois',
    purchases: 'Aperçu des achats',
    purchaseCount: "Bons d'achat",
    purchaseCost: 'Coût des achats',
    cancelled: 'Commandes annulées',
    returns: 'Retours clients',
    recentSales: 'Ventes récentes',
    recentSalesSub: 'Dernières transactions',
    viewAll: 'Voir tout',
    view: 'Voir',
    document: 'N° document',
    customer: 'Client',
    date: 'Date',
    amount: 'Montant',
    payment: 'Paiement',
    action: 'Action',
    lowStockProducts: 'Articles en stock faible',
    lowStockSub: 'Articles à réapprovisionner',
    product: 'Article',
    sku: 'Référence',
    currentStock: 'Stock actuel',
    minStock: 'Seuil',
    status: 'Statut',
    reorder: 'Commander',
    empty: 'Aucune donnée pour le moment',
    noLowStock: 'Aucun article sous le seuil',
    walkIn: 'Client comptoir',
    payStatus: { paid: 'Payée', partial: 'Partielle', unpaid: 'Non payée', cancelled: 'Annulée' },
    stockStatus: { out: 'Rupture', critical: 'Critique', low: 'Stock faible' },
    loadError: 'Impossible de charger le tableau de bord.',
    retry: 'Réessayer',
  },
  ar: {
    welcome: (name: string) => `مرحباً بعودتك، ${name}!`,
    heroLead: 'هذا ما يحدث في تجارتك اليوم.',
    heroLow: (n: React.ReactNode) => <>لديك {n} بمخزون منخفض.</>,
    heroOk: 'كل المخزون فوق حد التنبيه.',
    items: (n: number) => `${n} ${n > 1 ? 'مواد' : 'مادة'}`,
    mtd: 'الشهر الحالي',
    ytd: 'السنة الحالية',
    export: 'تصدير',
    refresh: 'تحديث',
    totalSales: 'المبيعات',
    revenue: 'رقم الأعمال',
    cost: 'تكلفة المبيعات',
    profit: 'الربح',
    vsPrev: 'مقارنة بالفترة السابقة',
    salesStats: 'إحصائيات المبيعات',
    salesStatsSub: { daily: 'آخر 30 يوماً', weekly: 'آخر 12 أسبوعاً', monthly: 'آخر 12 شهراً' },
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    vsLast: 'مقارنة بالفترة السابقة',
    breakdown: 'توزيع رقم الأعمال',
    transactions: (n: number) => `${formatNumber(n, 0)} عملية`,
    collected: 'المحصّل',
    collectedSub: 'الدفعات المستلمة',
    outstanding: 'الباقي للتحصيل',
    outstandingSub: 'مبالغ غير مدفوعة',
    profitSub: (m: string) => `الهامش ${m}`,
    inventory: 'نظرة على المخزون',
    qtyInHand: 'الكمية المتوفرة',
    incoming: 'قيد الاستلام',
    partners: 'العملاء والموردون',
    customers: 'العملاء',
    suppliers: 'الموردون',
    stockOverview: 'حالة المخزون',
    lowStock: 'مواد بمخزون منخفض',
    categories: 'الفئات',
    products: 'المواد',
    customerStats: 'إحصائيات العملاء',
    customerStatsSub: 'الجدد مقابل الدائمين',
    newCustomers: 'جدد',
    returningCustomers: 'دائمون',
    peakMonth: 'عميلاً في أفضل شهر',
    purchases: 'نظرة على المشتريات',
    purchaseCount: 'سندات الشراء',
    purchaseCost: 'تكلفة المشتريات',
    cancelled: 'طلبات ملغاة',
    returns: 'مرتجعات العملاء',
    recentSales: 'آخر المبيعات',
    recentSalesSub: 'آخر العمليات',
    viewAll: 'عرض الكل',
    view: 'عرض',
    document: 'رقم الوثيقة',
    customer: 'العميل',
    date: 'التاريخ',
    amount: 'المبلغ',
    payment: 'الدفع',
    action: 'إجراء',
    lowStockProducts: 'مواد بمخزون منخفض',
    lowStockSub: 'مواد تحتاج إلى تموين',
    product: 'المادة',
    sku: 'المرجع',
    currentStock: 'المخزون الحالي',
    minStock: 'الحد الأدنى',
    status: 'الحالة',
    reorder: 'طلب',
    empty: 'لا توجد بيانات بعد',
    noLowStock: 'لا توجد مواد تحت الحد',
    walkIn: 'زبون عابر',
    payStatus: { paid: 'مدفوعة', partial: 'جزئية', unpaid: 'غير مدفوعة', cancelled: 'ملغاة' },
    stockStatus: { out: 'نفاد', critical: 'حرج', low: 'منخفض' },
    loadError: 'تعذّر تحميل لوحة القيادة.',
    retry: 'إعادة المحاولة',
  },
};

type Copy = (typeof L)['fr'];
type Tone = 'primary' | 'paid' | 'unpaid' | 'partial' | 'pending' | 'draft';
type Granularity = 'daily' | 'weekly' | 'monthly';

// Chart colours must be literal values for ApexCharts; these mirror theme.css.
const C = {
  primary: '#235ae4',
  primary200: '#abc0f4',
  primary100: '#d4def9',
  grid: '#f1f5f9',
  axis: '#64748b',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Parses a server YYYY-MM-DD bucket as a local calendar date */
const parseDay = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const pct = (n: number) => `${formatNumber(n, 1)}%`;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

function payStatus(sale: IDashboardStats['recentSales'][number]) {
  if (sale.status === 'cancelled') return { key: 'cancelled' as const, tone: 'draft' as Tone };
  if (sale.total > 0 && sale.paidAmount >= sale.total)
    return { key: 'paid' as const, tone: 'paid' as Tone };
  if (sale.paidAmount > 0) return { key: 'partial' as const, tone: 'partial' as Tone };
  return { key: 'unpaid' as const, tone: 'unpaid' as Tone };
}

function stockStatus(p: IDashboardStats['lowStockProducts'][number]) {
  if (p.stock <= 0) return { key: 'out' as const, tone: 'unpaid' as Tone };
  if (p.stock <= p.threshold / 2) return { key: 'critical' as const, tone: 'pending' as Tone };
  return { key: 'low' as const, tone: 'partial' as Tone };
}

const barWidth = (value: number, max: number) =>
  `${max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0}%`;

// ─── Small building blocks ───────────────────────────────────────────────────
function Delta({ change, invert }: { change: number | null; invert?: boolean }) {
  if (change === null || !isFinite(change)) return null;
  const up = change >= 0;
  const good = Math.abs(change) < 0.05 ? null : invert ? !up : up;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`dash-delta dash-delta--${good === null ? 'flat' : good ? 'good' : 'bad'}`}>
      <Icon size={11} strokeWidth={2.5} aria-hidden />
      {pct(Math.abs(change))}
    </span>
  );
}

function CardTitle({
  icon: Icon,
  tone = 'primary',
  title,
  sub,
  extra,
}: {
  icon: React.ElementType;
  tone?: Tone;
  title: string;
  sub?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="dash-card__title">
      <span className={`dash-tile dash-tone--${tone}`}>
        <Icon size={16} strokeWidth={2.25} aria-hidden />
      </span>
      <div style={{ minWidth: 0 }}>
        <h2>
          {title} {extra}
        </h2>
        {sub && <p>{sub}</p>}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
  kpi,
  invert,
  accent,
  onClick,
  vsPrev,
}: {
  icon: React.ElementType;
  tone: Tone;
  label: string;
  value: string;
  kpi: IDashboardKpi;
  invert?: boolean;
  accent?: boolean;
  onClick: () => void;
  vsPrev: string;
}) {
  return (
    <button
      type="button"
      className="dash-card dash-kpi"
      onClick={onClick}
      title={kpi.change === null ? undefined : vsPrev}
    >
      <div className="dash-kpi__top">
        <span className={`dash-tile dash-tile--lg dash-tone--${tone}`}>
          <Icon size={20} strokeWidth={2.25} aria-hidden />
        </span>
        <Delta change={kpi.change} invert={invert} />
      </div>
      <span className={`dash-kpi__value${accent ? ' dash-kpi__value--accent' : ''}`}>{value}</span>
      <span className="dash-kpi__label">{label}</span>
      <div className="dash-bar" aria-hidden>
        <span
          className={`dash-fill--${tone}`}
          style={{ width: barWidth(kpi.value, Math.max(kpi.value, kpi.previous)) }}
        />
      </div>
    </button>
  );
}

function BarRow({
  icon: Icon,
  tone,
  label,
  value,
  ratio,
  alert,
  onClick,
}: {
  icon?: React.ElementType;
  tone: Tone;
  label: string;
  value: string;
  ratio: number;
  alert?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className="dash-li"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {Icon ? (
        <span className={`dash-tile dash-tone--${tone}`}>
          <Icon size={15} strokeWidth={2.25} aria-hidden />
        </span>
      ) : (
        <span className={`dash-dot dash-fill--${tone}`} aria-hidden />
      )}
      <div className="dash-li__body">
        <div className="dash-li__row">
          <span className="dash-li__label">{label}</span>
          <span className={`dash-li__value${alert ? ' dash-li__value--alert' : ''}`}>{value}</span>
        </div>
        <div className="dash-bar" aria-hidden>
          <span
            className={`dash-fill--${tone}`}
            style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const Sk = ({ h, w = '100%' }: { h: number | string; w?: number | string }) => (
  <div className="dash-sk" style={{ height: h, width: w }} />
);

// ─── Export ──────────────────────────────────────────────────────────────────
function exportCsv(stats: IDashboardStats, tx: Copy, language: 'fr' | 'ar') {
  const money = (v: number) => formatCurrency(v, language);
  const rows: (string | number)[][] = [
    [
      tx[stats.period],
      `${formatDate(parseDay(stats.range.start))} → ${formatDate(parseDay(stats.range.end))}`,
    ],
    [],
    [tx.totalSales, stats.kpis.sales.value],
    [tx.revenue, money(stats.kpis.revenue.value)],
    [tx.cost, money(stats.kpis.cost.value)],
    [tx.profit, money(stats.kpis.profit.value)],
    [tx.collected, money(stats.breakdown.collected)],
    [tx.outstanding, money(stats.breakdown.outstanding)],
    [],
    [tx.qtyInHand, stats.inventory.qtyInHand],
    [tx.incoming, stats.inventory.incoming],
    [tx.customers, stats.partners.customers],
    [tx.suppliers, stats.partners.suppliers],
    [tx.lowStock, stats.stock.lowStock],
    [tx.purchaseCount, stats.purchases.count],
    [tx.purchaseCost, money(stats.purchases.cost)],
    [tx.cancelled, stats.purchases.cancelledSales],
    [tx.returns, stats.purchases.returns],
    [],
    [tx.date, tx.revenue],
    ...stats.salesSeries.monthly.map((p) => [
      `${p.date.slice(5, 7)}/${p.date.slice(0, 4)}`,
      money(p.revenue),
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard-${stats.period}-${stats.range.end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { admin } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  // Advanced reports are plan-gated; the dashboard itself stays on every plan.
  const { reports: reportsEnabled } = useTenantModules();
  const lang = (language === 'ar' ? 'ar' : 'fr') as 'fr' | 'ar';
  const tx = L[lang];
  const locale = lang === 'ar' ? 'ar-MA' : 'fr-FR';

  const [period, setPeriod] = useState<DashboardPeriod>('mtd');
  const [granularity, setGranularity] = useState<Granularity>('monthly');

  const { data, isError, refetch, isFetching } = useQuery({
    queryKey: ['statistics', 'dashboard', period],
    queryFn: () => statisticsService.getDashboard(period),
    staleTime: 30_000,
    refetchInterval: 120_000,
    placeholderData: (prev) => prev,
  });

  const money = (v: number) => formatCurrency(v, lang);
  const count = (v: number) => formatNumber(v, 0);
  const compact = useMemo(
    () => new Intl.NumberFormat(APP_LOCALE, { notation: 'compact', maximumFractionDigits: 1 }),
    [],
  );

  const firstName = (admin?.fullName ?? admin?.name ?? '').split(' ')[0] || 'Admin';

  // ── Sales statistics series ──
  const series = useMemo(() => data?.salesSeries[granularity] ?? [], [data, granularity]);
  const seriesTotal = series.reduce((s, p) => s + p.revenue, 0);
  const lastTwo = series.slice(-2);
  const seriesChange =
    lastTwo.length === 2 && lastTwo[0].revenue > 0
      ? ((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100
      : null;

  const seriesLabel = (date: string) => {
    const d = parseDay(date);
    return granularity === 'monthly'
      ? d.toLocaleDateString(locale, { month: 'short' })
      : d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  const areaOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'area',
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: 'inherit',
      },
      colors: [C.primary],
      stroke: { curve: 'smooth', width: 2.5 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.28, opacityTo: 0.02, stops: [0, 95] },
      },
      dataLabels: { enabled: false },
      markers: { size: 0, hover: { size: 5 } },
      grid: { borderColor: C.grid, strokeDashArray: 4, padding: { left: 8, right: 8 } },
      xaxis: {
        categories: series.map((p) => seriesLabel(p.date)),
        labels: {
          style: { colors: C.axis, fontSize: '11px' },
          rotate: 0,
          hideOverlappingLabels: true,
        },
        tickAmount: granularity === 'daily' ? 10 : undefined,
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      },
      yaxis: {
        opposite: lang === 'ar',
        labels: {
          style: { colors: C.axis, fontSize: '11px' },
          formatter: (v: number) => compact.format(v),
        },
      },
      tooltip: {
        theme: 'light',
        y: { formatter: (v: number) => money(v) },
      },
      legend: { show: false },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, granularity, lang, compact],
  );

  // ── Customer statistics ──
  const customers = useMemo(() => data?.customerSeries ?? [], [data]);
  const peak = customers.reduce((m, c) => Math.max(m, c.new + c.returning), 0);

  const customerOptions = useMemo<ApexOptions>(
    () => ({
      chart: { type: 'bar', stacked: true, toolbar: { show: false }, fontFamily: 'inherit' },
      colors: [C.primary, C.primary200],
      plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: 'end', columnWidth: '55%' } },
      dataLabels: { enabled: false },
      grid: { borderColor: C.grid, strokeDashArray: 4 },
      xaxis: {
        categories: customers.map((c) =>
          parseDay(c.month).toLocaleDateString(locale, { month: 'short' }),
        ),
        labels: {
          style: { colors: C.axis, fontSize: '11px' },
          rotate: 0,
          hideOverlappingLabels: true,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        opposite: lang === 'ar',
        labels: {
          style: { colors: C.axis, fontSize: '11px' },
          formatter: (v: number) => String(Math.round(v)),
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: lang === 'ar' ? 'left' : 'right',
        fontSize: '12px',
        markers: { size: 5 },
        labels: { colors: C.axis },
      },
      tooltip: { theme: 'light', shared: true, intersect: false },
      states: { hover: { filter: { type: 'darken' } } },
    }),
    [customers, locale, lang],
  );

  const customerSeries = useMemo(
    () => [
      { name: tx.newCustomers, data: customers.map((c) => c.new) },
      { name: tx.returningCustomers, data: customers.map((c) => c.returning) },
    ],
    [customers, tx],
  );

  // ── Derived numbers ──
  const k = data?.kpis;
  const b = data?.breakdown;
  const stock = data?.stock;
  const purchases = data?.purchases;
  const stockMax = stock ? Math.max(stock.products, 1) : 1;
  const purchaseMax = purchases
    ? Math.max(purchases.count, purchases.cancelledSales, purchases.returns, 1)
    : 1;

  const goProducts = () => navigate('/products');
  const goSales = () => navigate('/orders');

  return (
    <AdminLayout>
      <div className="dash">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="dash-hero">
          <div className="dash-hero__main">
            <span className="dash-hero__icon">
              <Store size={24} strokeWidth={2} aria-hidden />
            </span>
            <div style={{ minWidth: 0 }}>
              <h1>{tx.welcome(firstName)}</h1>
              <p>
                {tx.heroLead}{' '}
                {stock && stock.lowStock > 0
                  ? tx.heroLow(
                      <button type="button" className="dash-hero__chip" onClick={goProducts}>
                        {tx.items(stock.lowStock)}
                      </button>,
                    )
                  : stock
                    ? tx.heroOk
                    : null}
              </p>
            </div>
          </div>
          <div className="dash-hero__actions">
            {(['mtd', 'ytd'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className="dash-hero__btn dash-hero__btn--grow"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
              >
                {p === 'mtd' ? (
                  <CalendarDays size={15} aria-hidden />
                ) : (
                  <Activity size={15} aria-hidden />
                )}
                {tx[p]}
              </button>
            ))}
            <button
              type="button"
              className="dash-hero__btn dash-hero__btn--icon"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label={tx.refresh}
              title={tx.refresh}
            >
              <RefreshCw size={15} className={isFetching ? 'dash-spin' : undefined} aria-hidden />
            </button>
            <button
              type="button"
              className="dash-hero__btn dash-hero__btn--solid"
              onClick={() => data && exportCsv(data, tx, lang)}
              disabled={!data}
            >
              <Download size={15} aria-hidden />
              {tx.export}
            </button>
          </div>
        </section>

        {isError && !data && (
          <div className="dash-card dash-empty" role="alert">
            <p style={{ margin: '0 0 0.75rem' }}>{tx.loadError}</p>
            <button type="button" className="dash-btn" onClick={() => refetch()}>
              <RefreshCw size={14} aria-hidden /> {tx.retry}
            </button>
          </div>
        )}

        {/* ── KPIs ─────────────────────────────────────────────── */}
        <section className="dash-kpis">
          {!k ? (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="dash-card" style={{ display: 'grid', gap: '0.75rem' }}>
                <Sk h={40} w={40} />
                <Sk h={28} w="60%" />
                <Sk h={10} w="40%" />
              </div>
            ))
          ) : (
            <>
              <KpiCard
                icon={ShoppingCart}
                tone="primary"
                label={tx.totalSales}
                value={count(k.sales.value)}
                kpi={k.sales}
                onClick={goSales}
                vsPrev={tx.vsPrev}
              />
              <KpiCard
                icon={TrendingUp}
                tone="paid"
                label={tx.revenue}
                value={money(k.revenue.value)}
                kpi={k.revenue}
                onClick={goSales}
                vsPrev={tx.vsPrev}
              />
              <KpiCard
                icon={TrendingDown}
                tone="unpaid"
                label={tx.cost}
                value={money(k.cost.value)}
                kpi={k.cost}
                invert
                onClick={goSales}
                vsPrev={tx.vsPrev}
              />
              <KpiCard
                icon={BarChart3}
                tone="partial"
                label={tx.profit}
                value={money(k.profit.value)}
                kpi={k.profit}
                accent
                onClick={
                  reportsEnabled !== false ? () => navigate('/analytics/sales/revenue') : goSales
                }
                vsPrev={tx.vsPrev}
              />
            </>
          )}
        </section>

        {/* ── Sales statistics + breakdown ─────────────────────── */}
        <section className="dash-row">
          <div className="dash-card">
            <div className="dash-card__head">
              <CardTitle
                icon={Activity}
                title={tx.salesStats}
                sub={tx.salesStatsSub[granularity]}
              />
              <div className="dash-seg" role="group" aria-label={tx.salesStats}>
                {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={granularity === g}
                    onClick={() => setGranularity(g)}
                  >
                    {tx[g]}
                  </button>
                ))}
              </div>
            </div>
            {!data ? (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <Sk h={34} w="40%" />
                <Sk h={240} />
              </div>
            ) : (
              <>
                <div className="dash-total">
                  <strong>{money(seriesTotal)}</strong>
                  {seriesChange !== null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Delta change={seriesChange} />
                      <span className="dash-total__hint">{tx.vsLast}</span>
                    </span>
                  )}
                </div>
                <div className="dash-chart">
                  <ReactApexChart
                    key={`${lang}-${granularity}`}
                    type="area"
                    height={260}
                    width="100%"
                    options={areaOptions}
                    series={[{ name: tx.revenue, data: series.map((p) => p.revenue) }]}
                  />
                </div>
              </>
            )}
          </div>

          <div className="dash-card">
            <div className="dash-card__head">
              <CardTitle icon={DollarSign} tone="paid" title={tx.breakdown} />
            </div>
            {!b ? (
              <div className="dash-list">
                {[0, 1, 2, 3].map((i) => (
                  <Sk key={i} h={58} />
                ))}
              </div>
            ) : (
              <div className="dash-list">
                {[
                  {
                    tone: 'primary',
                    label: tx.revenue,
                    sub: tx.transactions(b.salesCount),
                    value: b.revenue,
                  },
                  { tone: 'paid', label: tx.collected, sub: tx.collectedSub, value: b.collected },
                  {
                    tone: 'unpaid',
                    label: tx.outstanding,
                    sub: tx.outstandingSub,
                    value: b.outstanding,
                  },
                  {
                    tone: 'partial',
                    label: tx.profit,
                    sub: tx.profitSub(pct(b.margin)),
                    value: b.profit,
                  },
                ].map((r) => (
                  <div key={r.label} className="dash-li">
                    <span className={`dash-dot dash-fill--${r.tone}`} aria-hidden />
                    <div className="dash-li__body">
                      <div className="dash-li__label">{r.label}</div>
                      <div className="dash-li__sub">{r.sub}</div>
                    </div>
                    <span className="dash-li__value">{money(r.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Inventory / partners / stock ─────────────────────── */}
        <section className="dash-row dash-row--3">
          <div className="dash-card">
            <div className="dash-card__head">
              <CardTitle icon={Box} title={tx.inventory} />
            </div>
            <div className="dash-minis">
              <button type="button" className="dash-mini" onClick={goProducts}>
                <span className="dash-tile dash-tile--lg dash-tone--paid">
                  <Package size={18} aria-hidden />
                </span>
                <strong>{data ? count(data.inventory.qtyInHand) : '—'}</strong>
                <span>{tx.qtyInHand}</span>
              </button>
              <button type="button" className="dash-mini" onClick={() => navigate('/bon-achat')}>
                <span className="dash-tile dash-tile--lg dash-tone--partial">
                  <Clock size={18} aria-hidden />
                </span>
                <strong>{data ? count(data.inventory.incoming) : '—'}</strong>
                <span>{tx.incoming}</span>
              </button>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card__head">
              <CardTitle icon={Users} title={tx.partners} />
            </div>
            <div className="dash-minis">
              <button type="button" className="dash-mini" onClick={() => navigate('/customers')}>
                <span className="dash-tile dash-tile--lg dash-tone--primary">
                  <Users size={18} aria-hidden />
                </span>
                <strong>{data ? compact.format(data.partners.customers) : '—'}</strong>
                <span>{tx.customers}</span>
              </button>
              <button type="button" className="dash-mini" onClick={() => navigate('/fournisseurs')}>
                <span className="dash-tile dash-tile--lg dash-tone--pending">
                  <Truck size={18} aria-hidden />
                </span>
                <strong>{data ? compact.format(data.partners.suppliers) : '—'}</strong>
                <span>{tx.suppliers}</span>
              </button>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card__head">
              <CardTitle icon={AlertTriangle} tone="unpaid" title={tx.stockOverview} />
            </div>
            {!stock ? (
              <div className="dash-list">
                {[0, 1, 2].map((i) => (
                  <Sk key={i} h={52} />
                ))}
              </div>
            ) : (
              <div className="dash-list">
                <BarRow
                  tone="unpaid"
                  label={tx.lowStock}
                  value={String(stock.lowStock).padStart(2, '0')}
                  ratio={stock.lowStock / stockMax}
                  alert={stock.lowStock > 0}
                  onClick={goProducts}
                />
                <BarRow
                  tone="primary"
                  label={tx.categories}
                  value={count(stock.categories)}
                  ratio={stock.categories / Math.max(stock.categories, 20)}
                  onClick={() => navigate('/categories')}
                />
                <BarRow
                  tone="paid"
                  label={tx.products}
                  value={count(stock.products)}
                  ratio={1}
                  onClick={goProducts}
                />
              </div>
            )}
          </div>
        </section>

        {/* ── Customers chart + purchases ──────────────────────── */}
        <section className="dash-row">
          <div className="dash-card">
            <div className="dash-card__head">
              <CardTitle icon={Users} title={tx.customerStats} sub={tx.customerStatsSub} />
            </div>
            {!data ? (
              <Sk h={260} />
            ) : (
              <>
                <div className="dash-total">
                  <strong>{count(peak)}</strong>
                  <span className="dash-total__hint">{tx.peakMonth}</span>
                </div>
                <div className="dash-chart">
                  <ReactApexChart
                    key={lang}
                    type="bar"
                    height={250}
                    width="100%"
                    options={customerOptions}
                    series={customerSeries}
                  />
                </div>
              </>
            )}
          </div>

          <div className="dash-card">
            <div className="dash-card__head">
              <CardTitle icon={ShoppingBag} tone="partial" title={tx.purchases} />
            </div>
            {!purchases ? (
              <div className="dash-list">
                {[0, 1, 2, 3].map((i) => (
                  <Sk key={i} h={58} />
                ))}
              </div>
            ) : (
              <div className="dash-list">
                <BarRow
                  icon={ShoppingBag}
                  tone="primary"
                  label={tx.purchaseCount}
                  value={count(purchases.count)}
                  ratio={purchases.count / purchaseMax}
                  onClick={() => navigate('/bon-achat')}
                />
                <BarRow
                  icon={DollarSign}
                  tone="partial"
                  label={tx.purchaseCost}
                  value={money(purchases.cost)}
                  ratio={
                    b && b.revenue > 0
                      ? purchases.cost / Math.max(purchases.cost, b.revenue)
                      : purchases.cost > 0
                        ? 1
                        : 0
                  }
                  onClick={() => navigate('/factures/achat')}
                />
                <BarRow
                  icon={XCircle}
                  tone="unpaid"
                  label={tx.cancelled}
                  value={String(purchases.cancelledSales).padStart(2, '0')}
                  ratio={purchases.cancelledSales / purchaseMax}
                  alert={purchases.cancelledSales > 0}
                  onClick={goSales}
                />
                <BarRow
                  icon={RotateCcw}
                  tone="paid"
                  label={tx.returns}
                  value={String(purchases.returns).padStart(2, '0')}
                  ratio={purchases.returns / purchaseMax}
                  onClick={() => navigate('/stock-movements')}
                />
              </div>
            )}
          </div>
        </section>

        {/* ── Recent sales ─────────────────────────────────────── */}
        <section className="dash-card">
          <div className="dash-card__head">
            <CardTitle icon={FileText} title={tx.recentSales} sub={tx.recentSalesSub} />
            <button type="button" className="dash-btn" onClick={goSales}>
              {tx.viewAll}
            </button>
          </div>
          {!data ? (
            <div className="dash-list">
              {[0, 1, 2, 3, 4].map((i) => (
                <Sk key={i} h={40} />
              ))}
            </div>
          ) : data.recentSales.length === 0 ? (
            <div className="dash-empty">{tx.empty}</div>
          ) : (
            <>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>{tx.document}</th>
                      <th>{tx.customer}</th>
                      <th>{tx.date}</th>
                      <th>{tx.amount}</th>
                      <th>{tx.payment}</th>
                      <th>{tx.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSales.map((s) => {
                      const ps = payStatus(s);
                      const name = s.customerName || tx.walkIn;
                      return (
                        <tr key={s.id}>
                          <td>
                            <button
                              type="button"
                              className="dash-link"
                              onClick={() => navigate(`/orders/${s.id}`)}
                            >
                              {s.documentNumber}
                            </button>
                          </td>
                          <td>
                            <span className="dash-person">
                              <span className="dash-avatar" aria-hidden>
                                {initials(name)}
                              </span>
                              {name}
                            </span>
                          </td>
                          <td>{formatDate(parseDay(s.date))}</td>
                          <td className="dash-num">{money(s.total)}</td>
                          <td>
                            <span className={`dash-badge dash-badge--${ps.tone}`}>
                              {tx.payStatus[ps.key]}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="dash-btn"
                              onClick={() => navigate(`/orders/${s.id}`)}
                            >
                              {tx.view}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="dash-mlist">
                {data.recentSales.map((s) => {
                  const ps = payStatus(s);
                  const name = s.customerName || tx.walkIn;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="dash-mrow"
                      onClick={() => navigate(`/orders/${s.id}`)}
                    >
                      <span className="dash-avatar" aria-hidden>
                        {initials(name)}
                      </span>
                      <span className="dash-mrow__body">
                        <span className="dash-mrow__title" style={{ display: 'block' }}>
                          {name}
                        </span>
                        <span className="dash-mrow__sub" style={{ display: 'block' }}>
                          {s.documentNumber} · {formatDate(parseDay(s.date))}
                        </span>
                      </span>
                      <span className="dash-mrow__end">
                        <strong>{money(s.total)}</strong>
                        <span className={`dash-badge dash-badge--${ps.tone}`}>
                          {tx.payStatus[ps.key]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* ── Low stock products ───────────────────────────────── */}
        <section className="dash-card">
          <div className="dash-card__head">
            <CardTitle
              icon={AlertTriangle}
              tone="unpaid"
              title={tx.lowStockProducts}
              sub={tx.lowStockSub}
              extra={
                stock && stock.lowStock > 0 ? (
                  <span className="dash-count">{tx.items(stock.lowStock)}</span>
                ) : null
              }
            />
            <button type="button" className="dash-btn" onClick={goProducts}>
              {tx.viewAll}
            </button>
          </div>
          {!data ? (
            <div className="dash-list">
              {[0, 1, 2, 3].map((i) => (
                <Sk key={i} h={44} />
              ))}
            </div>
          ) : data.lowStockProducts.length === 0 ? (
            <div className="dash-empty">{tx.noLowStock}</div>
          ) : (
            <>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>{tx.product}</th>
                      <th>{tx.sku}</th>
                      <th>{tx.currentStock}</th>
                      <th>{tx.minStock}</th>
                      <th>{tx.status}</th>
                      <th>{tx.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lowStockProducts.map((p) => {
                      const st = stockStatus(p);
                      return (
                        <tr key={p.id}>
                          <td>
                            <span className="dash-person">
                              {p.imageUrl ? (
                                <img
                                  className="dash-thumb"
                                  src={p.imageUrl}
                                  alt=""
                                  loading="lazy"
                                />
                              ) : (
                                <span className="dash-thumb">
                                  <Layers size={16} aria-hidden />
                                </span>
                              )}
                              <button
                                type="button"
                                className="dash-link"
                                style={{ color: 'var(--text-primary)' }}
                                onClick={() => navigate(`/products/${p.id}`)}
                              >
                                {p.name}
                              </button>
                            </span>
                          </td>
                          <td className="dash-mono">{p.code || '—'}</td>
                          <td
                            className="dash-num"
                            style={{ color: `var(--status-${st.tone}-text)` }}
                          >
                            {count(p.stock)}
                          </td>
                          <td>{count(p.threshold)}</td>
                          <td>
                            <span className={`dash-badge dash-badge--${st.tone}`}>
                              {tx.stockStatus[st.key]}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="dash-btn dash-btn--outline-primary"
                              onClick={() => navigate('/bon-achat/create')}
                            >
                              {tx.reorder}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="dash-mlist">
                {data.lowStockProducts.map((p) => {
                  const st = stockStatus(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="dash-mrow"
                      onClick={() => navigate(`/products/${p.id}`)}
                    >
                      {p.imageUrl ? (
                        <img className="dash-thumb" src={p.imageUrl} alt="" loading="lazy" />
                      ) : (
                        <span className="dash-thumb">
                          <Layers size={16} aria-hidden />
                        </span>
                      )}
                      <span className="dash-mrow__body">
                        <span className="dash-mrow__title" style={{ display: 'block' }}>
                          {p.name}
                        </span>
                        <span className="dash-mrow__sub" style={{ display: 'block' }}>
                          {tx.currentStock}: {count(p.stock)} / {count(p.threshold)}
                        </span>
                      </span>
                      <span className="dash-mrow__end">
                        <span className={`dash-badge dash-badge--${st.tone}`}>
                          {tx.stockStatus[st.key]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
