import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AdminLayout } from '../components/AdminLayout';
import { PageHeader } from '../components/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { statisticsService } from '../modules/statistics';
import { formatCurrency } from '../lib/formatters';
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

  // Fetch comprehensive statistics
  const { data: comprehensiveStats, isLoading } = useQuery({
    queryKey: ['statistics', 'comprehensive'],
    queryFn: () => statisticsService.getComprehensiveStats(7),
  });

  // Fetch recent activities
  const { data: recentActivities } = useQuery({
    queryKey: ['statistics', 'recent-activities'],
    queryFn: () => statisticsService.getRecentActivities(6),
  });

  // Extract overview data
  const statistics = comprehensiveStats?.overview;
  const dailyStats = comprehensiveStats?.dailyStats || [];
  const topProducts = comprehensiveStats?.topProducts || [];

  // Extract KPIs from statistics
  const totalOrders = statistics?.TotalOrders || 0;
  const pendingOrders = statistics?.PendingOrders || 0;
  const inDeliveryOrders = statistics?.InDeliveryOrders || 0;
  const deliveredOrders = statistics?.DeliveredOrders || 0;
  const cancelledOrders = statistics?.CancelledOrders || 0;
  const activeDeliveryPersons = statistics?.ActiveDeliveryPersons || 0;
  const totalRevenue = statistics?.TotalRevenue || 0;
  const totalCustomers = statistics?.TotalCustomers || 0;
  const avgOrderValue = statistics?.AverageOrderValue || 0;

  // Format daily stats for charts
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

  // Calculate weekly comparison (current vs previous week)
  const midPoint = Math.floor(dailyStats.length / 2);
  const currentWeekStats = dailyStats.length > 0 ? dailyStats.slice(midPoint) : [];
  const previousWeekStats = dailyStats.length > 0 ? dailyStats.slice(0, midPoint) : [];

  const salesComparisonData = {
    categories: currentWeekStats.length > 0 ? currentWeekStats.map((stat, idx) => `Day ${idx + 1}`) : ['Day 1', 'Day 2', 'Day 3', 'Day 4'],
    currentPeriod: currentWeekStats.length > 0 ? currentWeekStats.map((stat) => stat.revenue) : [0, 0, 0, 0],
    previousPeriod: previousWeekStats.length > 0 ? previousWeekStats.map((stat) => stat.revenue) : [0, 0, 0, 0],
  };

  const performanceMetricsData = {
    avgOrderValue: avgOrderValue,
    avgOrderValueChange: 12.5, // TODO: Calculate based on historical data
    customerGrowth: totalCustomers,
    customerGrowthChange: 8.3, // TODO: Calculate based on historical data
    conversionRate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0,
    conversionRateChange: 3.2, // TODO: Calculate based on historical data
  };

  // Format top products for widget
  const formattedTopProducts = topProducts.map((product) => ({
    name: product.productName,
    sales: product.sales,
    revenue: product.revenue,
    trend: 12, // TODO: Calculate based on historical data
  }));

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <PageHeader
          icon={LayoutDashboard}
          title={t('dashboard')}
          subtitle={`${t('welcome')}, ${admin?.fullName || 'Admin'}`}
        />

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  </div>
                  <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
            {/* Secondary KPI Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  </div>
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto w-48" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <RevenueChart data={revenueData} />
              </div>
              <div className="lg:col-span-1">
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

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <SalesPerformanceChart data={salesComparisonData} />
              </div>
              <div className="lg:col-span-1">
                <PerformanceMetrics metrics={performanceMetricsData} />
              </div>
            </div>

            {/* Charts Row 3 - Orders Timeline & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <OrdersTimelineChart data={ordersTimelineData} />
              <TopProductsWidget products={formattedTopProducts} />
            </div>

            {/* Recent Activity - Full Width */}
            <div className="grid grid-cols-1">
              <RecentActivity activities={recentActivities} />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
