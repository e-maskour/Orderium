import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import orderiumLogo from '../assets/logo-backoffice.svg';
import { useLanguage } from '../context/LanguageContext';
import { Badge } from 'primereact/badge';
import { Ripple } from 'primereact/ripple';
import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard,
    FileCheck, PackageCheck, FileText, Wallet, UserCircle,
    DollarSign, ShoppingBag, Receipt, Truck,
    Package, FolderTree, Building2, ArrowLeftRight, SlidersHorizontal,
    ShoppingCart, Store, Banknote,
    UsersRound, Settings, HardDrive,
    ChevronLeft, ChevronRight, ChevronDown,
    TrendingUp, TrendingDown,
} from 'lucide-react';
import type { TranslationKey } from '../lib/i18n';

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    isMobileDrawer?: boolean;
}

interface FlatItem {
    kind: 'flat';
    id: string;
    to: string;
    icon: LucideIcon;
    labelKey?: TranslationKey;
    staticLabel?: string;
    activePaths: string[];
    exactMatch?: boolean;
}

interface GroupItem {
    kind: 'group';
    id: string;
    labelFr: string;
    labelAr: string;
    icon: LucideIcon;
    children: Omit<FlatItem, 'kind'>[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchPath(pathname: string, paths: string[], exact?: boolean): boolean {
    if (exact) return pathname === paths[0];
    return paths.some(p => pathname === p || pathname.startsWith(p + '/'));
}

// ── Nav data ─────────────────────────────────────────────────────────────────

const TOP_FLAT: FlatItem[] = [
    { kind: 'flat', id: 'sb-dashboard', to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard', activePaths: ['/dashboard'], exactMatch: true },
    { kind: 'flat', id: 'sb-orders', to: '/orders', icon: ShoppingCart, labelKey: 'orders', activePaths: ['/orders', '/checkout'] },
    { kind: 'flat', id: 'sb-caisse', to: '/caisse', icon: Banknote, labelKey: 'caisse', activePaths: ['/caisse'] },
    { kind: 'flat', id: 'sb-pos', to: '/pos', icon: Store, labelKey: 'navPos', activePaths: ['/pos'] },
];

const GROUPS: GroupItem[] = [
    {
        kind: 'group', id: 'grp-sales', labelFr: 'Ventes', labelAr: 'المبيعات', icon: TrendingUp,
        children: [
            { id: 'sb-devis', to: '/devis', icon: FileCheck, labelKey: 'quote', activePaths: ['/devis'] },
            { id: 'sb-bl', to: '/bons-livraison', icon: PackageCheck, labelKey: 'deliveryNote', activePaths: ['/bons-livraison'] },
            { id: 'sb-fv', to: '/factures/vente', icon: FileText, labelKey: 'salesInvoice', activePaths: ['/factures/vente'] },
            { id: 'sb-pv', to: '/paiements-vente', icon: Wallet, labelKey: 'payments', activePaths: ['/paiements-vente'] },
            { id: 'sb-customers', to: '/customers', icon: UserCircle, labelKey: 'clients', activePaths: ['/customers'] },
        ],
    },
    {
        kind: 'group', id: 'grp-purchases', labelFr: 'Achats', labelAr: 'المشتريات', icon: TrendingDown,
        children: [
            { id: 'sb-dp', to: '/demande-prix', icon: DollarSign, labelKey: 'priceRequest', activePaths: ['/demande-prix'] },
            { id: 'sb-ba', to: '/bon-achat', icon: ShoppingBag, labelKey: 'purchaseOrder', activePaths: ['/bon-achat'] },
            { id: 'sb-fa', to: '/factures/achat', icon: Receipt, labelKey: 'purchaseInvoice', activePaths: ['/factures/achat'] },
            { id: 'sb-pa', to: '/paiements-achat', icon: Wallet, labelKey: 'payments', activePaths: ['/paiements-achat'] },
            { id: 'sb-fournisseurs', to: '/fournisseurs', icon: Truck, labelKey: 'suppliers', activePaths: ['/fournisseurs'] },
        ],
    },
    {
        kind: 'group', id: 'grp-inventory', labelFr: 'Inventaire', labelAr: 'المخزون', icon: Package,
        children: [
            { id: 'sb-products', to: '/products', icon: Package, labelKey: 'products', activePaths: ['/products'] },
            { id: 'sb-cats', to: '/categories', icon: FolderTree, labelKey: 'categories', activePaths: ['/categories'] },
            { id: 'sb-wh', to: '/warehouses', icon: Building2, labelKey: 'warehouses', activePaths: ['/warehouses'] },
            { id: 'sb-sm', to: '/stock-movements', icon: ArrowLeftRight, labelKey: 'stockMovements', activePaths: ['/stock-movements'] },
            { id: 'sb-adj', to: '/inventory-adjustments', icon: SlidersHorizontal, labelKey: 'inventoryAdjustments', activePaths: ['/inventory-adjustments'] },
        ],
    },
];

const BOTTOM_FLAT: FlatItem[] = [
    { kind: 'flat', id: 'sb-delivery', to: '/delivery-persons', icon: Truck, labelKey: 'deliveryPersons', activePaths: ['/delivery-persons'] },
    { kind: 'flat', id: 'sb-users', to: '/users', icon: UsersRound, labelKey: 'navTeam', activePaths: ['/users', '/roles'] },
    { kind: 'flat', id: 'sb-drive', to: '/drive', icon: HardDrive, staticLabel: 'Drive', activePaths: ['/drive'] },
];

const PINNED: FlatItem = { kind: 'flat', id: 'sb-config', to: '/configurations', icon: Settings, labelKey: 'settings', activePaths: ['/configurations'] };

const LOCALSTORAGE_KEY = 'morocom_sidebar_open_group';

// ── Sub-components ────────────────────────────────────────────────────────────

function ActivePip({ isRtl }: { isRtl: boolean }) {
    return (
        <span style={{
            position: 'absolute',
            [isRtl ? 'right' : 'left']: 0,
            top: '50%', transform: 'translateY(-50%)',
            width: '0.1875rem', height: '1.125rem',
            borderRadius: isRtl ? '0.25rem 0 0 0.25rem' : '0 0.25rem 0.25rem 0',
            background: '#3b82f6',
            boxShadow: '0 0 6px rgba(59,130,246,0.55)',
        }} />
    );
}

interface FlatLinkProps {
    item: Omit<FlatItem, 'kind'>;
    isRtl: boolean;
    label: string;
    collapsed: boolean;
}
function FlatLink({ item, isRtl, label, collapsed }: FlatLinkProps) {
    const location = useLocation();
    const active = matchPath(location.pathname, item.activePaths, item.exactMatch);
    return (
        <Link
            to={item.to}
            id={item.id}
            className={`sb-link p-ripple${active ? ' sb-link--active' : ''}`}
            style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : '0.625rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '0.625rem' : '0.4375rem 0.5rem',
                borderRadius: '0.5rem',
                background: active ? 'rgba(59,130,246,0.16)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.62)',
                fontWeight: active ? 600 : 400,
                textDecoration: 'none',
                position: 'relative',
                transition: 'background 0.13s, color 0.13s',
                flexShrink: 0,
            }}
            title={collapsed ? label : undefined}
        >
            {active && <ActivePip isRtl={isRtl} />}
            <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', flexShrink: 0,
                background: active ? 'rgba(59,130,246,0.2)' : 'transparent',
            }}>
                <item.icon style={{ width: 16, height: 16 }} strokeWidth={active ? 2.2 : 1.75} />
            </span>
            {!collapsed && (
                <span style={{ flex: 1, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                </span>
            )}
            <Ripple />
        </Link>
    );
}

interface ChildLinkProps {
    child: Omit<FlatItem, 'kind'>;
    label: string;
    isRtl: boolean;
    inPopover?: boolean;
}
function ChildLink({ child, label, isRtl, inPopover }: ChildLinkProps) {
    const location = useLocation();
    const active = matchPath(location.pathname, child.activePaths, child.exactMatch);
    return (
        <Link
            to={child.to}
            className={`sb-link p-ripple${active ? ' sb-link--active' : ''}`}
            style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: inPopover ? '0.4375rem 0.75rem' : '0.375rem 0.5rem 0.375rem 1.25rem',
                borderRadius: '0.4375rem',
                background: active ? 'rgba(59,130,246,0.18)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.58)',
                fontWeight: active ? 600 : 400,
                textDecoration: 'none',
                position: 'relative',
                transition: 'background 0.13s, color 0.13s',
                whiteSpace: 'nowrap',
            }}
        >
            {active && !inPopover && <ActivePip isRtl={isRtl} />}
            {inPopover && active && (
                <span style={{ width: 3, height: '1rem', borderRadius: 2, background: '#3b82f6', flexShrink: 0 }} />
            )}
            <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '1.5rem', height: '1.5rem', borderRadius: '0.3125rem', flexShrink: 0,
            }}>
                <child.icon style={{ width: 14, height: 14 }} strokeWidth={active ? 2.2 : 1.75} />
            </span>
            <span style={{ fontSize: '0.8125rem' }}>{label}</span>
            <Ripple />
        </Link>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileDrawer = false }: SidebarProps) => {
    const { language, t } = useLanguage();
    const isRtl = language === 'ar';
    const location = useLocation();
    const pathname = location.pathname;

    // Find which group the current path belongs to (if any)
    const activeGroupId = GROUPS.find(g =>
        g.children.some(c => matchPath(pathname, c.activePaths, c.exactMatch))
    )?.id ?? null;

    // Single open group (accordion — only one at a time)
    const [openGroupId, setOpenGroupId] = useState<string | null>(() => {
        try {
            const saved = localStorage.getItem(LOCALSTORAGE_KEY);
            return saved ?? activeGroupId;
        } catch {
            return activeGroupId;
        }
    });

    // Auto-open the group containing the active route
    useEffect(() => {
        if (activeGroupId && openGroupId !== activeGroupId) {
            setOpenGroupId(activeGroupId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Persist
    useEffect(() => {
        localStorage.setItem(LOCALSTORAGE_KEY, openGroupId ?? '');
    }, [openGroupId]);

    const toggleGroup = (id: string) => {
        setOpenGroupId(prev => (prev === id ? null : id));
    };

    // Collapsed-mode: hoverable group popover
    const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleClose = () => {
        hoverTimerRef.current = setTimeout(() => setHoveredGroup(null), 120);
    };
    const cancelClose = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };

    const getLabel = (item: Omit<FlatItem, 'kind'>) =>
        item.staticLabel ?? (item.labelKey ? t(item.labelKey) : '');
    const getGroupLabel = (g: GroupItem) => isRtl ? g.labelAr : g.labelFr;

    return (
        <aside
            className="sidebar-enterprise"
            style={{
                position: isMobileDrawer ? 'relative' : 'fixed',
                top: isMobileDrawer ? undefined : 0,
                [isRtl ? 'right' : 'left']: isMobileDrawer ? undefined : 0,
                height: isMobileDrawer ? '100%' : '100vh',
                width: isMobileDrawer ? '100%' : (isCollapsed ? '4.5rem' : '15rem'),
                background: 'linear-gradient(195deg, #0f172a 0%, #111827 55%, #0c1a38 100%)',
                transition: isMobileDrawer ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: isMobileDrawer ? undefined : 20,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isMobileDrawer ? 'none' : '4px 0 28px rgba(0,0,0,0.25)',
                overflow: isCollapsed ? 'visible' : 'hidden',
            }}
        >
            {/* ── Logo ───────────────────────────────────── */}
            <div style={{
                height: isMobileDrawer ? 'calc(4.25rem + env(safe-area-inset-top, 0))' : '4.25rem',
                padding: isCollapsed ? '0 0.75rem' : '0 1rem 0 1.125rem',
                paddingTop: isMobileDrawer ? 'env(safe-area-inset-top, 0)' : undefined,
                display: 'flex', alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
                background: 'inherit',
                zIndex: 1,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src={orderiumLogo} alt="Morocom" style={{ width: '2.125rem', height: '2.125rem', flexShrink: 0 }} />
                    {!isCollapsed && (
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Morocom</div>
                            <div style={{ fontSize: '0.575rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.13em', textTransform: 'uppercase' }}>Enterprise</div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Navigation ─────────────────────────────── */}
            <nav style={{
                flex: 1,
                padding: isCollapsed ? '0.625rem 0.5rem' : '0.5rem 0.625rem',
                overflowY: isCollapsed ? 'visible' : 'auto',
                overflowX: 'visible',
                scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.07) transparent',
            }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>

                    {/* ── Top flat items ── */}
                    {TOP_FLAT.map(item => (
                        <li key={item.id}>
                            <FlatLink item={item} isRtl={isRtl} label={getLabel(item)} collapsed={isCollapsed} />
                        </li>
                    ))}

                    {/* ── Divider ── */}
                    <li style={{ margin: '0.375rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                    {/* ── Accordion groups ── */}
                    {GROUPS.map(group => {
                        const isOpen = openGroupId === group.id;
                        const hasActive = group.children.some(c => matchPath(pathname, c.activePaths, c.exactMatch));
                        const isPopoverOpen = isCollapsed && hoveredGroup === group.id;

                        return (
                            <li key={group.id} style={{ position: 'relative' }}>
                                {/* Group header button */}
                                <button
                                    className="sb-group-btn"
                                    aria-expanded={isOpen}
                                    onClick={() => !isCollapsed && toggleGroup(group.id)}
                                    onMouseEnter={() => { if (isCollapsed) { cancelClose(); setHoveredGroup(group.id); } }}
                                    onMouseLeave={() => { if (isCollapsed) scheduleClose(); }}
                                    style={{
                                        display: 'flex', alignItems: 'center',
                                        gap: isCollapsed ? 0 : '0.625rem',
                                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                                        width: '100%',
                                        padding: isCollapsed ? '0.625rem' : '0.4375rem 0.5rem',
                                        background: hasActive && isCollapsed
                                            ? 'rgba(59,130,246,0.14)'
                                            : 'transparent',
                                        border: 'none', cursor: 'pointer',
                                        borderRadius: '0.5rem',
                                        position: 'relative',
                                        transition: 'background 0.13s',
                                    }}
                                >
                                    {/* Left border indicator when has active child */}
                                    {hasActive && (
                                        <span style={{
                                            position: 'absolute',
                                            [isRtl ? 'right' : 'left']: 0,
                                            top: '50%', transform: 'translateY(-50%)',
                                            width: '0.1875rem', height: '1.125rem',
                                            borderRadius: isRtl ? '0.25rem 0 0 0.25rem' : '0 0.25rem 0.25rem 0',
                                            background: '#3b82f6',
                                        }} />
                                    )}
                                    <span style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', flexShrink: 0,
                                        background: hasActive ? 'rgba(59,130,246,0.2)' : 'transparent',
                                    }}>
                                        <group.icon
                                            style={{ width: 16, height: 16, color: hasActive ? '#93c5fd' : 'rgba(255,255,255,0.55)' }}
                                            strokeWidth={hasActive ? 2.2 : 1.75}
                                        />
                                    </span>
                                    {!isCollapsed && (
                                        <>
                                            <span style={{
                                                flex: 1,
                                                textAlign: isRtl ? 'right' : 'left',
                                                fontSize: '0.6875rem', fontWeight: 700,
                                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                                color: hasActive ? 'rgba(147,197,253,0.9)' : 'rgba(255,255,255,0.35)',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {getGroupLabel(group)}
                                            </span>
                                            <ChevronDown style={{
                                                width: 12, height: 12, flexShrink: 0,
                                                color: 'rgba(255,255,255,0.25)',
                                                transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                transition: 'transform 0.2s ease',
                                            }} />
                                        </>
                                    )}
                                </button>

                                {/* Expanded children (expanded sidebar) */}
                                {!isCollapsed && (
                                    <div style={{
                                        maxHeight: isOpen ? `${group.children.length * 2.75}rem` : '0',
                                        overflow: 'hidden',
                                        transition: 'max-height 0.2s ease-in-out',
                                    }}>
                                        <ul style={{ listStyle: 'none', padding: '0.125rem 0 0.25rem 0', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.0625rem' }}>
                                            {group.children.map(child => (
                                                <li key={child.id}>
                                                    <ChildLink child={child} label={getLabel(child)} isRtl={isRtl} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Collapsed popover (floating mini-menu) */}
                                {isCollapsed && isPopoverOpen && (
                                    <div
                                        onMouseEnter={cancelClose}
                                        onMouseLeave={scheduleClose}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            [isRtl ? 'right' : 'left']: 'calc(100% + 0.5rem)',
                                            background: '#1e293b',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '0.625rem',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                            minWidth: '11rem',
                                            padding: '0.375rem 0.25rem',
                                            zIndex: 100,
                                        }}
                                    >
                                        {/* Popover label */}
                                        <div style={{
                                            padding: '0.25rem 0.75rem 0.375rem',
                                            fontSize: '0.625rem', fontWeight: 700,
                                            letterSpacing: '0.08em', textTransform: 'uppercase',
                                            color: 'rgba(147,197,253,0.8)',
                                        }}>
                                            {getGroupLabel(group)}
                                        </div>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.0625rem' }}>
                                            {group.children.map(child => (
                                                <li key={child.id}>
                                                    <ChildLink child={child} label={getLabel(child)} isRtl={isRtl} inPopover />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </li>
                        );
                    })}

                    {/* ── Divider ── */}
                    <li style={{ margin: '0.375rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                    {/* ── Bottom flat items ── */}
                    {BOTTOM_FLAT.map(item => (
                        <li key={item.id}>
                            <FlatLink item={item} isRtl={isRtl} label={getLabel(item)} collapsed={isCollapsed} />
                        </li>
                    ))}
                </ul>
            </nav>

            {/* ── Pinned: Paramètres ─────────────────────── */}
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: isCollapsed ? '0.5rem 0.5rem' : '0.5rem 0.625rem',
                flexShrink: 0,
            }}>
                <FlatLink item={PINNED} isRtl={isRtl} label={getLabel(PINNED)} collapsed={isCollapsed} />
            </div>

            {/* ── Version badge ──────────────────────────── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: isCollapsed ? '0.625rem 0.375rem' : '0.625rem 0.75rem', flexShrink: 0 }}>
                {!isCollapsed ? (
                    <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>Morocom ERP</div>
                            <div style={{ fontSize: '0.575rem', color: 'rgba(255,255,255,0.28)' }}>v2.0.0 PRO</div>
                        </div>
                        <Badge value="PRO" severity="info" style={{ fontSize: '0.5rem' }} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Badge value="P" severity="info" style={{ fontSize: '0.5rem' }} />
                    </div>
                )}
            </div>

            {/* ── Collapse toggle ────────────────────────── */}
            <div className="hidden lg:flex" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: isCollapsed ? '0.5rem 0.375rem' : '0.5rem 0.625rem', flexShrink: 0 }}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="sb-collapse-btn"
                    title={isCollapsed ? t('navExpand') : t('navCollapse')}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '0.5rem', width: '100%',
                        padding: isCollapsed ? '0.5rem' : '0.5rem 0.625rem',
                        borderRadius: '0.5rem', background: 'transparent', border: 'none',
                        color: 'rgba(255,255,255,0.38)', cursor: 'pointer',
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
                    {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{t('navCollapse')}</span>}
                </button>
            </div>

            <style>{`
                .sb-link { text-decoration: none; }
                .sb-link:hover:not(.sb-link--active) { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.9) !important; }
                .sb-link--active:hover { background: rgba(59,130,246,0.22) !important; }
                .sb-group-btn:hover { background: rgba(255,255,255,0.05) !important; }
                .sb-collapse-btn:hover { background: rgba(255,255,255,0.07) !important; color: rgba(255,255,255,0.7) !important; }
                .sidebar-enterprise nav::-webkit-scrollbar { width: 3px; }
                .sidebar-enterprise nav::-webkit-scrollbar-track { background: transparent; }
                .sidebar-enterprise nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 3px; }
            `}</style>
        </aside>
    );
};

