import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { statisticsService } from '../modules/statistics';
import { formatCurrency } from '../lib/formatters';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import {
    Package,
    Truck,
    CheckCircle,
    Clock,
    TrendingUp,
    LayoutDashboard,
    Users,
    DollarSign,
    ShoppingCart,
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

export default function Dashboard() {
    const { admin } = useAuth();
    const { t, language } = useLanguage();

    const { data: comprehensiveStats, isLoading } = useQuery({
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

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const revenueData = {
        dates: dailyStats.length > 0 ? dailyStats.map((stat) => formatDate(stat.date)) : [],
        revenue: dailyStats.length > 0 ? dailyStats.map((stat) => stat.revenue) : [],
        orders: dailyStats.length > 0 ? dailyStats.map((stat) => stat.orders) : [],
    };

    const ordersTimelineData = {
        dates: dailyStats.length > 0 ? dailyStats.map((stat) => formatDate(stat.date)) : [],
        newOrders: dailyStats.length > 0 ? dailyStats.map((stat) => stat.newOrders) : [],
        delivered: dailyStats.length > 0 ? dailyStats.map((stat) => stat.delivered) : [],
        cancelled: dailyStats.length > 0 ? dailyStats.map((stat) => stat.cancelled) : [],
    };

    const midPoint = Math.floor(dailyStats.length / 2);
    const currentWeekStats = dailyStats.length > 0 ? dailyStats.slice(midPoint) : [];
    const previousWeekStats = dailyStats.length > 0 ? dailyStats.slice(0, midPoint) : [];

    const salesComparisonData = {
        categories: currentWeekStats.length > 0
            ? currentWeekStats.map((_, idx) => `Day ${idx + 1}`)
            : ['Day 1', 'Day 2', 'Day 3', 'Day 4'],
        currentPeriod: currentWeekStats.length > 0 ? currentWeekStats.map((stat) => stat.revenue) : [0, 0, 0, 0],
        previousPeriod: previousWeekStats.length > 0 ? previousWeekStats.map((stat) => stat.revenue) : [0, 0, 0, 0],
    };

    const performanceMetricsData = {
        avgOrderValue: avgOrderValue,
        avgOrderValueChange: 12.5,
        customerGrowth: totalCustomers,
        customerGrowthChange: 8.3,
        conversionRate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0,
        conversionRateChange: 3.2,
    };

    const formattedTopProducts = topProducts.map((product) => ({
        name: product.productName,
        sales: product.sales,
        revenue: product.revenue,
        trend: 12,
    }));

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('goodMorning') || 'Good morning';
        if (hour < 18) return t('goodAfternoon') || 'Good afternoon';
        return t('goodEvening') || 'Good evening';
    };

    return (
        <AdminLayout>
            <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
                {/* Page Header */}
                <PageHeader
                    icon={LayoutDashboard}
                    title={t('dashboard')}
                    subtitle={`${getGreeting()}, ${admin?.fullName || 'Admin'}`}
                    actions={
                        <>
                            <Tag
                                value="Live"
                                style={{
                                    backgroundColor: '#f0fdf4',
                                    color: '#16a34a',
                                    border: '1px solid #dcfce7',
                                    fontWeight: 700,
                                    fontSize: '0.6875rem',
                                    letterSpacing: '0.03em',
                                }}
                            />
                            <Tag
                                value={t('last7Days') || 'Last 7 days'}
                                style={{
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    border: '1px solid #dbeafe',
                                    fontWeight: 600,
                                    fontSize: '0.6875rem',
                                }}
                            />
                        </>
                    }
                />

                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* KPI Skeletons */}
                        <div className="dashboard-grid-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '0.875rem',
                                    padding: '1.25rem',
                                    border: '1px solid #e5e7eb',
                                }}>
                                    <Skeleton width="5rem" height="0.75rem" className="mb-3" />
                                    <Skeleton width="7rem" height="1.75rem" className="mb-2" />
                                    <Skeleton width="4rem" height="0.75rem" />
                                </div>
                            ))}
                        </div>
                        <div className="dashboard-grid-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '0.875rem',
                                    padding: '1.25rem',
                                    border: '1px solid #e5e7eb',
                                }}>
                                    <Skeleton width="5rem" height="0.75rem" className="mb-3" />
                                    <Skeleton width="4rem" height="1.75rem" className="mb-2" />
                                    <Skeleton width="6rem" height="0.75rem" />
                                </div>
                            ))}
                        </div>
                        {/* Chart Skeletons */}
                        <div className="dashboard-grid-2-1">
                            <div style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '0.875rem',
                                padding: '1.25rem',
                                border: '1px solid #e5e7eb',
                            }}>
                                <Skeleton width="8rem" height="1rem" className="mb-3" />
                                <Skeleton height="14rem" />
                            </div>
                            <div style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '0.875rem',
                                padding: '1.25rem',
                                border: '1px solid #e5e7eb',
                            }}>
                                <Skeleton width="6rem" height="1rem" className="mb-3" />
                                <Skeleton height="14rem" shape="circle" size="10rem" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Primary KPI Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                            <StatsCard
                                title={t('totalRevenue')}
                                value={formatCurrency(totalRevenue, language)}
                                icon={DollarSign}
                                color="green"
                                trend={{ value: 12.5, isPositive: true }}
                            />
                            <StatsCard
                                title={t('totalOrders')}
                                value={totalOrders}
                                icon={ShoppingCart}
                                color="blue"
                                trend={{ value: 8.3, isPositive: true }}
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
                            />
                        </div>

                        {/* Secondary KPI Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                            <StatsCard
                                title={t('pending')}
                                value={pendingOrders}
                                icon={Clock}
                                color="orange"
                                subtitle={t('ordersAwaitingProcessing')}
                            />
                            <StatsCard
                                title={t('inDelivery')}
                                value={inDeliveryOrders}
                                icon={Truck}
                                color="blue"
                                subtitle={t('ordersInTransit')}
                            />
                            <StatsCard
                                title={t('delivered')}
                                value={deliveredOrders}
                                icon={CheckCircle}
                                color="emerald"
                                subtitle={t('successfulDeliveries')}
                            />
                            <StatsCard
                                title={t('activeDeliveryPersons')}
                                value={activeDeliveryPersons}
                                icon={Users}
                                color="purple"
                                subtitle={t('currentlyActive')}
                            />
                        </div>

                        {/* Charts Row 1: Revenue + Orders Distribution */}
                        <div className="dashboard-grid-2-1">
                            <div className="chart-card-enterprise" style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '0.875rem',
                                border: '1px solid #e5e7eb',
                                overflow: 'hidden',
                                transition: 'box-shadow 0.2s ease',
                            }}>
                                <RevenueChart data={revenueData} />
                            </div>
                            <div className="chart-card-enterprise" style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '0.875rem',
                                border: '1px solid #e5e7eb',
                                overflow: 'hidden',
                                transition: 'box-shadow 0.2s ease',
                            }}>
                                <OrdersDistributionChart
                                    data={{
                                        pending: pendingOrders,
                                        inDelivery: inDeliveryOrders,
                                        delivered: deliveredOrders,
                                        cancelled: cancelledOrders,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Charts Row 2: Sales Performance + Performance Metrics */}
                        <div className="dashboard-grid-2-1">
                            <div className="chart-card-enterprise" style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '0.875rem',
                                border: '1px solid #e5e7eb',
                                overflow: 'hidden',
                                transition: 'box-shadow 0.2s ease',
                            }}>
                                <SalesPerformanceChart data={salesComparisonData} />
                            </div>
                            <div className="chart-card-enterprise" style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '0.875rem',
                                border: '1px solid #e5e7eb',
                                overflow: 'hidden',
                                transition: 'box-shadow 0.2s ease',
                            }}>
                                <PerformanceMetrics metrics={performanceMetricsData} />
                            </div>
                        </div>

                        {/* Charts Row 3: Orders Timeline & Top Products */}
                        <div className="dashboard-grid-2">
                            <div className="chart-card-enterprise" style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '0.875rem',
                                border: '1px solid #e5e7eb',
                                overflow: 'hidden',
                                transition: 'box-shadow 0.2s ease',
                            }}>
                                <OrdersTimelineChart data={ordersTimelineData} />
                            </div>
                            <div className="chart-card-enterprise" style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '0.875rem',
                                border: '1px solid #e5e7eb',
                                overflow: 'hidden',
                                transition: 'box-shadow 0.2s ease',
                            }}>
                                <TopProductsWidget products={formattedTopProducts} />
                            </div>
                        </div>

                        {/* Recent Activity - Full Width */}
                        <div className="chart-card-enterprise" style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '0.875rem',
                            border: '1px solid #e5e7eb',
                            overflow: 'hidden',
                            transition: 'box-shadow 0.2s ease',
                        }}>
                            <RecentActivity activities={recentActivities} />
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        .dashboard-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .dashboard-grid-2-1 {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
        }
        .dashboard-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .dashboard-grid-4 > *,
        .dashboard-grid-2-1 > *,
        .dashboard-grid-2 > * {
          min-width: 0;
        }
        .chart-card-enterprise:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.05);
        }
        @media (max-width: 1023px) {
          .dashboard-grid-2-1,
          .dashboard-grid-2 {
            grid-template-columns: 1fr;
          }
          .dashboard-grid-4 {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 639px) {
          .dashboard-grid-4 {
            grid-template-columns: 1fr;
          }
          .dashboard-title {
            font-size: 1.125rem !important;
          }
          .dashboard-page-header {
            margin-bottom: 1rem !important;
          }
        }
      `}</style>
        </AdminLayout>
    );
}
