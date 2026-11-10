import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import orderiumLogo from '../assets/logo-backoffice.svg';
import { useLanguage } from '../context/LanguageContext';
import { clientRequestsService } from '../modules/client-requests';
import { Ripple } from 'primereact/ripple';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileCheck,
  PackageCheck,
  FileText,
  Wallet,
  UserCircle,
  DollarSign,
  ShoppingBag,
  Receipt,
  Truck,
  Package,
  FolderTree,
  Building2,
  ArrowLeftRight,
  SlidersHorizontal,
  ShoppingCart,
  Store,
  Banknote,
  UsersRound,
  UserRoundCheck,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Tags,
  CreditCard,
} from 'lucide-react';
import type { TranslationKey } from '../lib/i18n';
import { useTenantModules } from './TenantStatusGuard';
import type { TenantModules } from '../api/onboarding';
import { usePermissions } from '../hooks/usePermissions';
import { REPORT_VIEW_PERMISSIONS } from '../modules/access/report-permissions';

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
  moduleKey?: keyof TenantModules;
  /**
   * Access permission required to see this entry. Menu visibility mirrors what
   * the API will actually allow, so the sidebar never advertises a 403.
   */
  permission?: string;
  /** Shown when the user holds at least one of these. */
  anyPermission?: string[];
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
  return paths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// ── Nav data ─────────────────────────────────────────────────────────────────

const TOP_FLAT: FlatItem[] = [
  {
    kind: 'flat',
    id: 'sb-dashboard',
    permission: 'dashboard.view',
    to: '/dashboard',
    icon: LayoutDashboard,
    labelKey: 'dashboard',
    activePaths: ['/dashboard'],
    exactMatch: true,
  },
  {
    kind: 'flat',
    id: 'sb-orders',
    permission: 'orders.view',
    to: '/orders',
    icon: ShoppingCart,
    labelKey: 'orders',
    activePaths: ['/orders', '/checkout'],
    moduleKey: 'commandes',
  },
  {
    kind: 'flat',
    id: 'sb-caisse',
    permission: 'caisse.view',
    to: '/caisse',
    icon: Banknote,
    labelKey: 'caisse',
    activePaths: ['/caisse'],
    moduleKey: 'caisse',
  },
  {
    kind: 'flat',
    id: 'sb-pos',
    permission: 'pos.use',
    to: '/pos',
    icon: Store,
    labelKey: 'navPos',
    activePaths: ['/pos'],
    moduleKey: 'pos',
  },
  {
    kind: 'flat',
    id: 'sb-analytics',
    anyPermission: REPORT_VIEW_PERMISSIONS,
    to: '/analytics',
    icon: BarChart2,
    labelKey: 'analytics',
    activePaths: ['/analytics'],
    moduleKey: 'reports',
  },
];

