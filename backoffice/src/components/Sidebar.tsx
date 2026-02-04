import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
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
  ChevronDown,
  TrendingUp,
  TrendingDown,
  FileCheck,
  PackageCheck,
  Receipt,
  ShoppingBag,
  DollarSign,
  Wallet,
  Settings,
  Building2,
  FolderTree,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  const location = useLocation();
  const { t, language } = useLanguage();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Auto-expand menu when a submenu item is active
  useEffect(() => {
    const menuItems = [
      {
        key: 'ventes',
        submenu: ['/devis', '/bons-livraison', '/factures/vente', '/paiements-vente', '/customers'],
      },
      {
        key: 'achats',
        submenu: ['/demande-prix', '/bon-achat', '/factures/achat', '/paiements-achat', '/fournisseurs'],
      },
      {
        key: 'products',
        submenu: ['/products', '/categories', '/warehouses', '/stock-movements', '/inventory-adjustments'],
      },
    ];

    menuItems.forEach(menu => {
      if (menu.submenu.some(path => location.pathname.startsWith(path))) {
        if (!expandedMenus.includes(menu.key)) {
          setExpandedMenus(prev => [...prev, menu.key]);
        }
      }
    });
  }, [location.pathname]);

  const toggleMenu = (menuKey: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    setExpandedMenus(prev => 
      prev.includes(menuKey) 
        ? prev.filter(key => key !== menuKey)
        : [...prev, menuKey]
    );
  };

  const handleSidebarItemClick = () => {
    // Close mobile drawer when clicking on a menu item (but not on expand/collapse buttons)
    // This will be triggered by link navigation in mobile drawer context
  };

  const menuItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      label: t('dashboard'),
    },
    {
      key: 'ventes',
      icon: TrendingUp,
      label: t('sales'),
      submenu: [
        {
          path: '/devis',
          icon: FileCheck,
          label: t('quote'),
        },
        {
          path: '/bons-livraison',
          icon: PackageCheck,
          label: t('deliveryNote'),
        },
        {
          path: '/factures/vente',
          icon: FileText,
          label: t('salesInvoice'),
        },
        {
          path: '/paiements-vente',
          icon: Wallet,
          label: t('payments'),
        },
        {
          path: '/customers',
          icon: UserCircle,
          label: t('clients'),
        },
      ],
    },
    {
      key: 'achats',
      icon: TrendingDown,
      label: t('purchases'),
      submenu: [
        {
          path: '/demande-prix',
          icon: DollarSign,
          label: t('priceRequest'),
        },
        {
          path: '/bon-achat',
          icon: ShoppingBag,
          label: t('purchaseOrder'),
        },
        {
          path: '/factures/achat',
          icon: Receipt,
          label: t('purchaseInvoice'),
        },
        {
          path: '/paiements-achat',
          icon: Wallet,
          label: t('payments'),
        },
        {
          path: '/fournisseurs',
          icon: Truck,
          label: t('suppliers'),
        },
      ],
    },
    {
      path: '/orders',
      icon: ShoppingCart,
      label: t('orders'),
    },
    {
      key: 'products',
      icon: Package,
      label: t('products'),
      submenu: [
        {
          path: '/products',
          icon: Package,
          label: t('products'),
        },
        {
          path: '/categories',
          icon: FolderTree,
          label: t('categories'),
        },
        {
          path: '/warehouses',
          icon: Building2,
          label: t('warehouses'),
        },
        {
          path: '/stock-movements',
          icon: TrendingUp,
          label: t('stockMovements'),
        },
        {
          path: '/inventory-adjustments',
          icon: FileCheck,
          label: t('inventoryAdjustments'),
        },
      ],
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
    {
      path: '/configurations',
      icon: Settings,
      label: t('configurations'),
    },
  ];

  return (
    <aside
      className={`fixed top-0 ${language === 'ar' ? 'right-0' : 'left-0'} h-screen bg-white transition-all duration-300 z-20 flex flex-col
        ${isCollapsed ? 'w-16 sm:w-20' : 'w-64'}
        ${language === 'ar' ? 'border-l' : 'border-r'} border-slate-200`}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-2 sm:px-4 border-b border-slate-200 flex-shrink-0">
        {!isCollapsed && (
          <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg shadow-lg flex items-center justify-center relative overflow-hidden flex-shrink-0" style={{background: 'linear-gradient(to bottom right, #dd7c1a, #c86b14)'}}>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
              <span className="text-lg sm:text-xl font-bold text-white relative z-10">O</span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-800">Orderium</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg shadow-lg flex items-center justify-center relative overflow-hidden flex-shrink-0" style={{background: 'linear-gradient(to bottom right, #dd7c1a, #c86b14)'}}>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
              <span className="text-lg sm:text-xl font-bold text-white relative z-10">O</span>
            </div>
          </div>
        )}
      </div>

      {/* Toggle Button - Hide on mobile */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`hidden sm:flex absolute ${language === 'ar' ? '-left-3' : '-right-3'} top-20 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center hover:bg-slate-50 transition-colors shadow-sm`}
      >
        {language === 'ar' ? (
          isCollapsed ? (
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-600" />
          )
        ) : (
          isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          )
        )}
      </button>

      {/* Navigation Menu */}
      <nav className="mt-4 sm:mt-6 px-2 sm:px-3 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            
            // Handle menu items with submenu
            if ('submenu' in item && item.submenu) {
              const isExpanded = expandedMenus.includes(item.key);
              const hasActiveChild = item.submenu.some(sub => location.pathname.startsWith(sub.path));

              return (
                <li key={item.key}>
                  <button
                    onClick={() => toggleMenu(item.key)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 sm:gap-3'} px-2 sm:px-3 py-2 sm:py-3 rounded-lg transition-all group ${
                      hasActiveChild
                        ? 'bg-amber-50 text-amber-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {language !== 'ar' && (
                      <Icon
                        className={`flex-shrink-0 ${isCollapsed ? 'w-5 sm:w-6 h-5 sm:h-6' : 'w-4 sm:w-5 h-4 sm:h-5'} ${
                          hasActiveChild ? 'text-amber-600' : 'text-slate-500 group-hover:text-slate-700'
                        }`}
                      />
                    )}
                    {!isCollapsed && (
                      <>
                        <span className={`font-medium text-xs sm:text-sm flex-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{item.label}</span>
                        <ChevronDown
                          className={`w-3 sm:w-4 h-3 sm:h-4 transition-transform flex-shrink-0 ${
                            language === 'ar'
                              ? (isExpanded ? 'rotate-0' : '-rotate-90')
                              : (isExpanded ? 'rotate-180' : 'rotate-0')
                          }`}
                        />
                      </>
                    )}
                    {language === 'ar' && (
                      <Icon
                        className={`flex-shrink-0 ${isCollapsed ? 'w-5 sm:w-6 h-5 sm:h-6' : 'w-4 sm:w-5 h-4 sm:h-5'} ${
                          hasActiveChild ? 'text-amber-600' : 'text-slate-500 group-hover:text-slate-700'
                        }`}
                      />
                    )}
                  </button>
                  
                  {/* Submenu */}
                  {!isCollapsed && isExpanded && (
                    <ul className={`mt-1 ${language === 'ar' ? 'mr-2 sm:mr-4 border-r-2' : 'ml-2 sm:ml-4 border-l-2'} space-y-1 border-slate-200 ${language === 'ar' ? 'pr-2 sm:pr-4' : 'pl-2 sm:pl-4'}`}>
                      {item.submenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isActive = location.pathname.startsWith(subItem.path);
                        
                        return (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all group text-xs sm:text-sm ${
                                isActive
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              {language !== 'ar' && (
                                <SubIcon
                                  className={`flex-shrink-0 w-3 sm:w-4 h-3 sm:h-4 ${
                                    isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-600'
                                  }`}
                                />
                              )}
                              <span className={`font-medium flex-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{subItem.label}</span>
                              {isActive && (
                                <div className="flex-shrink-0 w-1 sm:w-1.5 h-1 sm:h-1.5 bg-amber-600 rounded-full"></div>
                              )}
                              {language === 'ar' && (
                                <SubIcon
                                  className={`flex-shrink-0 w-3 sm:w-4 h-3 sm:h-4 ${
                                    isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-600'
                                  }`}
                                />
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            // Handle regular menu items
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 sm:gap-3'} px-2 sm:px-3 py-2 sm:py-3 rounded-lg transition-all group ${
                    isActive
                      ? 'bg-amber-50 text-amber-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {language !== 'ar' && (
                    <Icon
                      className={`flex-shrink-0 ${isCollapsed ? 'w-5 sm:w-6 h-5 sm:h-6' : 'w-4 sm:w-5 h-4 sm:h-5'} ${
                        isActive ? 'text-amber-600' : 'text-slate-500 group-hover:text-slate-700'
                      }`}
                    />
                  )}
                  {!isCollapsed && (
                    <>
                      <span className={`font-medium text-xs sm:text-sm flex-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{item.label}</span>
                      {isActive && (
                        <div className="flex-shrink-0 w-1 sm:w-1.5 h-1 sm:h-1.5 bg-amber-600 rounded-full"></div>
                      )}
                    </>
                  )}
                  {language === 'ar' && (
                    <Icon
                      className={`flex-shrink-0 ${isCollapsed ? 'w-5 sm:w-6 h-5 sm:h-6' : 'w-4 sm:w-5 h-4 sm:h-5'} ${
                        isActive ? 'text-amber-600' : 'text-slate-500 group-hover:text-slate-700'
                      }`}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section - Optional */}
      {!isCollapsed && (
        <div className={`flex-shrink-0 p-2 sm:p-4 border-t border-slate-200 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-2 sm:p-3">
            <p className="text-xs font-semibold text-amber-900 mb-1">
              {t('adminBackoffice')}
            </p>
            <p className="text-xs text-amber-700">v2.0.0</p>
          </div>
        </div>
      )}
    </aside>
  );
};
