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

const iconSize = (collapsed: boolean) => ({
  width: collapsed ? '1.25rem' : '1rem',
  height: collapsed ? '1.25rem' : '1rem',
  flexShrink: 0,
});

export const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  const location = useLocation();
  const { t, language } = useLanguage();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const isRtl = language === 'ar';

  useEffect(() => {
    const menuGroups = [
      { key: 'ventes', submenu: ['/devis', '/bons-livraison', '/factures/vente', '/paiements-vente', '/customers'] },
      { key: 'achats', submenu: ['/demande-prix', '/bon-achat', '/factures/achat', '/paiements-achat', '/fournisseurs'] },
      { key: 'products', submenu: ['/products', '/categories', '/warehouses', '/stock-movements', '/inventory-adjustments'] },
    ];
    menuGroups.forEach(menu => {
      if (menu.submenu.some(path => location.pathname.startsWith(path))) {
        if (!expandedMenus.includes(menu.key)) {
          setExpandedMenus(prev => [...prev, menu.key]);
        }
      }
    });
  }, [location.pathname]);

  const toggleMenu = (menuKey: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setExpandedMenus(prev =>
      prev.includes(menuKey) ? prev.filter(k => k !== menuKey) : [...prev, menuKey]
    );
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    {
      key: 'ventes', icon: TrendingUp, label: t('sales'),
      submenu: [
        { path: '/devis', icon: FileCheck, label: t('quote') },
        { path: '/bons-livraison', icon: PackageCheck, label: t('deliveryNote') },
        { path: '/factures/vente', icon: FileText, label: t('salesInvoice') },
        { path: '/paiements-vente', icon: Wallet, label: t('payments') },
        { path: '/customers', icon: UserCircle, label: t('clients') },
      ],
    },
    {
      key: 'achats', icon: TrendingDown, label: t('purchases'),
      submenu: [
        { path: '/demande-prix', icon: DollarSign, label: t('priceRequest') },
        { path: '/bon-achat', icon: ShoppingBag, label: t('purchaseOrder') },
        { path: '/factures/achat', icon: Receipt, label: t('purchaseInvoice') },
        { path: '/paiements-achat', icon: Wallet, label: t('payments') },
        { path: '/fournisseurs', icon: Truck, label: t('suppliers') },
      ],
    },
    { path: '/orders', icon: ShoppingCart, label: t('orders') },
    {
      key: 'products', icon: Package, label: t('products'),
      submenu: [
        { path: '/products', icon: Package, label: t('products') },
        { path: '/categories', icon: FolderTree, label: t('categories') },
        { path: '/warehouses', icon: Building2, label: t('warehouses') },
        { path: '/stock-movements', icon: TrendingUp, label: t('stockMovements') },
        { path: '/inventory-adjustments', icon: FileCheck, label: t('inventoryAdjustments') },
      ],
    },
    { path: '/delivery-persons', icon: Users, label: t('deliveryPersons') },
    { path: '/pos', icon: CreditCard, label: t('pointOfSale') },
    { path: '/configurations', icon: Settings, label: t('configurations') },
  ];

  const activeColor = '#d97706';
  const activeBg = '#fffbeb';

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        [isRtl ? 'right' : 'left']: 0,
        height: '100vh',
        width: isCollapsed ? '5rem' : '16rem',
        background: '#fff',
        borderInlineEnd: '1px solid #e2e8f0',
        transition: 'width 0.3s',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <div
        className="flex align-items-center justify-content-between flex-shrink-0"
        style={{ height: '4rem', padding: '0 0.75rem', borderBottom: '1px solid #e2e8f0' }}
      >
        {!isCollapsed ? (
          <div className="flex align-items-center gap-2">
            <div
              className="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
              style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #dd7c1a, #c86b14)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            >
              <span className="font-bold text-white" style={{ fontSize: '1.25rem' }}>O</span>
            </div>
            <span className="font-bold" style={{ fontSize: '1.125rem', color: '#1e293b' }}>Orderium</span>
          </div>
        ) : (
          <div className="flex justify-content-center w-full">
            <div
              className="flex align-items-center justify-content-center border-round-lg"
              style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #dd7c1a, #c86b14)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            >
              <span className="font-bold text-white" style={{ fontSize: '1.25rem' }}>O</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden sm:flex"
        style={{
          position: 'absolute',
          [isRtl ? 'left' : 'right']: '-0.75rem',
          top: '5rem',
          width: '1.5rem',
          height: '1.5rem',
          borderRadius: '50%',
          background: '#fff',
          border: '1px solid #e2e8f0',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          zIndex: 21,
        }}
      >
        {(isRtl ? !isCollapsed : isCollapsed) ? (
          <ChevronRight style={{ width: '1rem', height: '1rem', color: '#475569' }} />
        ) : (
          <ChevronLeft style={{ width: '1rem', height: '1rem', color: '#475569' }} />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto" style={{ marginTop: '1rem', padding: '0 0.5rem' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;

            if ('submenu' in item && item.submenu) {
              const isExpanded = expandedMenus.includes(item.key);
              const hasActiveChild = item.submenu.some(sub => location.pathname.startsWith(sub.path));

              return (
                <li key={item.key} style={{ marginBottom: '0.25rem' }}>
                  <button
                    onClick={() => toggleMenu(item.key)}
                    className="w-full flex align-items-center border-round-lg"
                    style={{
                      gap: isCollapsed ? 0 : '0.5rem',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      padding: '0.5rem 0.75rem',
                      background: hasActiveChild ? activeBg : 'transparent',
                      color: hasActiveChild ? activeColor : '#475569',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon style={{ ...iconSize(isCollapsed), color: hasActiveChild ? activeColor : '#64748b' }} />
                    {!isCollapsed && (
                      <>
                        <span className="font-medium flex-1" style={{ fontSize: '0.875rem', textAlign: isRtl ? 'right' : 'left' }}>{item.label}</span>
                        <ChevronDown style={{
                          width: '0.875rem', height: '0.875rem', flexShrink: 0,
                          transition: 'transform 0.2s',
                          transform: isRtl
                            ? (isExpanded ? 'rotate(0deg)' : 'rotate(90deg)')
                            : (isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'),
                        }} />
                      </>
                    )}
                  </button>

                  {!isCollapsed && isExpanded && (
                    <ul style={{
                      listStyle: 'none', padding: 0, margin: '0.25rem 0 0 0',
                      [isRtl ? 'marginRight' : 'marginLeft']: '1rem',
                      [isRtl ? 'borderRight' : 'borderLeft']: '2px solid #e2e8f0',
                      [isRtl ? 'paddingRight' : 'paddingLeft']: '0.75rem',
                    }}>
                      {item.submenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isActive = location.pathname.startsWith(subItem.path);
                        return (
                          <li key={subItem.path} style={{ marginBottom: '0.125rem' }}>
                            <Link
                              to={subItem.path}
                              className="flex align-items-center gap-2 border-round-lg no-underline"
                              style={{
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                background: isActive ? activeBg : 'transparent',
                                color: isActive ? activeColor : '#475569',
                                transition: 'background 0.2s',
                              }}
                            >
                              <SubIcon style={{ width: '0.875rem', height: '0.875rem', flexShrink: 0, color: isActive ? activeColor : '#94a3b8' }} />
                              <span className="flex-1" style={{ textAlign: isRtl ? 'right' : 'left' }}>{subItem.label}</span>
                              {isActive && <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: activeColor, flexShrink: 0 }} />}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            const isActive = location.pathname === item.path;
            return (
              <li key={item.path} style={{ marginBottom: '0.25rem' }}>
                <Link
                  to={item.path}
                  className="flex align-items-center border-round-lg no-underline"
                  style={{
                    gap: isCollapsed ? 0 : '0.5rem',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    padding: '0.5rem 0.75rem',
                    background: isActive ? activeBg : 'transparent',
                    color: isActive ? activeColor : '#475569',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    transition: 'background 0.2s',
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon style={{ ...iconSize(isCollapsed), color: isActive ? activeColor : '#64748b' }} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1" style={{ textAlign: isRtl ? 'right' : 'left' }}>{item.label}</span>
                      {isActive && <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: activeColor, flexShrink: 0 }} />}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Info */}
      {!isCollapsed && (
        <div className="flex-shrink-0" style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
          <div className="border-round-lg" style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
            <p className="font-semibold" style={{ fontSize: '0.75rem', color: '#78350f', marginBottom: '0.25rem' }}>
              {t('adminBackoffice')}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#92400e' }}>v2.0.0</p>
          </div>
        </div>
      )}
    </aside>
  );
};