const GROUPS: GroupItem[] = [
  {
    kind: 'group',
    id: 'grp-sales',
    labelFr: 'Ventes',
    labelAr: 'المبيعات',
    icon: TrendingUp,
    children: [
      {
        id: 'sb-devis',
        permission: 'quotes.view',
        to: '/devis',
        icon: FileCheck,
        labelKey: 'quote',
        activePaths: ['/devis'],
        moduleKey: 'devis',
      },
      {
        id: 'sb-bl',
        permission: 'orders.view',
        to: '/bons-livraison',
        icon: PackageCheck,
        labelKey: 'deliveryNote',
        activePaths: ['/bons-livraison'],
        moduleKey: 'bonLivraison',
      },
      {
        id: 'sb-fv',
        permission: 'invoices.view',
        to: '/factures/vente',
        icon: FileText,
        labelKey: 'salesInvoice',
        activePaths: ['/factures/vente'],
        moduleKey: 'factures',
      },
      {
        id: 'sb-pv',
        permission: 'payments.view',
        to: '/paiements-vente',
        icon: Wallet,
        labelKey: 'payments',
        activePaths: ['/paiements-vente'],
        moduleKey: 'paiements',
      },
      {
        id: 'sb-customers',
        permission: 'partners.view',
        to: '/customers',
        icon: UserCircle,
        labelKey: 'clients',
        activePaths: ['/customers'],
        moduleKey: 'clients',
      },
    ],
  },
  {
    kind: 'group',
    id: 'grp-purchases',
    labelFr: 'Achats',
    labelAr: 'المشتريات',
    icon: TrendingDown,
    children: [
      {
        id: 'sb-dp',
        permission: 'quotes.view',
        to: '/demande-prix',
        icon: DollarSign,
        labelKey: 'priceRequest',
        activePaths: ['/demande-prix'],
        moduleKey: 'demandeDesPrix',
      },
      {
        id: 'sb-ba',
        permission: 'orders.view',
        to: '/bon-achat',
        icon: ShoppingBag,
        labelKey: 'purchaseOrder',
        activePaths: ['/bon-achat'],
        moduleKey: 'bonAchat',
      },
      {
        id: 'sb-fa',
        permission: 'invoices.view',
        to: '/factures/achat',
        icon: Receipt,
        labelKey: 'purchaseInvoice',
        activePaths: ['/factures/achat'],
        moduleKey: 'factureAchat',
      },
      {
        id: 'sb-pa',
        permission: 'payments.view',
        to: '/paiements-achat',
        icon: Wallet,
        labelKey: 'payments',
        activePaths: ['/paiements-achat'],
        moduleKey: 'paiementsAchat',
      },
      {
        id: 'sb-fournisseurs',
        permission: 'partners.view',
        to: '/fournisseurs',
        icon: Truck,
        labelKey: 'suppliers',
        activePaths: ['/fournisseurs'],
        moduleKey: 'fournisseurs',
      },
    ],
  },
  {
    kind: 'group',
    id: 'grp-inventory',
    labelFr: 'Inventaire',
    labelAr: 'المخزون',
    icon: Package,
    children: [
      {
        id: 'sb-products',
        permission: 'products.view',
        to: '/products',
        icon: Package,
        labelKey: 'products',
        activePaths: ['/products'],
        moduleKey: 'products',
      },
      {
        id: 'sb-cats',
        permission: 'categories.view',
        to: '/categories',
        icon: FolderTree,
        labelKey: 'categories',
        activePaths: ['/categories'],
        moduleKey: 'category',
      },
      {
        id: 'sb-brands',
        permission: 'brands.view',
        to: '/brands',
        icon: Tags,
        labelKey: 'brands',
        activePaths: ['/brands'],
        moduleKey: 'brands',
      },
      {
        id: 'sb-wh',
        permission: 'warehouses.view',
        to: '/warehouses',
        icon: Building2,
        labelKey: 'warehouses',
        activePaths: ['/warehouses'],
        moduleKey: 'warehouse',
      },
      {
        id: 'sb-sm',
        permission: 'stock.view',
        to: '/stock-movements',
        icon: ArrowLeftRight,
        labelKey: 'stockMovements',
        activePaths: ['/stock-movements'],
        moduleKey: 'stockMovements',
      },
      {
        id: 'sb-adj',
        permission: 'stock.view',
        to: '/inventory-adjustments',
        icon: SlidersHorizontal,
        labelKey: 'inventoryAdjustments',
        activePaths: ['/inventory-adjustments'],
        moduleKey: 'inventoryAdjustments',
      },
    ],
  },
];

const BOTTOM_FLAT: FlatItem[] = [
  {
    kind: 'flat',
    id: 'sb-delivery',
    permission: 'delivery.view',
    to: '/delivery-persons',
    icon: Truck,
    labelKey: 'deliveryPersons',
    activePaths: ['/delivery-persons'],
    moduleKey: 'livreurs',
  },
  {
    kind: 'flat',
    id: 'sb-client-requests',
    permission: 'users.view',
    to: '/client-requests',
    icon: UserRoundCheck,
    labelKey: 'clientRequests',
    activePaths: ['/client-requests'],
    moduleKey: 'clientRequests',
  },
  {
    kind: 'flat',
    id: 'sb-users',
    permission: 'users.view',
    to: '/users',
    icon: UsersRound,
    labelKey: 'navTeam',
    activePaths: ['/users'],
  },
  {
    kind: 'flat',
    id: 'sb-roles',
    permission: 'roles.view',
    to: '/roles',
    icon: Shield,
    labelKey: 'rolesPermissions',
    activePaths: ['/roles'],
  },
];

const PINNED: FlatItem = {
  kind: 'flat',
  id: 'sb-config',
  permission: 'configurations.view',
  to: '/configurations',
  icon: Settings,
  labelKey: 'settings',
  activePaths: ['/configurations'],
};

/** Plan & usage — open to every logged-in admin, no permission required. */
const SUBSCRIPTION_ITEM: FlatItem = {
  kind: 'flat',
  id: 'sb-subscription',
  to: '/subscription',
  icon: CreditCard,
  labelKey: 'mySubscription',
  activePaths: ['/subscription'],
};

