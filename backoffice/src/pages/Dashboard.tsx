import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { NotificationBell } from '../components/NotificationBell';
import { useNavigate, Link } from 'react-router-dom';
import { useOrderNotifications } from '../hooks/useOrderNotifications';
import { useQuery } from '@tanstack/react-query';
import { statisticsService } from '../services/api';
import { Package, Truck, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { admin, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Connect to real-time notifications
  const { isConnected } = useOrderNotifications({
    token: admin?.token || localStorage.getItem('adminToken'),
    enabled: !!admin,
  });

  // Fetch all statistics (no date filter)
  const { data: statistics, isLoading } = useQuery({
    queryKey: ['statistics', 'all'],
    queryFn: () => statisticsService.getStatistics(),
  });

  // Extract KPIs from statistics
  const totalOrders = statistics?.TotalOrders || 0;
  const pendingOrders = statistics?.PendingOrders || 0;
  const inDeliveryOrders = statistics?.InDeliveryOrders || 0;
  const deliveredOrders = statistics?.DeliveredOrders || 0;
  const activeDeliveryPersons = statistics?.ActiveDeliveryPersons || 0;
  const totalRevenue = statistics?.TotalRevenue || 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200/60 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-800">{t('appName')} {t('adminBackoffice')}</h1>
              {isConnected && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 gap-2">
              <NotificationBell />
              <LanguageToggle />
              <span className="text-sm text-slate-700 font-medium">{t('welcome')}, {admin?.username}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">{t('dashboard')}</h2>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {isLoading ? (
              <div className="col-span-full flex items-center justify-center h-32">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* Total Orders */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500 mb-1">{t('totalOrders')}</p>
                      <p className="text-3xl font-bold text-slate-800">{totalOrders}</p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/30">
                      <Package className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>

                {/* Pending Orders */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500 mb-1">{t('pending')}</p>
                      <p className="text-3xl font-bold text-slate-800">{pendingOrders}</p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-md shadow-orange-500/30">
                      <Clock className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>

                {/* In Delivery */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500 mb-1">{t('inDelivery')}</p>
                      <p className="text-3xl font-bold text-slate-800">{inDeliveryOrders}</p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/30">
                      <Truck className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>

                {/* Delivered */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500 mb-1">{t('delivered')}</p>
                      <p className="text-3xl font-bold text-slate-800">{deliveredOrders}</p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/30">
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>

                {/* Active Delivery Persons */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500 mb-1">{t('activeDeliveryPersons')}</p>
                      <p className="text-3xl font-bold text-slate-800">{activeDeliveryPersons}</p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md shadow-purple-500/30">
                      <Truck className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>

                {/* Total Revenue */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500 mb-1">{t('totalRevenue')}</p>
                      <p className="text-3xl font-bold text-slate-800">{totalRevenue.toFixed(2)} <span className="text-lg text-slate-500">{t('currency')}</span></p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-md shadow-green-500/30">
                      <TrendingUp className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Navigation Cards */}
          <h3 className="text-lg font-bold text-slate-800 mb-4">{t('quickAccess')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link
              to="/delivery-persons"
              className="group bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md hover:border-blue-300/40 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-5">
                <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-md shadow-blue-500/30 group-hover:shadow-lg group-hover:shadow-blue-500/40 transition-all">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 mb-1.5 group-hover:text-blue-600 transition-colors">{t('deliveryPersons')}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{t('manageDeliveryPersonnel')}</p>
                </div>
              </div>
            </Link>

            <Link
              to="/orders"
              className="bg-white overflow-hidden shadow-sm border border-slate-200/60 rounded-2xl hover:shadow-lg hover:border-slate-300/60 transition-all duration-200 group"
            >
              <div className="p-8">
                <div className="flex items-center gap-5">
                  <div className="flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 shadow-md shadow-amber-500/30 group-hover:shadow-lg group-hover:shadow-amber-500/40 transition-all">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-1.5 group-hover:text-amber-600 transition-colors">{t('orders')}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{t('viewAndAssignOrders')}</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              to="/products"
              className="bg-white overflow-hidden shadow-sm border border-slate-200/60 rounded-2xl hover:shadow-lg hover:border-slate-300/60 transition-all duration-200 group"
            >
              <div className="p-8">
                <div className="flex items-center gap-5">
                  <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 shadow-md shadow-green-500/30 group-hover:shadow-lg group-hover:shadow-green-500/40 transition-all">
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-1.5 group-hover:text-green-600 transition-colors">{t('products')}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{t('manageProducts')}</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              to="/pos"
              className="bg-white overflow-hidden shadow-sm border border-slate-200/60 rounded-2xl hover:shadow-lg hover:border-slate-300/60 transition-all duration-200 group"
            >
              <div className="p-8">
                <div className="flex items-center gap-5">
                  <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 shadow-md shadow-purple-500/30 group-hover:shadow-lg group-hover:shadow-purple-500/40 transition-all">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-1.5 group-hover:text-purple-600 transition-colors">{t('pointOfSale')}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{t('createOrders')}</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
