import { ReactNode, useState } from 'react';
import { Sidebar as AppSidebar } from './Sidebar';
import { Header } from './Header';
import { Sidebar } from 'primereact/sidebar';
import { useLanguage } from '../context/LanguageContext';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, TrendingUp, MoreHorizontal } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

interface MobileTab {
  path: string;
  icon: React.ComponentType<{ style?: React.CSSProperties; strokeWidth?: number }>;
  labelKey: string;
  activePaths: string[];
  exactMatch?: boolean;
}

const MOBILE_TABS: MobileTab[] = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    labelKey: 'navBoard',
    activePaths: ['/dashboard'],
    exactMatch: true,
  },
  {
    path: '/orders',
    icon: ShoppingCart,
    labelKey: 'orders',
    activePaths: ['/orders', '/pos', '/checkout', '/caisse'],
  },
  {
    path: '/products',
    icon: Package,
    labelKey: 'navInventory',
    activePaths: [
      '/products',
      '/categories',
      '/warehouses',
      '/stock-movements',
      '/inventory-adjustments',
    ],
  },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { language, t } = useLanguage();
  const location = useLocation();
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const isTabActive = (tab: MobileTab) => {
    if (tab.exactMatch) return location.pathname === tab.path;
    return tab.activePaths.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + '/'),
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }} dir={dir}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      </div>

      {/* Mobile Sidebar Drawer */}
      <Sidebar
        visible={isMobileSidebarOpen}
        onHide={() => setIsMobileSidebarOpen(false)}
        position={language === 'ar' ? 'right' : 'left'}
        modal
        className="lg:hidden"
        style={{ width: '17rem', padding: 0 }}
        showCloseIcon={false}
        pt={{
          root: { style: { padding: 0 } },
          header: { style: { display: 'none' } },
          content: {
            style: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' },
          },
        }}
      >
        <AppSidebar
          isCollapsed={false}
          setIsCollapsed={() => setIsMobileSidebarOpen(false)}
          isMobileDrawer
        />
      </Sidebar>

      {/* Main Content */}
      <div
        style={
          {
            transition: 'margin 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '--sidebar-width': isSidebarCollapsed ? '4.5rem' : '15rem',
            ...(language === 'ar'
              ? { marginRight: isSidebarCollapsed ? '4.5rem' : '15rem', marginLeft: '0.75rem' }
              : { marginLeft: isSidebarCollapsed ? '4.5rem' : '15rem', marginRight: '0.75rem' }),
          } as React.CSSProperties & Record<string, string>
        }
        className="admin-main-content"
      >
        <Header
          isSidebarOpen={isMobileSidebarOpen}
          onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main
          className="admin-main-area"
          style={{ maxWidth: '100%', minHeight: 'calc(100vh - 4.25rem)' }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="mobile-bottom-nav lg:hidden" aria-label="Navigation mobile">
        {MOBILE_TABS.map((tab) => {
          const active = isTabActive(tab);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.1875rem',
                flex: 1,
                padding: '0.5rem 0.25rem',
                color: active ? '#235ae4' : '#94a3b8',
                textDecoration: 'none',
                transition: 'color 0.15s',
                position: 'relative',
              }}
            >
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '2rem',
                    height: '0.1875rem',
                    borderRadius: '0 0 0.25rem 0.25rem',
                    background: '#235ae4',
                  }}
                />
              )}
              <tab.icon style={{ width: 22, height: 22 }} strokeWidth={active ? 2.25 : 1.75} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: active ? 700 : 500,
                  lineHeight: 1.2,
                  textAlign: 'center',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t(tab.labelKey)}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.1875rem',
            flex: 1,
            padding: '0.5rem 0.25rem',
            color: '#94a3b8',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <MoreHorizontal style={{ width: 22, height: 22 }} strokeWidth={1.75} />
          <span style={{ fontSize: '11px', fontWeight: 500, lineHeight: 1.2 }}>{t('navMore')}</span>
        </button>
      </nav>

      <style>{`
        @media (max-width: 1023px) {
          .admin-main-content { margin-left: 0 !important; margin-right: 0 !important; --sidebar-width: 0px !important; }
        }
        .admin-main-area { padding: 1.25rem 1.5rem; }
        @media (max-width: 1023px) {
          .admin-main-area { padding: 1rem 0.75rem calc(5.5rem + env(safe-area-inset-bottom)); }
        }
        @media (max-width: 639px) {
          .admin-main-area { padding: 0.75rem 0.625rem calc(5.5rem + env(safe-area-inset-bottom)); }
        }
        .page-container { max-width: 1600px; margin: 0 auto; width: 100%; }
        .mobile-bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0;
          height: calc(3.5rem + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
          background: #ffffff; border-top: 1px solid #e2e8f0;
          display: flex; align-items: stretch; z-index: 30;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }
      `}</style>
    </div>
  );
};