const LOCALSTORAGE_KEY = 'marnova_sidebar_open_group';

/** Section headings shown above each block of the rail (hidden when collapsed). */
const SECTIONS = {
  main: { fr: 'Principal', ar: 'الرئيسية' },
  operations: { fr: 'Opérations', ar: 'العمليات' },
  admin: { fr: 'Administration', ar: 'الإدارة' },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return (
      <li
        aria-hidden
        style={{ margin: '0.5rem 0.75rem', borderTop: '1px solid var(--sb-border)' }}
      />
    );
  }
  return (
    <li className="sb-section-label" role="presentation">
      {label}
    </li>
  );
}

interface FlatLinkProps {
  item: Omit<FlatItem, 'kind'>;
  label: string;
  collapsed: boolean;
  /** Pending-items pill, e.g. client requests awaiting a decision. */
  badgeCount?: number;
}
function FlatLink({ item, label, collapsed, badgeCount }: FlatLinkProps) {
  const location = useLocation();
  const active = matchPath(location.pathname, item.activePaths, item.exactMatch);
  return (
    <Link
      to={item.to}
      id={item.id}
      className={`sb-link p-ripple${active ? ' sb-link--active' : ''}${collapsed ? ' sb-link--collapsed' : ''}`}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
    >
      <item.icon className="sb-icon" strokeWidth={active ? 2 : 1.75} />
      {!collapsed && <span className="sb-label">{label}</span>}
      {!!badgeCount && (
        <span className={`sb-badge${collapsed ? ' sb-badge--floating' : ''}`}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
      <Ripple />
    </Link>
  );
}

interface ChildLinkProps {
  child: Omit<FlatItem, 'kind'>;
  label: string;
  inPopover?: boolean;
}
function ChildLink({ child, label, inPopover }: ChildLinkProps) {
  const location = useLocation();
  const active = matchPath(location.pathname, child.activePaths, child.exactMatch);
  return (
    <Link
      to={child.to}
      className={`sb-link sb-link--child p-ripple${active ? ' sb-link--active' : ''}${inPopover ? ' sb-link--popover' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <child.icon className="sb-icon sb-icon--sm" strokeWidth={active ? 2 : 1.75} />
      <span className="sb-label">{label}</span>
      <Ripple />
    </Link>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileDrawer = false }: SidebarProps) => {
  const { language, t } = useLanguage();
  const modules = useTenantModules();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const isRtl = language === 'ar';
  const location = useLocation();
  const pathname = location.pathname;

  // Module-aware filter: hide items whose moduleKey is explicitly disabled
  const isVisible = (moduleKey?: keyof TenantModules): boolean => {
    if (!moduleKey) return true;
    const val = modules[moduleKey];
    // portals is an object, not a boolean — ignore here (not a nav item)
    if (typeof val !== 'boolean') return true;
    return val;
  };

  // Two independent gates: the tenant must have the module enabled, and the
  // user's roles must grant it. An entry needs both to appear.
  const isPermitted = (item: { permission?: string; anyPermission?: string[] }): boolean => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.anyPermission?.length && !hasAnyPermission(...item.anyPermission)) {
      return false;
    }
    return true;
  };

  const isShown = (item: {
    moduleKey?: keyof TenantModules;
    permission?: string;
    anyPermission?: string[];
  }) => isVisible(item.moduleKey) && isPermitted(item);

  const visibleTopFlat = TOP_FLAT.filter(isShown);
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    children: group.children.filter(isShown),
  })).filter((group) => group.children.length > 0);
  const visibleBottomFlat = BOTTOM_FLAT.filter(isShown);

  // Pending client sign-ups, shown as a pill on the "Demandes clients" entry.
  const { data: pendingClientRequests = 0 } = useQuery({
    queryKey: ['client-requests', 'pending-count'],
    queryFn: () => clientRequestsService.getPendingCount(),
    enabled: visibleBottomFlat.some((item) => item.id === 'sb-client-requests'),
    staleTime: 60_000,
  });
  const showPinned = isShown(PINNED);

  // Find which group the current path belongs to (if any)
  const activeGroupId =
    GROUPS.find((g) => g.children.some((c) => matchPath(pathname, c.activePaths, c.exactMatch)))
      ?.id ?? null;

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
    setOpenGroupId((prev) => (prev === id ? null : id));
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
  const getGroupLabel = (g: GroupItem) => (isRtl ? g.labelAr : g.labelFr);

  const sectionLabel = (s: keyof typeof SECTIONS) => (isRtl ? SECTIONS[s].ar : SECTIONS[s].fr);

  const sidebarWidth = isCollapsed ? '4.5rem' : '16rem';
  // Point the chevron toward the direction the sidebar will move
  const ToggleIcon = isCollapsed !== isRtl ? ChevronRight : ChevronLeft;

  return (
    <>
      <aside
        className={`sidebar-enterprise${isCollapsed ? ' is-collapsed' : ''}`}
        style={{
          position: isMobileDrawer ? 'relative' : 'fixed',
          top: isMobileDrawer ? undefined : 0,
          [isRtl ? 'right' : 'left']: isMobileDrawer ? undefined : 0,
          height: isMobileDrawer ? '100%' : '100vh',
          width: isMobileDrawer ? '100%' : sidebarWidth,
          background: 'var(--sb-bg)',
          borderInlineEnd: isMobileDrawer ? 'none' : '1px solid var(--sb-border)',
          transition: isMobileDrawer ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: isMobileDrawer ? undefined : 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: isCollapsed ? 'visible' : 'hidden',
        }}
      >
        {/* ── Logo ───────────────────────────────────── */}
        <div
          style={{
            height: isMobileDrawer
              ? 'calc(var(--topbar-height) + env(safe-area-inset-top, 0))'
              : 'var(--topbar-height)',
            padding: isCollapsed ? '0 0.75rem' : '0 1.25rem',
            paddingTop: isMobileDrawer ? 'env(safe-area-inset-top, 0)' : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            borderBottom: '1px solid var(--sb-border)',
            flexShrink: 0,
            background: 'inherit',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
            <img
              src={orderiumLogo}
              alt="Marnova"
              style={{ width: '2.5rem', height: '2.5rem', flexShrink: 0 }}
            />
            {!isCollapsed && (
              <div
                style={{
                  paddingInlineStart: '0.875rem',
                  borderInlineStart: '1px solid var(--sb-border)',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: 'var(--sb-text-strong)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25,
                  }}
                >
                  Marnova
                </div>
                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: 'var(--sb-accent-text)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    lineHeight: 1.4,
                  }}
                >
                  Enterprise
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Navigation ─────────────────────────────── */}
        <nav
          style={{
            flex: 1,
            minHeight: 0,
            padding: isCollapsed ? '0.75rem 0.625rem' : '0.75rem 1rem',
            overflowY: isCollapsed ? 'visible' : 'auto',
            overflowX: 'visible',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--sb-scrollbar) transparent',
          }}
        >
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            {/* ── Top flat items ── */}
            {visibleTopFlat.length > 0 && (
              <SectionLabel label={sectionLabel('main')} collapsed={isCollapsed} />
            )}
            {visibleTopFlat.map((item) => (
              <li key={item.id}>
                <FlatLink
                  item={item}
                  label={getLabel(item)}
                  collapsed={isCollapsed}
                  badgeCount={item.id === 'sb-client-requests' ? pendingClientRequests : undefined}
                />
              </li>
            ))}

            {/* ── Accordion groups ── */}
            {visibleGroups.length > 0 && (
              <SectionLabel label={sectionLabel('operations')} collapsed={isCollapsed} />
            )}
            {visibleGroups.map((group) => {
              const isOpen = openGroupId === group.id;
              const hasActive = group.children.some((c) =>
                matchPath(pathname, c.activePaths, c.exactMatch),
              );
              const isPopoverOpen = isCollapsed && hoveredGroup === group.id;

              return (
                <li key={group.id} style={{ position: 'relative' }}>
                  {/* Group header button */}
                  <button
                    className={`sb-link sb-group-btn${hasActive ? ' sb-group-btn--has-active' : ''}${isCollapsed ? ' sb-link--collapsed' : ''}`}
                    aria-expanded={isOpen}
                    aria-label={getGroupLabel(group)}
                    onClick={() => !isCollapsed && toggleGroup(group.id)}
                    onMouseEnter={() => {
                      if (isCollapsed) {
                        cancelClose();
                        setHoveredGroup(group.id);
                      }
                    }}
                    onMouseLeave={() => {
                      if (isCollapsed) scheduleClose();
                    }}
                  >
                    <group.icon className="sb-icon" strokeWidth={hasActive ? 2 : 1.75} />
                    {!isCollapsed && (
                      <>
                        <span className="sb-label">{getGroupLabel(group)}</span>
                        {isOpen ? (
                          <Minus className="sb-group-toggle" strokeWidth={1.75} />
                        ) : (
                          <Plus className="sb-group-toggle" strokeWidth={1.75} />
                        )}
                      </>
                    )}
                  </button>

                  {/* Expanded children (expanded sidebar) */}
                  {!isCollapsed && (
                    <div
                      style={{
                        maxHeight: isOpen ? `${group.children.length * 3}rem` : '0',
                        overflow: 'hidden',
                        transition: 'max-height 0.2s ease-in-out',
                      }}
                    >
                      <ul
                        className="sb-tree"
                        style={{
                          listStyle: 'none',
                          padding: '0.25rem 0',
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.125rem',
                        }}
                      >
                        {group.children.map((child) => (
                          <li key={child.id}>
                            <ChildLink child={child} label={getLabel(child)} />
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
                        background: 'var(--sb-popover-bg)',
                        border: '1px solid var(--sb-border)',
                        borderRadius: '0.75rem',
                        boxShadow: 'var(--erp-shadow-lg)',
                        minWidth: '12rem',
                        padding: '0.375rem',
                        zIndex: 100,
                      }}
                    >
                      <div className="sb-section-label" style={{ padding: '0.375rem 0.625rem' }}>
                        {getGroupLabel(group)}
                      </div>
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.125rem',
                        }}
                      >
                        {group.children.map((child) => (
                          <li key={child.id}>
                            <ChildLink child={child} label={getLabel(child)} inPopover />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}

            {/* ── Bottom flat items ── */}
            {visibleBottomFlat.length > 0 && (
              <SectionLabel label={sectionLabel('admin')} collapsed={isCollapsed} />
            )}
            {visibleBottomFlat.map((item) => (
              <li key={item.id}>
                <FlatLink
                  item={item}
                  label={getLabel(item)}
                  collapsed={isCollapsed}
                  badgeCount={item.id === 'sb-client-requests' ? pendingClientRequests : undefined}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Pinned footer (subscription + settings) — stays at the bottom, outside the scroll area ── */}
        <div
          style={{
            borderTop: '1px solid var(--sb-border)',
            padding: isCollapsed ? '0.5rem 0.625rem' : '0.5rem 1rem',
            flexShrink: 0,
          }}
        >
          <FlatLink
            item={SUBSCRIPTION_ITEM}
            label={getLabel(SUBSCRIPTION_ITEM)}
            collapsed={isCollapsed}
          />
          {showPinned && (
            <FlatLink item={PINNED} label={getLabel(PINNED)} collapsed={isCollapsed} />
          )}
        </div>

        <style>{`
                .sidebar-enterprise .sb-section-label {
                    padding: 1rem 0.875rem 0.375rem;
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: var(--sb-text-faint);
                    white-space: nowrap;
                }
                .sidebar-enterprise ul > .sb-section-label:first-child { padding-top: 0.25rem; }
                .sb-link {
                    display: flex;
                    align-items: center;
                    gap: 0.875rem;
                    width: 100%;
                    padding: 0.6875rem 0.875rem;
                    border: none;
                    border-radius: 0.75rem;
                    background: transparent;
                    color: var(--sb-text);
                    font-family: inherit;
                    font-size: 0.9375rem;
                    font-weight: 500;
                    line-height: 1.25rem;
                    text-align: start;
                    text-decoration: none;
                    cursor: pointer;
                    position: relative;
                    white-space: nowrap;
                    transition: background 0.13s, color 0.13s;
                }
                .sb-link--collapsed { justify-content: center; gap: 0; padding: 0.6875rem; }
                .sb-link--child { padding-inline-start: 2.75rem; font-size: 0.875rem; gap: 0.75rem; }
                .sb-link--popover { padding: 0.5rem 0.625rem; }
                /* Tree connector lines — vertical rail aligned with the parent icon center (1.5rem), curved elbow to each child */
                .sb-tree > li { position: relative; }
                .sb-tree > li::before,
                .sb-tree > li::after {
                    content: '';
                    position: absolute;
                    inset-inline-start: calc(1.5rem - 0.75px);
                    border-color: var(--sb-border);
                    border-style: solid;
                    border-width: 0;
                    pointer-events: none;
                    z-index: 1;
                }
                .sb-tree > li::before { top: -0.125rem; bottom: 0; border-inline-start-width: 1.5px; }
                .sb-tree > li:first-child::before { top: -0.25rem; }
                .sb-tree > li:last-child::before { bottom: calc(50% + 0.5rem); }
                .sb-tree > li::after {
                    top: calc(50% - 0.5rem);
                    height: 0.5rem;
                    width: 0.75rem;
                    border-inline-start-width: 1.5px;
                    border-bottom-width: 1.5px;
                    border-end-start-radius: 0.5rem;
                }
                .sb-tree > li:has(.sb-link--active)::after { border-color: var(--sb-accent); }
                .sb-link .sb-icon { width: 1.25rem; height: 1.25rem; flex-shrink: 0; color: var(--sb-icon); }
                .sb-link .sb-icon--sm { width: 1.0625rem; height: 1.0625rem; }
                .sb-link .sb-label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
                .sb-link .sb-group-toggle { width: 1.125rem; height: 1.125rem; flex-shrink: 0; color: var(--sb-text-dim); }
                .sb-link--active { background: var(--sb-accent-bg); color: var(--sb-accent-text); font-weight: 600; }
                .sb-link--active::before,
                .sb-group-btn--has-active.sb-link--collapsed::before {
                    content: '';
                    position: absolute;
                    inset-inline-start: 0;
                    top: 0.5rem;
                    bottom: 0.5rem;
                    width: 3px;
                    border-start-end-radius: 3px;
                    border-end-end-radius: 3px;
                    background: var(--sb-accent);
                }
                .sb-link--popover.sb-link--active::before { top: 0.375rem; bottom: 0.375rem; }
                .sb-link--active .sb-icon { color: var(--sb-accent-text); }
                .sb-group-btn--has-active { color: var(--sb-text-strong); font-weight: 600; }
                .sb-group-btn--has-active .sb-icon { color: var(--sb-accent-text); }
                .sb-group-btn--has-active.sb-link--collapsed { background: var(--sb-accent-bg); }
                .sb-link:hover:not(.sb-link--active) { background: var(--sb-hover-bg); color: var(--sb-hover-text); }
                .sb-link:hover:not(.sb-link--active) .sb-icon { color: var(--sb-hover-text); }
                .sb-link--active:hover { background: var(--sb-accent-bg-strong); }
                .sb-badge {
                    background: #f59e0b;
                    color: #fff;
                    border-radius: 9999px;
                    font-size: 0.6875rem;
                    font-weight: 700;
                    line-height: 1;
                    padding: 0.25rem 0.45rem;
                }
                .sb-badge--floating { position: absolute; top: 0.25rem; inset-inline-end: 0.25rem; padding: 0.2rem 0.3rem; font-size: 0.625rem; }
                .sb-collapse-btn:hover { background: var(--sb-hover-bg) !important; color: var(--sb-hover-text) !important; }
                .sb-link:focus-visible,
                .sb-collapse-btn:focus-visible {
                    outline: none;
                    box-shadow: 0 0 0 2px var(--sb-accent);
                }
                .sidebar-enterprise nav::-webkit-scrollbar { width: 4px; }
                .sidebar-enterprise nav::-webkit-scrollbar-track { background: transparent; }
                .sidebar-enterprise nav::-webkit-scrollbar-thumb { background: var(--sb-scrollbar); border-radius: 4px; }
            `}</style>
      </aside>

      {/* ── Collapse toggle: sits on the sidebar/header seam ── */}
      {!isMobileDrawer && (
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="sb-collapse-btn"
          aria-label={isCollapsed ? t('navExpand') : t('navCollapse')}
          title={isCollapsed ? t('navExpand') : t('navCollapse')}
          style={{
            position: 'fixed',
            top: 'var(--topbar-height)',
            [isRtl ? 'right' : 'left']: sidebarWidth,
            transform: `translate(${isRtl ? '50%' : '-50%'}, -50%)`,
            transition: `${isRtl ? 'right' : 'left'} 0.25s cubic-bezier(0.4, 0, 0.2, 1)`,
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2rem',
            height: '2rem',
            padding: 0,
            borderRadius: '9999px',
            background: 'var(--sb-bg)',
            border: '1px solid var(--sb-border)',
            color: 'var(--sb-text-dim)',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
          }}
        >
          <ToggleIcon style={{ width: '1.125rem', height: '1.125rem' }} />
        </button>
      )}
    </>
  );
};
