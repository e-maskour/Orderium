import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMemo } from 'react';
import { Tooltip } from 'primereact/tooltip';
import { Badge } from 'primereact/badge';
import { Ripple } from 'primereact/ripple';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    CreditCard,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Settings,
    HardDrive,
    Shield,
    UsersRound,
} from 'lucide-react';

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
}

const ICON_SIZE = 18;
const COLLAPSED_ICON_SIZE = 20;

export const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
    const location = useLocation();
    const { t, language } = useLanguage();
    const isRtl = language === 'ar';

    // Groups that own sub-paths — used to highlight the sidebar item when inside a group
    const groupPaths: Record<string, string[]> = {
        '/devis': ['/devis', '/bons-livraison', '/factures/vente', '/paiements-vente', '/customers'],
        '/demande-prix': ['/demande-prix', '/bon-achat', '/factures/achat', '/paiements-achat', '/fournisseurs'],
        '/products': ['/products', '/categories', '/warehouses', '/stock-movements', '/inventory-adjustments'],
    };

    const isGroupActive = (groupRoot: string) =>
        groupPaths[groupRoot]?.some(p => location.pathname.startsWith(p)) ?? false;

    const menuItems = useMemo(() => [
        { path: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
        { path: '/devis', icon: TrendingUp, label: t('sales'), groupRoot: true },
        { path: '/demande-prix', icon: TrendingDown, label: t('purchases'), groupRoot: true },
        { path: '/orders', icon: ShoppingCart, label: t('orders') },
        { path: '/products', icon: Package, label: t('products'), groupRoot: true },
        { path: '/drive', icon: HardDrive, label: t('drive') },
        { path: '/delivery-persons', icon: Users, label: t('deliveryPersons') },
        { path: '/pos', icon: CreditCard, label: t('pointOfSale') },
        { path: '/users', icon: UsersRound, label: t('usersManagement') },
        { path: '/roles', icon: Shield, label: t('rolesManagement') },
        { path: '/configurations', icon: Settings, label: t('configurations') },
    ], [t]);

    return (
        <aside
            className="sidebar-enterprise"
            style={{
                position: 'fixed',
                top: 0,
                [isRtl ? 'right' : 'left']: 0,
                height: '100vh',
                width: isCollapsed ? '4.5rem' : '16.5rem',
                background: 'linear-gradient(195deg, #0f172a 0%, #111827 50%, #0f1e3c 100%)',
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden',
            }}
        >
            <div
                className="flex align-items-center flex-shrink-0"
                style={{
                    height: '4.25rem',
                    padding: isCollapsed ? '0 0.75rem' : '0 0.875rem 0 1.25rem',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <div className="flex align-items-center gap-3">
                    <div
                        className="flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                            width: '2.25rem',
                            height: '2.25rem',
                            borderRadius: '0.625rem',
                            background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                            boxShadow: '0 4px 12px rgba(35, 90, 228, 0.4)',
                        }}
                    >
                        <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>O</span>
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-column">
                            <span className="brand-name" style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                                Orderium
                            </span>
                            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-latin)' }}>
                                Enterprise
                            </span>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="hidden lg:flex"
                        title={t('collapse') || 'Collapse'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '1.75rem',
                            height: '1.75rem',
                            borderRadius: '0.4rem',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.45)',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'background 0.15s, color 0.15s',
                        }}
                    >
                        {isRtl
                            ? <ChevronRight style={{ width: '0.875rem', height: '0.875rem' }} />
                            : <ChevronLeft style={{ width: '0.875rem', height: '0.875rem' }} />}
                    </button>
                )}
                {isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="hidden lg:flex"
                        title={t('expand') || 'Expand'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '1.75rem',
                            height: '1.75rem',
                            borderRadius: '0.4rem',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.45)',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'background 0.15s, color 0.15s',
                        }}
                    >
                        {isRtl
                            ? <ChevronLeft style={{ width: '0.875rem', height: '0.875rem' }} />
                            : <ChevronRight style={{ width: '0.875rem', height: '0.875rem' }} />}
                    </button>
                )}
            </div>

            {/* Section Label */}
            {!isCollapsed && (
                <div style={{ padding: '1rem 1.25rem 0.5rem', opacity: 0.4 }}>
                    <span className="section-label" style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-latin)' }}>
                        {t('menu') || 'Menu'}
                    </span>
                </div>
            )}

            {/* Navigation */}
            <nav
                className="flex-1"
                style={{
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: isCollapsed ? '0.5rem 0.375rem' : '0.25rem 0.75rem',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                }}
            >
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const iconSz = isCollapsed ? COLLAPSED_ICON_SIZE : ICON_SIZE;
                        const isActive = item.groupRoot
                            ? isGroupActive(item.path)
                            : location.pathname === item.path;
                        return (
                            <li key={item.path} style={{ marginBottom: '0.125rem' }}>
                                <Link
                                    to={item.path}
                                    className={`flex align-items-center no-underline p-ripple ${isActive ? 'sidebar-active-item' : 'sidebar-menu-item'}`}
                                    data-pr-tooltip={isCollapsed ? item.label : undefined}
                                    data-pr-position={isRtl ? 'left' : 'right'}
                                    style={{
                                        gap: isCollapsed ? 0 : '0.75rem',
                                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                                        padding: isCollapsed ? '0.625rem' : '0.5rem 0.75rem',
                                        background: isActive ? 'rgba(35, 90, 228, 0.14)' : 'transparent',
                                        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
                                        fontWeight: isActive ? 600 : 500,
                                        fontSize: '0.8125rem',
                                        borderRadius: '0.5rem',
                                        transition: 'all 0.15s ease',
                                        position: 'relative',
                                    }}
                                >
                                    {isActive && (
                                        <div style={{
                                            position: 'absolute',
                                            [isRtl ? 'right' : 'left']: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: '0.1875rem',
                                            height: '1.25rem',
                                            borderRadius: '0 0.25rem 0.25rem 0',
                                            background: '#235ae4',
                                            boxShadow: '0 0 8px rgba(35, 90, 228, 0.5)',
                                        }} />
                                    )}
                                    <div
                                        className="flex align-items-center justify-content-center flex-shrink-0"
                                        style={{
                                            width: '2rem',
                                            height: '2rem',
                                            borderRadius: '0.375rem',
                                            background: isActive ? 'rgba(35, 90, 228, 0.18)' : 'transparent',
                                            transition: 'background 0.15s ease',
                                        }}
                                    >
                                        <Icon style={{ width: iconSz, height: iconSz }} strokeWidth={1.75} />
                                    </div>
                                    {!isCollapsed && (
                                        <>
                                            <span className="flex-1" style={{ textAlign: isRtl ? 'right' : 'left', whiteSpace: 'nowrap' }}>{item.label}</span>
                                            {isActive && (
                                                <div style={{
                                                    width: '0.3125rem',
                                                    height: '0.3125rem',
                                                    borderRadius: '50%',
                                                    background: '#ffffff',
                                                    boxShadow: '0 0 6px rgba(255, 255, 255, 0.4)',
                                                    flexShrink: 0,
                                                }} />
                                            )}
                                        </>
                                    )}
                                    <Ripple />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Tooltip for collapsed mode */}
            {isCollapsed && <Tooltip target=".sidebar-menu-item,.sidebar-active-item" />}

            {/* Bottom Section */}
            <div className="flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: isCollapsed ? '0.75rem 0.375rem' : '0.75rem' }}>
                {!isCollapsed ? (
                    <div
                        style={{
                            padding: '0.75rem',
                            borderRadius: '0.625rem',
                            background: 'rgba(35, 90, 228, 0.08)',
                            border: '1px solid rgba(35, 90, 228, 0.16)',
                        }}
                    >
                        <div className="flex align-items-center justify-content-between">
                            <div>
                                <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.125rem' }}>
                                    Orderium ERP
                                </p>
                                <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.35)' }}>v2.0.0</p>
                            </div>
                            <Badge value="PRO" severity="info" style={{ fontSize: '0.5625rem' }} />
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-content-center">
                        <Badge value="P" severity="info" style={{ fontSize: '0.5625rem' }} />
                    </div>
                )}
            </div>

            <style>{`
        .sidebar-menu-item:hover {
          background: rgba(255,255,255,0.06) !important;
          color: rgba(255,255,255,0.9) !important;
        }
        .sidebar-active-item:hover {
          background: rgba(35, 90, 228, 0.20) !important;
        }
        .sidebar-enterprise nav::-webkit-scrollbar {
          width: 3px;
        }
        .sidebar-enterprise nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-enterprise nav::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
      `}</style>
        </aside>
    );
};
