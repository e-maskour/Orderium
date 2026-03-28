import { Link, useLocation } from 'react-router-dom';
import orderiumLogo from '../assets/logo-backoffice.svg';
import { useLanguage } from '../context/LanguageContext';
import { Tooltip } from 'primereact/tooltip';
import { Badge } from 'primereact/badge';
import { Ripple } from 'primereact/ripple';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Settings,
    UsersRound,
    TrendingUp,
    TrendingDown,
    ChevronLeft,
    ChevronRight,
    Store,
    Truck,
    HardDrive,
} from 'lucide-react';

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    isMobileDrawer?: boolean;
}

const NAV_ITEMS = [
    {
        id: 'sb-dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        label: 'Tableau de bord',
        activePaths: ['/dashboard'],
        exactFirst: true,
    },
    {
        id: 'sb-commandes',
        to: '/orders',
        icon: ShoppingCart,
        label: 'Commandes',
        activePaths: ['/orders', '/checkout'],
        exactFirst: false,
    },
    {
        id: 'sb-pos',
        to: '/pos',
        icon: Store,
        label: 'Point de vente',
        activePaths: ['/pos'],
        exactFirst: false,
    },
    {
        id: 'sb-ventes',
        to: '/devis',
        icon: TrendingUp,
        label: 'Ventes',
        activePaths: ['/devis', '/bons-livraison', '/factures/vente', '/paiements-vente', '/customers'],
        exactFirst: false,
    },
    {
        id: 'sb-achats',
        to: '/demande-prix',
        icon: TrendingDown,
        label: 'Achats',
        activePaths: ['/demande-prix', '/bon-achat', '/factures/achat', '/paiements-achat', '/fournisseurs'],
        exactFirst: false,
    },
    {
        id: 'sb-stock',
        to: '/products',
        icon: Package,
        label: 'Stock',
        activePaths: ['/products', '/categories', '/warehouses', '/stock-movements', '/inventory-adjustments'],
        exactFirst: false,
    },
    {
        id: 'sb-livreurs',
        to: '/delivery-persons',
        icon: Truck,
        label: 'Livreurs',
        activePaths: ['/delivery-persons'],
        exactFirst: false,
    },
    {
        id: 'sb-admin',
        to: '/users',
        icon: UsersRound,
        label: 'Équipe',
        activePaths: ['/users', '/roles'],
        exactFirst: false,
    },
    {
        id: 'sb-drive',
        to: '/drive',
        icon: HardDrive,
        label: 'Drive',
        activePaths: ['/drive'],
        exactFirst: false,
    },
    {
        id: 'sb-config',
        to: '/configurations',
        icon: Settings,
        label: 'Paramètres',
        activePaths: ['/configurations'],
        exactFirst: false,
    },
] as const;

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileDrawer = false }: SidebarProps) => {
    const location = useLocation();
    const { language } = useLanguage();
    const isRtl = language === 'ar';

    const isActive = (item: typeof NAV_ITEMS[number]) => {
        if (item.exactFirst) return location.pathname === item.activePaths[0];
        return item.activePaths.some(
            (p) => location.pathname === p || location.pathname.startsWith(p + '/')
        );
    };

    return (
        <aside
            className="sidebar-enterprise"
            style={{
                position: isMobileDrawer ? 'relative' : 'fixed',
                top: isMobileDrawer ? undefined : 0,
                [isRtl ? 'right' : 'left']: isMobileDrawer ? undefined : 0,
                height: isMobileDrawer ? '100%' : '100vh',
                width: isMobileDrawer ? '100%' : (isCollapsed ? '4.5rem' : '14rem'),
                background: 'linear-gradient(195deg, #0f172a 0%, #111827 50%, #0f1e3c 100%)',
                transition: isMobileDrawer ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: isMobileDrawer ? undefined : 20,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isMobileDrawer ? 'none' : '4px 0 32px rgba(0,0,0,0.22)',
                overflow: 'hidden',
            }}
        >
            {/* ── Logo bar ─────────────────────────────────── */}
            <div style={{
                height: '4.25rem',
                padding: isCollapsed ? '0 0.75rem' : '0 0.875rem 0 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                        src={orderiumLogo}
                        alt="Morocom"
                        style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0 }}
                    />
                    {!isCollapsed && (
                        <div>
                            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Morocom</div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Enterprise</div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Navigation ───────────────────────────────── */}
            <nav style={{
                flex: 1,
                padding: isCollapsed ? '0.75rem 0.5rem' : '0.75rem 0.625rem',
                overflowY: 'auto', overflowX: 'hidden',
                scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent',
            }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item);
                        const Icon = item.icon;
                        return (
                            <li key={item.id}>
                                <Link
                                    to={item.to}
                                    id={item.id}
                                    className={`sb-link p-ripple ${active ? 'sb-link--active' : ''}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isCollapsed ? 0 : '0.75rem',
                                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                                        padding: isCollapsed ? '0.6875rem' : '0.5625rem 0.625rem',
                                        background: active ? 'rgba(35,90,228,0.18)' : 'transparent',
                                        color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
                                        fontWeight: active ? 600 : 450,
                                        fontSize: '0.8125rem',
                                        borderRadius: '0.5rem',
                                        transition: 'all 0.15s ease',
                                        position: 'relative',
                                        textDecoration: 'none',
                                    }}
                                >
                                    {active && (
                                        <span style={{
                                            position: 'absolute',
                                            [isRtl ? 'right' : 'left']: '-0.625rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: '0.1875rem',
                                            height: '1.25rem',
                                            borderRadius: '0 0.25rem 0.25rem 0',
                                            background: '#235ae4',
                                            boxShadow: '0 0 8px rgba(35,90,228,0.6)',
                                        }} />
                                    )}
                                    <span style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '1.875rem', height: '1.875rem',
                                        borderRadius: '0.4375rem', flexShrink: 0,
                                        background: active ? 'rgba(35,90,228,0.22)' : 'transparent',
                                    }}>
                                        <Icon style={{ width: 16, height: 16 }} strokeWidth={active ? 2.25 : 1.75} />
                                    </span>
                                    {!isCollapsed && (
                                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.label}
                                        </span>
                                    )}
                                    <Ripple />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Tooltip for collapsed mode */}
            {isCollapsed && (
                <Tooltip
                    target={NAV_ITEMS.map((i) => `#${i.id}`).join(',')}
                    position={isRtl ? 'left' : 'right'}
                />
            )}

            {/* ── Version badge ─────────────────────────────── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: isCollapsed ? '0.625rem 0.375rem' : '0.625rem 0.75rem', flexShrink: 0 }}>
                {!isCollapsed ? (
                    <div style={{
                        padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                        background: 'rgba(35,90,228,0.07)', border: '1px solid rgba(35,90,228,0.14)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>Orderium ERP</div>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>v2.0.0 PRO</div>
                        </div>
                        <Badge value="PRO" severity="info" style={{ fontSize: '0.5rem' }} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Badge value="P" severity="info" style={{ fontSize: '0.5rem' }} />
                    </div>
                )}
            </div>

            {/* ── Collapse button ───────────────────────────── */}
            <div className="hidden lg:flex" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: isCollapsed ? '0.5rem 0.375rem' : '0.5rem 0.625rem', flexShrink: 0 }}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="sb-collapse-btn sb-collapse-bottom"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '0.5rem',
                        width: '100%', padding: isCollapsed ? '0.5rem' : '0.5rem 0.625rem',
                        borderRadius: '0.5rem',
                        background: 'transparent', border: 'none',
                        color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 500,
                        transition: 'all 0.15s ease',
                    }}
                >
                    <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '1.5rem', height: '1.5rem', borderRadius: '0.375rem',
                        border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
                    }}>
                        {isCollapsed
                            ? (isRtl ? <ChevronLeft style={{ width: '0.75rem', height: '0.75rem' }} /> : <ChevronRight style={{ width: '0.75rem', height: '0.75rem' }} />)
                            : (isRtl ? <ChevronRight style={{ width: '0.75rem', height: '0.75rem' }} /> : <ChevronLeft style={{ width: '0.75rem', height: '0.75rem' }} />)
                        }
                    </span>
                    {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Réduire</span>}
                </button>
            </div>

            <style>{`
                .sb-link:hover { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.92) !important; }
                .sb-link--active:hover { background: rgba(35,90,228,0.22) !important; }
                .sb-collapse-btn:hover { background: rgba(255,255,255,0.08) !important; color: rgba(255,255,255,0.7) !important; }
                .sb-collapse-bottom:hover { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.7) !important; }
                .sidebar-enterprise nav::-webkit-scrollbar { width: 3px; }
                .sidebar-enterprise nav::-webkit-scrollbar-track { background: transparent; }
                .sidebar-enterprise nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
            `}</style>
        </aside>
    );
};
