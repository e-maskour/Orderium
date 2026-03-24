import { Link, useLocation } from 'react-router-dom';
import {
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
    CreditCard,
    UsersRound,
    Shield,
    Settings,
    Percent,
    Globe,
    Calendar,
    Hash,
    Ruler,
    Archive,
    Building,
} from 'lucide-react';

interface TabDef {
    label: string;
    to: string;
    icon: React.ComponentType<{ style?: React.CSSProperties; strokeWidth?: number }>;
    isActive: (pathname: string) => boolean;
}

interface ModuleConf {
    triggerFn: (pathname: string) => boolean;
    tabs: TabDef[];
}

const match = (prefix: string) => (p: string) =>
    p === prefix || p.startsWith(prefix + '/');

const MODULE_CONFIGS: ModuleConf[] = [
    // ── Commandes ──────────────────────────────────────────────
    {
        triggerFn: (p) => match('/orders')(p) || match('/checkout')(p),
        tabs: [
            {
                label: 'Commandes',
                to: '/orders',
                icon: ShoppingCart,
                isActive: match('/orders'),
            },
        ],
    },

    // ── Ventes ─────────────────────────────────────────────────
    {
        triggerFn: (p) =>
            ['/devis', '/bons-livraison', '/factures/vente', '/paiements-vente', '/customers'].some(
                (prefix) => match(prefix)(p)
            ),
        tabs: [
            { label: 'Devis', to: '/devis', icon: FileCheck, isActive: match('/devis') },
            { label: 'Livraisons', to: '/bons-livraison', icon: PackageCheck, isActive: match('/bons-livraison') },
            { label: 'Factures', to: '/factures/vente', icon: FileText, isActive: (p) => p.startsWith('/factures/vente') },
            { label: 'Paiements', to: '/paiements-vente', icon: Wallet, isActive: match('/paiements-vente') },
            { label: 'Clients', to: '/customers', icon: UserCircle, isActive: match('/customers') },
        ],
    },

    // ── Achats ─────────────────────────────────────────────────
    {
        triggerFn: (p) =>
            ['/demande-prix', '/bon-achat', '/factures/achat', '/paiements-achat', '/fournisseurs'].some(
                (prefix) => match(prefix)(p)
            ),
        tabs: [
            { label: 'Demandes', to: '/demande-prix', icon: DollarSign, isActive: match('/demande-prix') },
            { label: 'Bons achat', to: '/bon-achat', icon: ShoppingBag, isActive: match('/bon-achat') },
            { label: 'Factures', to: '/factures/achat', icon: Receipt, isActive: (p) => p.startsWith('/factures/achat') },
            { label: 'Paiements', to: '/paiements-achat', icon: Wallet, isActive: match('/paiements-achat') },
            { label: 'Fournisseurs', to: '/fournisseurs', icon: Truck, isActive: match('/fournisseurs') },
        ],
    },

    // ── Stock ──────────────────────────────────────────────────
    {
        triggerFn: (p) =>
            ['/products', '/categories', '/warehouses', '/stock-movements', '/inventory-adjustments'].some(
                (prefix) => match(prefix)(p)
            ),
        tabs: [
            { label: 'Produits', to: '/products', icon: Package, isActive: match('/products') },
            { label: 'Catégories', to: '/categories', icon: FolderTree, isActive: match('/categories') },
            { label: 'Entrepôts', to: '/warehouses', icon: Building2, isActive: match('/warehouses') },
            { label: 'Mouvements', to: '/stock-movements', icon: ArrowLeftRight, isActive: match('/stock-movements') },
            { label: 'Ajustements', to: '/inventory-adjustments', icon: SlidersHorizontal, isActive: match('/inventory-adjustments') },
        ],
    },

    // ── Équipe ─────────────────────────────────────────────────
    {
        triggerFn: (p) =>
            match('/users')(p) || match('/roles')(p),
        tabs: [
            { label: 'Utilisateurs', to: '/users', icon: UsersRound, isActive: match('/users') },
            { label: 'Rôles', to: '/roles', icon: Shield, isActive: match('/roles') },
        ],
    },

    // ── Paramètres ─────────────────────────────────────────────
    {
        triggerFn: (p) => match('/configurations')(p),
        tabs: [
            { label: 'Aperçu', to: '/configurations', icon: Settings, isActive: (p) => p === '/configurations' },
            { label: 'Taxes', to: '/configurations/taxes', icon: Percent, isActive: (p) => p.startsWith('/configurations/taxes') },
            { label: 'Devises', to: '/configurations/currencies', icon: Globe, isActive: (p) => p.startsWith('/configurations/currencies') },
            { label: 'Conditions', to: '/configurations/payment-terms', icon: Calendar, isActive: (p) => p.startsWith('/configurations/payment-terms') },
            { label: 'Séquences', to: '/configurations/sequences', icon: Hash, isActive: (p) => p.startsWith('/configurations/sequences') },
            { label: 'Unités', to: '/configurations/uom', icon: Ruler, isActive: (p) => p.startsWith('/configurations/uom') },
            { label: 'Inventaire', to: '/configurations/inventory', icon: Archive, isActive: (p) => p.startsWith('/configurations/inventory') },
            { label: 'Société', to: '/configurations/company', icon: Building, isActive: (p) => p.startsWith('/configurations/company') },
        ],
    },
];

export const ModuleTabBar = () => {
    const location = useLocation();
    const pathname = location.pathname;

    const conf = MODULE_CONFIGS.find((c) => c.triggerFn(pathname));
    if (!conf) return null;

    return (
        <div
            className="module-tab-bar"
            style={{
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                width: '100%',
                flexShrink: 0,
            }}
        >
            <div
                style={{
                    maxWidth: '1600px',
                    margin: '0 auto',
                    padding: '0 1.5rem',
                    display: 'flex',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                }}
            >
                {conf.tabs.map((tab) => {
                    const active = tab.isActive(pathname);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className="module-tab-link"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '0 0.875rem',
                                height: '2.625rem',
                                color: active ? '#235ae4' : '#64748b',
                                fontWeight: active ? 600 : 500,
                                fontSize: '0.8125rem',
                                textDecoration: 'none',
                                borderBottom: `2px solid ${active ? '#235ae4' : 'transparent'}`,
                                marginBottom: '-1px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                transition: 'color 0.15s, border-color 0.15s',
                            }}
                        >
                            <Icon
                                style={{ width: 14, height: 14, flexShrink: 0 }}
                                strokeWidth={active ? 2.25 : 1.75}
                            />
                            {tab.label}
                        </Link>
                    );
                })}
            </div>
            <style>{`
                .module-tab-bar::-webkit-scrollbar { display: none; }
                .module-tab-bar > div::-webkit-scrollbar { display: none; }
                .module-tab-link:hover { color: #334155 !important; }
                .module-tab-link[style*="color: rgb(35, 90, 228)"]:hover { color: #235ae4 !important; }
                @media (max-width: 767px) {
                    .module-tab-bar > div { padding: 0 0.75rem; }
                    .module-tab-link { padding: 0 0.625rem; font-size: 0.75rem; }
                }
            `}</style>
        </div>
    );
};
