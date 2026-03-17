import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
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
    FileCheck,
    PackageCheck,
    FileText,
    Wallet,
    UserCircle,
    DollarSign,
    ShoppingBag,
    Receipt,
    Truck,
    FolderTree,
    Building2,
    BarChart2,
    SlidersHorizontal,
    ChevronDown,
} from 'lucide-react';

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
}

const SALES_PATHS = ['/devis', '/bons-livraison', '/factures/vente', '/paiements-vente', '/customers'];
const PURCHASES_PATHS = ['/demande-prix', '/bon-achat', '/factures/achat', '/paiements-achat', '/fournisseurs'];
const STOCK_PATHS = ['/products', '/categories', '/warehouses', '/stock-movements', '/inventory-adjustments'];

export const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
    const location = useLocation();
    const { t, language } = useLanguage();
    const isRtl = language === 'ar';

    const inSales = SALES_PATHS.some(p => location.pathname.startsWith(p));
    const inPurchases = PURCHASES_PATHS.some(p => location.pathname.startsWith(p));
    const inStock = STOCK_PATHS.some(p => location.pathname.startsWith(p));

    const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
        const s = new Set<string>();
        if (inSales) s.add('ventes');
        if (inPurchases) s.add('achats');
        if (inStock) s.add('stock');
        return s;
    });

    useEffect(() => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (inSales) next.add('ventes');
            if (inPurchases) next.add('achats');
            if (inStock) next.add('stock');
            return next;
        });
    }, [location.pathname, inSales, inPurchases, inStock]);

    const toggleGroup = (key: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const isPathActive = (path: string) =>
        location.pathname === path || location.pathname.startsWith(path + '/');

    const isGroupActive = (paths: string[]) =>
        paths.some(p => location.pathname.startsWith(p));

    // ── Helper: single nav link ────────────────────────────────
    const NavLink = ({
        path,
        icon: Icon,
        label,
        indented = false,
        tooltipId,
    }: { path: string; icon: React.ComponentType<any>; label: string; indented?: boolean; tooltipId?: string }) => {
        const active = isPathActive(path);
        return (
            <li style={{ marginBottom: '0.0625rem' }}>
                <Link
                    to={path}
                    id={tooltipId}
                    className={`sb-link p-ripple ${active ? 'sb-link--active' : ''}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCollapsed ? 0 : (indented ? '0.625rem' : '0.75rem'),
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        padding: isCollapsed ? '0.625rem' : indented ? '0.4375rem 0.625rem 0.4375rem 0.875rem' : '0.5rem 0.625rem',
                        background: active ? 'rgba(35,90,228,0.16)' : 'transparent',
                        color: active ? '#ffffff' : indented ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)',
                        fontWeight: active ? 600 : 450,
                        fontSize: indented ? '0.78125rem' : '0.8125rem',
                        borderRadius: '0.5rem',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        textDecoration: 'none',
                    }}
                >
                    {active && !indented && (
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: indented ? '1.5rem' : '1.875rem',
                        height: indented ? '1.5rem' : '1.875rem',
                        borderRadius: '0.375rem',
                        flexShrink: 0,
                        background: active ? 'rgba(35,90,228,0.2)' : 'transparent',
                    }}>
                        <Icon style={{ width: indented ? 14 : 16, height: indented ? 14 : 16 }} strokeWidth={active ? 2.25 : 1.75} />
                    </span>
                    {!isCollapsed && (
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {label}
                        </span>
                    )}
                    <Ripple />
                </Link>
            </li>
        );
    };

    // ── Helper: expandable group header ───────────────────────
    const GroupHeader = ({
        groupKey,
        icon: Icon,
        label,
        paths,
        tooltipId,
    }: { groupKey: string; icon: React.ComponentType<any>; label: string; paths: string[]; tooltipId?: string }) => {
        const groupActive = isGroupActive(paths);
        const isOpen = openGroups.has(groupKey);
        return (
            <li style={{ marginBottom: '0.0625rem' }}>
                <button
                    id={tooltipId}
                    onClick={(e) => !isCollapsed && toggleGroup(groupKey, e)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        gap: isCollapsed ? 0 : '0.75rem',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        padding: isCollapsed ? '0.625rem' : '0.5rem 0.625rem',
                        background: groupActive ? 'rgba(35,90,228,0.13)' : 'transparent',
                        color: groupActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                        fontWeight: groupActive ? 600 : 450,
                        fontSize: '0.8125rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                    }}
                    className="sb-group-btn"
                >
                    {groupActive && (
                        <span style={{
                            position: 'absolute',
                            [isRtl ? 'right' : 'left']: '-0.625rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '0.1875rem',
                            height: '1.25rem',
                            borderRadius: '0 0.25rem 0.25rem 0',
                            background: '#235ae4',
                            boxShadow: '0 0 8px rgba(35,90,228,0.5)',
                        }} />
                    )}
                    <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '1.875rem', height: '1.875rem', borderRadius: '0.375rem', flexShrink: 0,
                        background: groupActive ? 'rgba(35,90,228,0.2)' : 'transparent',
                    }}>
                        <Icon style={{ width: 16, height: 16 }} strokeWidth={groupActive ? 2.25 : 1.75} />
                    </span>
                    {!isCollapsed && (
                        <>
                            <span style={{ flex: 1, textAlign: isRtl ? 'right' : 'left', whiteSpace: 'nowrap' }}>{label}</span>
                            <ChevronDown style={{
                                width: 13, height: 13, flexShrink: 0, opacity: 0.5,
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                            }} />
                        </>
                    )}
                </button>
            </li>
        );
    };

    // ── Helper: section separator label ───────────────────────
    const SectionLabel = ({ label }: { label: string }) => (
        !isCollapsed ? (
            <li>
                <div style={{
                    padding: '0.875rem 0.625rem 0.25rem',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                }}>
                    {label}
                </div>
            </li>
        ) : (
            <li>
                <div style={{ height: '0.75rem', margin: '0.25rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }} />
            </li>
        )
    );

    const salesOpen = openGroups.has('ventes') && !isCollapsed;
    const purchasesOpen = openGroups.has('achats') && !isCollapsed;
    const stockOpen = openGroups.has('stock') && !isCollapsed;

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
                boxShadow: '4px 0 32px rgba(0,0,0,0.22)',
                overflow: 'hidden',
            }}
        >
            {/* ── Logo bar ─────────────────────────────────── */}
            <div style={{
                height: '4.25rem',
                padding: isCollapsed ? '0 0.75rem' : '0 0.875rem 0 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', flexShrink: 0,
                        background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                        boxShadow: '0 4px 14px rgba(35,90,228,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>O</span>
                    </div>
                    {!isCollapsed && (
                        <div>
                            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Orderium</div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Enterprise</div>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex sb-collapse-btn"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '1.625rem', height: '1.625rem', borderRadius: '0.375rem',
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0,
                    }}
                >
                    {isCollapsed
                        ? (isRtl ? <ChevronLeft style={{ width: '0.8rem', height: '0.8rem' }} /> : <ChevronRight style={{ width: '0.8rem', height: '0.8rem' }} />)
                        : (isRtl ? <ChevronRight style={{ width: '0.8rem', height: '0.8rem' }} /> : <ChevronLeft style={{ width: '0.8rem', height: '0.8rem' }} />)
                    }
                </button>
            </div>

            {/* ── Navigation ───────────────────────────────── */}
            <nav style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                padding: isCollapsed ? '0.5rem 0.4375rem' : '0.375rem 0.75rem',
                scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent',
            }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>

                    {/* ─ General ─ */}
                    <NavLink path="/dashboard" icon={LayoutDashboard} label={t('dashboard')} tooltipId="sb-dashboard" />
                    <NavLink path="/orders" icon={ShoppingCart} label={t('orders')} tooltipId="sb-orders" />
                    <NavLink path="/pos" icon={CreditCard} label={t('pointOfSale')} tooltipId="sb-pos" />

                    {/* ─ Commercial ─ */}
                    <SectionLabel label="Commercial" />

                    {/* Sales group */}
                    <GroupHeader groupKey="ventes" icon={TrendingUp} label={t('sales')} paths={SALES_PATHS} tooltipId="sb-ventes" />
                    {salesOpen && (
                        <>
                            <NavLink path="/devis" icon={FileCheck} label={t('quote')} indented />
                            <NavLink path="/bons-livraison" icon={PackageCheck} label={t('deliveryNote')} indented />
                            <NavLink path="/factures/vente" icon={FileText} label={t('salesInvoice')} indented />
                            <NavLink path="/paiements-vente" icon={Wallet} label={t('payments')} indented />
                            <NavLink path="/customers" icon={UserCircle} label={t('clients')} indented />
                        </>
                    )}

                    {/* Purchases group */}
                    <GroupHeader groupKey="achats" icon={TrendingDown} label={t('purchases')} paths={PURCHASES_PATHS} tooltipId="sb-achats" />
                    {purchasesOpen && (
                        <>
                            <NavLink path="/demande-prix" icon={DollarSign} label={t('priceRequest')} indented />
                            <NavLink path="/bon-achat" icon={ShoppingBag} label={t('purchaseOrder')} indented />
                            <NavLink path="/factures/achat" icon={Receipt} label={t('purchaseInvoice')} indented />
                            <NavLink path="/paiements-achat" icon={Wallet} label={t('payments')} indented />
                            <NavLink path="/fournisseurs" icon={Truck} label={t('suppliers')} indented />
                        </>
                    )}

                    {/* ─ Stock ─ */}
                    <SectionLabel label={t('stock') || 'Stock'} />

                    {/* Stock group */}
                    <GroupHeader groupKey="stock" icon={Package} label={t('products')} paths={STOCK_PATHS} tooltipId="sb-stock" />
                    {stockOpen && (
                        <>
                            <NavLink path="/products" icon={Package} label={t('products')} indented />
                            <NavLink path="/categories" icon={FolderTree} label={t('categories')} indented />
                            <NavLink path="/warehouses" icon={Building2} label={t('warehouses')} indented />
                            <NavLink path="/stock-movements" icon={SlidersHorizontal} label={t('stockMovements')} indented />
                            <NavLink path="/inventory-adjustments" icon={BarChart2} label={t('inventoryAdjustments')} indented />
                        </>
                    )}

                    {/* ─ Operations ─ */}
                    <SectionLabel label={t('delivery') || 'Opérations'} />
                    <NavLink path="/delivery-persons" icon={Users} label={t('deliveryPersons')} tooltipId="sb-delivery" />
                    <NavLink path="/drive" icon={HardDrive} label={t('drive')} tooltipId="sb-drive" />

                    {/* ─ Admin ─ */}
                    <SectionLabel label={t('settings') || 'Admin'} />
                    <NavLink path="/users" icon={UsersRound} label={t('usersManagement')} tooltipId="sb-users" />
                    <NavLink path="/roles" icon={Shield} label={t('rolesManagement')} tooltipId="sb-roles" />
                    <NavLink path="/configurations" icon={Settings} label={t('configurations')} tooltipId="sb-config" />

                </ul>
            </nav>

            {/* Tooltip for collapsed mode */}
            {isCollapsed && (
                <Tooltip target="#sb-dashboard,#sb-orders,#sb-pos,#sb-ventes,#sb-achats,#sb-stock,#sb-delivery,#sb-drive,#sb-users,#sb-roles,#sb-config"
                    position={isRtl ? 'left' : 'right'} />
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

            <style>{`
                .sb-link:hover { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.92) !important; }
                .sb-link--active:hover { background: rgba(35,90,228,0.22) !important; }
                .sb-group-btn:hover { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.92) !important; }
                .sb-collapse-btn:hover { background: rgba(255,255,255,0.08) !important; color: rgba(255,255,255,0.7) !important; }
                .sidebar-enterprise nav::-webkit-scrollbar { width: 3px; }
                .sidebar-enterprise nav::-webkit-scrollbar-track { background: transparent; }
                .sidebar-enterprise nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
            `}</style>
        </aside>
    );
};
