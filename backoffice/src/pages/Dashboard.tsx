import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { statisticsService } from '../modules/statistics';
import { formatCurrency } from '../lib/formatters';
import { Skeleton } from 'primereact/skeleton';
import { useNavigate } from 'react-router-dom';
import {
    Package, Truck, CheckCircle, Clock, TrendingUp,
    LayoutDashboard, Users, DollarSign, ShoppingCart,
    RefreshCw,
} from 'lucide-react';
import {
    StatsCard,
    RevenueChart,
    OrdersDistributionChart,
    SalesPerformanceChart,
    PerformanceMetrics,
    RecentActivity,
    TopProductsWidget,
    OrdersTimelineChart,
} from '../components/Dashboard';

// ─── Section separator ─────────────────────────────────────────────────────
function SectionHeader({ number, label }: { number: number; label: string }) {
    return (
        <div className="db-section-header">
            <span className="db-section-number">{number}</span>
            <span className="db-section-label">{label}</span>
            <span className="db-section-line" />
        </div>
    );
}

// ─── Dashboard skeleton ────────────────────────────────────────────────────
function DashboardSkeleton() {
    const SkCard = () => (
        <div className="db-stats-skeleton">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                <Skeleton width="5rem" height="0.6875rem" />
                <Skeleton width="2.5rem" height="2.5rem" borderRadius="0.625rem" />
            </div>
            <Skeleton width="7rem" height="1.75rem" className="mb-2" />
            <Skeleton width="4rem" height="0.6875rem" />
        </div>
    );

    const SkChart = ({ height = '18rem' }: { height?: string }) => (
        <div className="db-chart-card" style={{ padding: '1.25rem' }}>
            <Skeleton width="8.5rem" height="0.9375rem" className="mb-1" />
            <Skeleton width="5rme" height="0.75rem" className="mb-3" style={{ marginTop: '0.25rem' }} />
            <Skeleton height={height} borderRadius="0.625rem" />
        </div>
    );

    return (
        <>
            <div className="db-kpi-grid">{[...Array(4)].map((_, i) => <SkCard key={i} />)}</div>
            <div className="db-kpi-grid">{[...Array(4)].map((_, i) => <SkCard key={i} />)}</div>
            <div className="db-grid-2-1"><SkChart height="18rem" /><SkChart height="18rem" /></div>
            <div className="db-grid-2-1"><SkChart height="18rem" /><SkChart height="16rem" /></div>
            <div className="db-grid-2"><SkChart height="16rem" /><SkChart height="16rem" /></div>
            <SkChart height="14rem" />
        </>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
    const { admin } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();

    const { data: comprehensiveStats, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['statistics', 'comprehensive'],
        queryFn: () => statisticsService.getComprehensiveStats(7),
    });

    const { data: recentActivities } = useQuery({
        queryKey: ['statistics', 'recent-activities'],
        queryFn: () => statisticsService.getRecentActivities(6),
    });

    const statistics = comprehensiveStats?.overview;
    const dailyStats = comprehensiveStats?.dailyStats || [];
    const topProducts = comprehensiveStats?.topProducts || [];

    const totalOrders = statistics?.TotalOrders || 0;
    const pendingOrders = statistics?.PendingOrders || 0;
    const inDeliveryOrders = statistics?.InDeliveryOrders || 0;
    const deliveredOrders = statistics?.DeliveredOrders || 0;
    const cancelledOrders = statistics?.CancelledOrders || 0;
    const activeDeliveryPersons = statistics?.ActiveDeliveryPersons || 0;
    const totalRevenue = statistics?.TotalRevenue || 0;
    const totalCustomers = statistics?.TotalCustomers || 0;
    const avgOrderValue = statistics?.AverageOrderValue || 0;

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });

    const revenueData = {
        dates: dailyStats.map((s) => formatDate(s.date)),
        revenue: dailyStats.map((s) => s.revenue),
        orders: dailyStats.map((s) => s.orders),
    };

    const ordersTimelineData = {
        dates: dailyStats.map((s) => formatDate(s.date)),
        newOrders: dailyStats.map((s) => s.newOrders),
        delivered: dailyStats.map((s) => s.delivered),
        cancelled: dailyStats.map((s) => s.cancelled),
    };

    const midPoint = Math.floor(dailyStats.length / 2);
    const cur = dailyStats.slice(midPoint);
    const prev = dailyStats.slice(0, midPoint);

    const salesComparisonData = {
        categories: cur.length > 0 ? cur.map((_, i) => `Day ${i + 1}`) : ['D1', 'D2', 'D3', 'D4'],
        currentPeriod: cur.map((s) => s.revenue),
        previousPeriod: prev.map((s) => s.revenue),
    };

    const performanceMetricsData = {
        avgOrderValue,
        avgOrderValueChange: 12.5,
        customerGrowth: totalCustomers,
        customerGrowthChange: 8.3,
        conversionRate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0,
        conversionRateChange: 3.2,
    };

    const formattedTopProducts = topProducts.map((p) => ({
        name: p.productName,
        sales: p.sales,
        revenue: p.revenue,
        trend: 12,
    }));

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return t('goodMorning') || 'Good morning';
        if (h < 18) return t('goodAfternoon') || 'Good afternoon';
        return t('goodEvening') || 'Good evening';
    };

    return (
        <AdminLayout>
            <div className="db-page">

                {/* ── Page header ───────────────────────── */}
                <PageHeader
                    icon={LayoutDashboard}
                    title={t('dashboard')}
                    subtitle={`${getGreeting()}, ${admin?.fullName || 'Admin'}`}
                    actions={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '0.25rem 0.625rem',
                                background: '#f0fdf4', color: '#16a34a',
                                border: '1px solid #bbf7d0', borderRadius: '9999px',
                                fontSize: '0.6875rem', fontWeight: 700,
                            }}>
                                <span className="db-live-dot" />Live
                            </span>
                            <span style={{
                                padding: '0.25rem 0.625rem',
                                background: '#f8fafc', color: '#64748b',
                                border: '1px solid #e2e8f0', borderRadius: '9999px',
                                fontSize: '0.6875rem', fontWeight: 600,
                                display: 'inline-block',
                            }}>
                                {t('last7Days') || 'Last 7 days'}
                            </span>
                            <button
                                onClick={() => refetch()}
                                disabled={isFetching}
                                title="Refresh data"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '2rem', height: '2rem', borderRadius: '0.5rem',
                                    border: '1px solid #e2e8f0', background: '#fff',
                                    cursor: isFetching ? 'not-allowed' : 'pointer',
                                    color: '#64748b', opacity: isFetching ? 0.5 : 1,
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <RefreshCw
                                    style={{
                                        width: '0.9rem', height: '0.9rem',
                                        animation: isFetching ? 'spin 1s linear infinite' : 'none',
                                    }}
                                />
                            </button>
                        </div>
                    }
                />

                {isLoading ? (
                    <DashboardSkeleton />
                ) : (
                    <>
                        {/* ─────────────────────────────────────────────
                            SECTION 1 — Vue d'ensemble (KPI Overview)
                        ───────────────────────────────────────────── */}
                        <SectionHeader number={1} label={t('dashboardOverview') || 'Vue d\'ensemble'} />

                        {/* Primary KPIs */}
                        <div className="db-kpi-grid">
                            <StatsCard
                                title={t('totalRevenue')}
                                value={formatCurrency(totalRevenue, language)}
                                icon={DollarSign}
                                color="green"
                                trend={{ value: 12.5, isPositive: true }}
                                onClick={() => navigate('/orders')}
                            />
                            <StatsCard
                                title={t('totalOrders')}
                                value={totalOrders}
                                icon={ShoppingCart}
                                color="blue"
                                trend={{ value: 8.3, isPositive: true }}
                                onClick={() => navigate('/orders')}
                            />
                            <StatsCard
                                title={t('avgOrderValue')}
                                value={formatCurrency(avgOrderValue, language)}
                                icon={TrendingUp}
                                color="purple"
                                trend={{ value: 3.2, isPositive: true }}
                            />
                            <StatsCard
                                title={t('totalCustomers')}
                                value={totalCustomers}
                                icon={Users}
                                color="indigo"
                                trend={{ value: 15.8, isPositive: true }}
                                onClick={() => navigate('/customers')}
                            />
                        </div>

                        {/* Order status KPIs */}
                        <div className="db-kpi-grid">
                            <StatsCard
                                title={t('pending')}
                                value={pendingOrders}
                                icon={Clock}
                                color="orange"
                                subtitle={t('ordersAwaitingProcessing')}
                                progress={totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0}
                                onClick={() => navigate('/orders?status=pending')}
                            />
                            <StatsCard
                                title={t('inDelivery')}
                                value={inDeliveryOrders}
                                icon={Truck}
                                color="blue"
                                subtitle={t('ordersInTransit')}
                                progress={totalOrders > 0 ? (inDeliveryOrders / totalOrders) * 100 : 0}
                                onClick={() => navigate('/orders?status=in_delivery')}
                            />
                            <StatsCard
                                title={t('delivered')}
                                value={deliveredOrders}
                                icon={CheckCircle}
                                color="emerald"
                                subtitle={t('successfulDeliveries')}
                                progress={totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0}
                                onClick={() => navigate('/orders?status=delivered')}
                            />
                            <StatsCard
                                title={t('activeDeliveryPersons')}
                                value={activeDeliveryPersons}
                                icon={Package}
                                color="purple"
                                subtitle={t('currentlyActive')}
                                onClick={() => navigate('/delivery-persons')}
                            />
                        </div>

                        {/* ─────────────────────────────────────────────
                            SECTION 2 — Analytiques (Charts)
                        ───────────────────────────────────────────── */}
                        <SectionHeader number={2} label="Analytiques" />

                        {/* Revenue + Orders Distribution */}
                        <div className="db-grid-2-1">
                            <RevenueChart data={revenueData} />
                            <OrdersDistributionChart data={{
                                pending: pendingOrders,
                                inDelivery: inDeliveryOrders,
                                delivered: deliveredOrders,
                                cancelled: cancelledOrders,
                            }} />
                        </div>

                        {/* Sales Comparison + Performance Metrics */}
                        <div className="db-grid-2-1">
                            <SalesPerformanceChart data={salesComparisonData} />
                            <PerformanceMetrics metrics={performanceMetricsData} />
                        </div>

                        {/* ─────────────────────────────────────────────
                            SECTION 3 — Performance & Produits
                        ───────────────────────────────────────────── */}
                        <SectionHeader number={3} label="Performance & Produits" />

                        {/* Orders Timeline + Top Products */}
                        <div className="db-grid-2">
                            <OrdersTimelineChart data={ordersTimelineData} />
                            <TopProductsWidget products={formattedTopProducts} />
                        </div>

                        {/* ─────────────────────────────────────────────
                            SECTION 4 — Activité récente
                        ───────────────────────────────────────────── */}
                        <SectionHeader number={4} label={t('recentActivity') || 'Activité récente'} />

                        <RecentActivity activities={recentActivities} />
                    </>
                )}
            </div>
        </AdminLayout>
    );
}

