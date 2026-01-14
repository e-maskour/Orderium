import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  UserCircle,
  Truck,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  const location = useLocation();
  const { t } = useLanguage();

  const menuItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      label: t('dashboard'),
    },
    {
      path: '/orders',
      icon: ShoppingCart,
      label: t('orders'),
    },
    {
      path: '/invoices',
      icon: FileText,
      label: t('invoices'),
    },
    {
      path: '/products',
      icon: Package,
      label: t('products'),
    },
    {
      path: '/customers',
      icon: UserCircle,
      label: t('customers'),
    },
    {
      path: '/fournisseurs',
      icon: Truck,
      label: t('suppliers'),
    },
    {
      path: '/delivery-persons',
      icon: Users,
      label: t('deliveryPersons'),
    },
    {
      path: '/pos',
      icon: CreditCard,
      label: t('pointOfSale'),
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-slate-200 transition-all duration-300 z-20 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg shadow-lg flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)'}}>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
              <span className="text-xl font-bold text-white relative z-10">O</span>
            </div>
            <span className="font-bold text-lg text-slate-800">Orderium</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-10 h-10 rounded-lg shadow-lg flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)'}}>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
              <span className="text-xl font-bold text-white relative z-10">O</span>
            </div>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        )}
      </button>

      {/* Navigation Menu */}
      <nav className="mt-6 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-amber-50 text-amber-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`flex-shrink-0 ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} ${
                      isActive ? 'text-amber-600' : 'text-slate-500 group-hover:text-slate-700'
                    }`}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="font-medium text-sm">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section - Optional */}
      {!isCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-900 mb-1">
              {t('adminBackoffice')}
            </p>
            <p className="text-xs text-amber-700">v1.0.0</p>
          </div>
        </div>
      )}
    </aside>
  );
};
