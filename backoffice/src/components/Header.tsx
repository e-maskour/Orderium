import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { NotificationBellPro } from './NotificationBellPro';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import { Divider } from 'primereact/divider';
import {
    LogOut, Menu, X, Search, TrendingUp, TrendingDown, Package, FileCheck,
    PackageCheck, FileText, Wallet, UserCircle, DollarSign, ShoppingBag, Receipt,
    Truck, FolderTree, Building2, LayoutDashboard, Settings, Bell,
} from 'lucide-react';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { toastInfo } from '../services/toast.service';

interface HeaderProps {
    isSidebarOpen?: boolean;
    onMenuToggle?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Lang = 'en' | 'fr' | 'ar';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SearchRoute { path: string; labels: Record<Lang, string>; descriptions: Record<Lang, string>; icon: React.ComponentType<any>; group: string; keywords?: string[]; }

const APP_ROUTES: SearchRoute[] = [
    { path: '/dashboard', labels: { en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة القيادة' }, descriptions: { en: 'Overview & statistics', fr: 'Aperçu & statistiques', ar: 'نظرة عامة وإحصائيات' }, icon: LayoutDashboard, group: 'Main', keywords: ['accueil', 'الرئيسية'] },
    { path: '/orders', labels: { en: 'Orders', fr: 'Commandes', ar: 'الطلبات' }, descriptions: { en: 'Manage orders', fr: 'Gérer les commandes', ar: 'إدارة الطلبات' }, icon: ShoppingBag, group: 'Main', keywords: ['commande', 'طلب', 'order'] },
    { path: '/pos', labels: { en: 'Point of Sale', fr: 'Point de Vente', ar: 'نقطة البيع' }, descriptions: { en: 'POS terminal', fr: 'Terminal de caisse', ar: 'كاشير' }, icon: DollarSign, group: 'Main', keywords: ['pos', 'caisse', 'كاشير', 'vente'] },
    { path: '/notifications', labels: { en: 'Notifications', fr: 'Notifications', ar: 'الإشعارات' }, descriptions: { en: 'All notifications', fr: 'Toutes les notifications', ar: 'جميع الإشعارات' }, icon: Bell, group: 'Main', keywords: ['alertes', 'تنبيهات'] },
    { path: '/devis', labels: { en: 'Quotes', fr: 'Devis', ar: 'عروض الأسعار' }, descriptions: { en: 'Sales quotes list', fr: 'Liste des devis', ar: 'قائمة عروض الأسعار' }, icon: FileCheck, group: 'Sales', keywords: ['devis', 'عرض سعر', 'quote', 'offre', 'cotation'] },
    { path: '/devis/create', label: 'New Quote', description: 'Create a sales quote', icon: FileCheck, group: 'Sales', keywords: ['create', 'nouveau', 'devis', 'إنشاء عرض', 'عرض جديد', 'créer devis'] },
    { path: '/bons-livraison', label: 'Delivery Notes', description: 'Bons de livraison', icon: PackageCheck, group: 'Sales', keywords: ['bons de livraison', 'bon livraison', 'livraison', 'وصل التسليم', 'تسليم'] },
    { path: '/bons-livraison/create', label: 'New Delivery Note', description: 'Create delivery note', icon: PackageCheck, group: 'Sales', keywords: ['nouveau bon livraison', 'وصل تسليم جديد', 'créer livraison'] },
    { path: '/factures/vente', label: 'Sales Invoices', description: 'Factures de vente', icon: FileText, group: 'Sales', keywords: ['factures vente', 'facture', 'فواتير البيع', 'فاتورة بيع', 'invoice'] },
    { path: '/factures/vente/create', label: 'New Sales Invoice', description: 'Create sales invoice', icon: FileText, group: 'Sales', keywords: ['nouvelle facture vente', 'فاتورة بيع جديدة'] },
    { path: '/paiements-vente', label: 'Sales Payments', description: 'Paiements de vente', icon: Wallet, group: 'Sales', keywords: ['paiements vente', 'paiement', 'مدفوعات البيع', 'دفع', 'règlement'] },
    { path: '/customers', label: 'Customers', description: 'Manage customers', icon: UserCircle, group: 'Sales', keywords: ['clients', 'client', 'العملاء', 'عميل', 'customers', 'clientèle'] },
    { path: '/customers/create', label: 'New Customer', description: 'Create a customer', icon: UserCircle, group: 'Sales', keywords: ['nouveau client', 'عميل جديد', 'create customer'] },
    { path: '/demande-prix', label: 'Price Requests', description: 'Demandes de prix', icon: DollarSign, group: 'Purchases', keywords: ['demande prix', 'طلب سعر', 'tarif', 'rfq', 'استفسار'] },
    { path: '/demande-prix/create', label: 'New Price Request', description: 'Create price request', icon: DollarSign, group: 'Purchases', keywords: ['nouvelle demande prix', 'طلب سعر جديد'] },
    { path: '/bon-achat', label: 'Purchase Orders', description: "Bons d'achat", icon: ShoppingBag, group: 'Purchases', keywords: ["bon d'achat", 'achat', 'أوامر الشراء', 'طلب شراء', 'po', 'commande achat'] },
    { path: '/bon-achat/create', label: 'New Purchase Order', description: 'Create purchase order', icon: ShoppingBag, group: 'Purchases', keywords: ["nouveau bon d'achat", 'طلب شراء جديد'] },
    { path: '/factures/achat', label: 'Purchase Invoices', description: "Factures d'achat", icon: Receipt, group: 'Purchases', keywords: ["factures achat", 'facture achat', 'فواتير الشراء', 'فاتورة شراء'] },
    { path: '/factures/achat/create', label: 'New Purchase Invoice', description: 'Create purchase invoice', icon: Receipt, group: 'Purchases', keywords: ['nouvelle facture achat', 'فاتورة شراء جديدة'] },
    { path: '/paiements-achat', label: 'Purchase Payments', description: "Paiements d'achat", icon: Wallet, group: 'Purchases', keywords: ["paiements achat", 'مدفوعات الشراء', 'دفع شراء'] },
    { path: '/fournisseurs', label: 'Suppliers', description: 'Manage suppliers', icon: Truck, group: 'Purchases', keywords: ['fournisseurs', 'fournisseur', 'الموردون', 'مورد', 'vendors', 'prestataire'] },
    { path: '/fournisseurs/create', label: 'New Supplier', description: 'Create a supplier', icon: Truck, group: 'Purchases', keywords: ['nouveau fournisseur', 'مورد جديد'] },
    { path: '/products', label: 'Products', description: 'Products catalog', icon: Package, group: 'Inventory', keywords: ['produits', 'produit', 'المنتجات', 'منتج', 'articles', 'catalogue'] },
    { path: '/products/create', label: 'New Product', description: 'Create a product', icon: Package, group: 'Inventory', keywords: ['nouveau produit', 'منتج جديد', 'create product'] },
    { path: '/categories', label: 'Categories', description: 'Product categories', icon: FolderTree, group: 'Inventory', keywords: ['catégories', 'catégorie', 'التصنيفات', 'تصنيف', 'famille'] },
    { path: '/warehouses', label: 'Warehouses', description: 'Depots & warehouses', icon: Building2, group: 'Inventory', keywords: ['entrepôts', 'entrepôt', 'dépôt', 'depot', 'المستودعات', 'مستودع', 'magasin'] },
    { path: '/stock-movements', label: 'Stock Movements', description: 'Movement history', icon: TrendingUp, group: 'Inventory', keywords: ['mouvements stock', 'mouvement', 'حركات المخزون', 'حركة مخزون', 'stock'] },
    { path: '/inventory-adjustments', label: 'Inventory Adjustments', description: 'Adjust stock levels', icon: FileCheck, group: 'Inventory', keywords: ["ajustements d'inventaire", 'inventaire', 'تعديلات المخزون', 'تعديل مخزون'] },
    { path: '/configurations', label: 'Configurations', description: 'App settings', icon: Settings, group: 'Settings', keywords: ['paramètres', 'configuration', 'إعدادات', 'ضبط', 'settings', 'réglages'] },
    { path: '/configurations/taxes', label: 'Taxes', description: 'Tax configuration', icon: Settings, group: 'Settings', keywords: ['taxes', 'tva', 'الضرائب', 'ضريبة', 'impôts', 'fiscal'] },
    { path: '/configurations/currencies', label: 'Currencies', description: 'Currency settings', icon: DollarSign, group: 'Settings', keywords: ['devises', 'monnaie', 'العملات', 'عملة', 'currency', 'forex'] },
    { path: '/configurations/payment-terms', label: 'Payment Terms', description: 'Payment term settings', icon: Wallet, group: 'Settings', keywords: ['conditions paiement', 'شروط الدفع', 'délai', 'règlement'] },
    { path: '/configurations/sequences', label: 'Sequences', description: 'Document sequences', icon: FileText, group: 'Settings', keywords: ['séquences', 'numérotation', 'تسلسلات', 'ترقيم'] },
    { path: '/configurations/uom', label: 'Units of Measure', description: 'UOM configuration', icon: Package, group: 'Settings', keywords: ['unités mesure', 'unité', 'وحدات القياس', 'وحدة قياس', 'uom'] },
    { path: '/configurations/company', label: 'Company Settings', description: 'Company information', icon: Building2, group: 'Settings', keywords: ['société', 'entreprise', 'معلومات الشركة', 'الشركة', 'paramètres société'] },
    { path: '/delivery-persons', label: 'Delivery Persons', description: 'Manage delivery staff', icon: Truck, group: 'HR', keywords: ['livreurs', 'livreur', 'عمال التوصيل', 'توصيل', 'coursier', 'chauffeur'] },
];

const GROUP_CONFIG: Record<string, { color: string; bg: string }> = {
    Main: { color: '#6366f1', bg: '#eef2ff' },
    Sales: { color: '#10b981', bg: '#ecfdf5' },
    Purchases: { color: '#f59e0b', bg: '#fffbeb' },
    Inventory: { color: '#3b82f6', bg: '#eff6ff' },
    Settings: { color: '#8b5cf6', bg: '#f5f3ff' },
    HR: { color: '#ec4899', bg: '#fdf2f8' },
};

const QUICK_ACCESS_PATHS = ['/dashboard', '/orders', '/products', '/customers', '/devis', '/factures/vente'];

export const Header = ({ isSidebarOpen = false, onMenuToggle }: HeaderProps) => {
    const { admin, logout } = useAuth();
    const { t, language } = useLanguage();
    const lang: Lang = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en';
    const isRTL = lang === 'ar';
    const navigate = useNavigate();
    const location = useLocation();
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [canInstall, setCanInstall] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const subNavGroups = useMemo(() => [
        {
            key: 'ventes',
            label: t('sales'),
            Icon: TrendingUp,
            items: [
                { path: '/devis', Icon: FileCheck, label: t('quote') },
                { path: '/bons-livraison', Icon: PackageCheck, label: t('deliveryNote') },
                { path: '/factures/vente', Icon: FileText, label: t('salesInvoice') },
                { path: '/paiements-vente', Icon: Wallet, label: t('payments') },
                { path: '/customers', Icon: UserCircle, label: t('clients') },
            ],
        },
        {
            key: 'achats',
            label: t('purchases'),
            Icon: TrendingDown,
            items: [
                { path: '/demande-prix', Icon: DollarSign, label: t('priceRequest') },
                { path: '/bon-achat', Icon: ShoppingBag, label: t('purchaseOrder') },
                { path: '/factures/achat', Icon: Receipt, label: t('purchaseInvoice') },
                { path: '/paiements-achat', Icon: Wallet, label: t('payments') },
                { path: '/fournisseurs', Icon: Truck, label: t('suppliers') },
            ],
        },
        {
            key: 'products',
            label: t('products'),
            Icon: Package,
            items: [
                { path: '/products', Icon: Package, label: t('products') },
                { path: '/categories', Icon: FolderTree, label: t('categories') },
                { path: '/warehouses', Icon: Building2, label: t('warehouses') },
                { path: '/stock-movements', Icon: TrendingUp, label: t('stockMovements') },
                { path: '/inventory-adjustments', Icon: FileCheck, label: t('inventoryAdjustments') },
            ],
        },
    ], [t]);

    const isSubItemActive = (path: string) => location.pathname.startsWith(path);
    const isGroupActive = (group: typeof subNavGroups[0]) => group.items.some(i => isSubItemActive(i.path));

    // Filtered results
    const filteredRoutes = useMemo(() => {
        if (!searchQuery.trim()) {
            return APP_ROUTES.filter(r => QUICK_ACCESS_PATHS.includes(r.path));
        }
        const q = searchQuery.toLowerCase();
        return APP_ROUTES.filter(r =>
            Object.values(r.labels).some(l => l.toLowerCase().includes(q)) ||
            Object.values(r.descriptions).some(d => d.toLowerCase().includes(q)) ||
            r.path.toLowerCase().includes(q) ||
            r.keywords?.some(k => k.toLowerCase().includes(q)) ||
            r.group.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    // Grouped results for rendering
    const groupedResults = useMemo(() => {
        const groups: Record<string, SearchRoute[]> = {};
        filteredRoutes.forEach(r => {
            if (!groups[r.group]) groups[r.group] = [];
            groups[r.group].push(r);
        });
        return groups;
    }, [filteredRoutes]);

    const openSearch = useCallback(() => {
        setIsSearchOpen(true);
        setSearchQuery('');
        setActiveIndex(-1);
        setTimeout(() => searchInputRef.current?.focus(), 60);
    }, []);

    const closeSearch = useCallback(() => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setActiveIndex(-1);
    }, []);

    const goTo = useCallback((path: string) => {
        navigate(path);
        closeSearch();
    }, [navigate, closeSearch]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') { closeSearch(); return; }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, filteredRoutes.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            goTo(filteredRoutes[activeIndex].path);
        }
    };

    // Scroll active item into view
    useEffect(() => {
        if (activeIndex < 0) return;
        const el = resultsRef.current?.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    // Reset active index when results change
    useEffect(() => { setActiveIndex(-1); }, [filteredRoutes]);

    // Global ⌘K / Ctrl+K shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                isSearchOpen ? closeSearch() : openSearch();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isSearchOpen, openSearch, closeSearch]);

    useEffect(() => {
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
        const iOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
        setIsIOS(iOS);
        if (isStandalone) { setCanInstall(false); return; }
        if (iOS) { setCanInstall(true); return; }
        const handleBefore = (event: Event) => { setInstallPrompt(event as BeforeInstallPromptEvent); setCanInstall(true); };
        const handleInstalled = () => { setCanInstall(false); setInstallPrompt(null); };
        window.addEventListener('beforeinstallprompt', handleBefore as EventListener);
        window.addEventListener('appinstalled', handleInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBefore as EventListener);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!installPrompt) { if (isIOS) toastInfo(t('iosInstallHint')); return; }
        try {
            await installPrompt.prompt();
            const choice = await installPrompt.userChoice;
            if (choice.outcome === 'accepted') { setCanInstall(false); setInstallPrompt(null); }
        } catch { setCanInstall(false); setInstallPrompt(null); }
    };

    const handleLogout = () => { logout(); navigate('/login'); };
    const getInitials = () => (admin?.fullName || admin?.phoneNumber || 'A').charAt(0).toUpperCase();

    // Flat index counter for keyboard nav across groups
    let globalIdx = -1;

    return (
        <>
            <div style={{ position: 'sticky', top: 0, zIndex: 100, direction: language === 'ar' ? 'rtl' : 'ltr', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.97)', borderBottom: '1px solid #e5e7eb' }}>
                {/* ── Top Bar ── */}
                <header className="flex align-items-center justify-content-between" style={{ height: '4.25rem', padding: '0 1.5rem' }}>
                    {/* Left */}
                    <div className="flex align-items-center" style={{ gap: '0.125rem' }}>
                        <Button
                            text rounded onClick={onMenuToggle}
                            className="lg:hidden flex-shrink-0"
                            style={{ width: '2.25rem', height: '2.25rem', marginRight: '0.5rem' }}
                            icon={isSidebarOpen
                                ? <X style={{ width: '1.125rem', height: '1.125rem', color: '#374151' }} />
                                : <Menu style={{ width: '1.125rem', height: '1.125rem', color: '#374151' }} />}
                            aria-label="Toggle menu"
                        />
                        {/* ── Inline Menubar ── */}
                        {(() => {
                            const activeGroup = subNavGroups.find(g => isGroupActive(g));
                            if (!activeGroup) return null;
                            return activeGroup.items.map((item) => {
                                const ItemIcon = item.Icon;
                                const active = isSubItemActive(item.path);
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className="hidden lg:flex"
                                        style={{
                                            alignItems: 'center', gap: '0.375rem',
                                            padding: '0 0.625rem',
                                            height: '4.25rem',
                                            fontSize: '0.78125rem',
                                            fontWeight: active ? 600 : 500,
                                            fontFamily: language === 'ar' ? 'var(--font-arabic)' : 'var(--font-latin)',
                                            color: active ? '#d97706' : '#374151',
                                            background: 'transparent',
                                            border: 'none',
                                            boxShadow: active ? 'inset 0 -2px 0 #d97706' : 'none',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s ease',
                                            flexShrink: 0,
                                        }}
                                        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = '#111827'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)'; } }}
                                        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; } }}
                                    >
                                        <ItemIcon style={{ width: '0.875rem', height: '0.875rem', flexShrink: 0, opacity: active ? 1 : 0.6 }} strokeWidth={1.75} />
                                        {item.label}
                                    </button>
                                );
                            });
                        })()}
                    </div>

                    {/* Right */}
                    <div className="flex align-items-center gap-2">
                        {canInstall && (
                            <Button
                                label={t('install') || 'Install'} size="small" rounded onClick={handleInstallClick}
                                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.875rem' }}
                            />
                        )}

                        {/* Search icon button */}
                        <button
                            onClick={openSearch}
                            title="Search (⌘K)"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.25rem', height: '2.25rem', border: 'none', background: 'transparent', borderRadius: '0.5rem', cursor: 'pointer', color: '#6b7280', transition: 'all 0.15s ease' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
                        >
                            <Search style={{ width: '1.125rem', height: '1.125rem' }} strokeWidth={1.75} />
                        </button>

                        <NotificationBellPro />
                        <LanguageToggle />

                        <Divider layout="vertical" className="hidden sm:flex" style={{ height: '1.5rem', margin: '0 0.25rem' }} />

                        <div className="flex align-items-center gap-2">
                            <Avatar
                                label={getInitials()} shape="circle" size="normal"
                                style={{ background: 'linear-gradient(135deg,#1e1e2d,#16213e)', color: '#f59e0b', fontWeight: 700, fontSize: '0.8125rem', width: '2.25rem', height: '2.25rem' }}
                            />
                            <div className="hidden sm:flex flex-column" style={{ lineHeight: 1.3 }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', fontFamily: language === 'ar' ? 'var(--font-arabic)' : 'var(--font-latin)', letterSpacing: language === 'ar' ? '0' : '-0.01em' }}>
                                    {admin?.fullName || admin?.phoneNumber || 'Admin'}
                                </span>
                                <span style={{ fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 500, fontFamily: language === 'ar' ? 'var(--font-arabic)' : 'var(--font-latin)', letterSpacing: language === 'ar' ? '0' : '0.01em' }}>
                                    {t('administrator') || t('adminBackoffice')}
                                </span>
                            </div>
                            <Button
                                text rounded severity="secondary" size="small"
                                onClick={handleLogout} tooltip={t('logout')} tooltipOptions={{ position: 'bottom' }}
                                className="flex-shrink-0" style={{ width: '2rem', height: '2rem', color: '#6b7280' }}
                            >
                                <LogOut style={{ width: '0.9375rem', height: '0.9375rem' }} strokeWidth={1.75} />
                            </Button>
                        </div>
                    </div>
                </header>


            </div>

            {/* ── Global Search Modal ── */}
            {isSearchOpen && (() => {
                const ui = SEARCH_UI[lang];
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4.5rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                        {/* Backdrop */}
                        <div onClick={closeSearch} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }} />

                        {/* Modal card */}
                        <div style={{ position: 'relative', width: '100%', maxWidth: '640px', background: 'white', borderRadius: '1.125rem', boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06)', overflow: 'hidden', animation: 'searchModalIn 0.18s cubic-bezier(0.16,1,0.3,1)', direction: isRTL ? 'rtl' : 'ltr', fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-latin)' }}>

                            {/* Search input row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                                <Search style={{ width: '1.25rem', height: '1.25rem', color: '#9ca3af', flexShrink: 0 }} strokeWidth={1.75} />
                                <InputText
                                    ref={searchInputRef}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={ui.placeholder}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9375rem', color: '#111827', background: 'transparent', fontFamily: 'inherit', textAlign: isRTL ? 'right' : 'left', boxShadow: 'none', padding: 0 }}
                                />
                                {searchQuery ? (
                                    <button onClick={() => setSearchQuery('')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', border: 'none', background: '#f1f5f9', borderRadius: '0.375rem', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}>
                                        <X style={{ width: '0.875rem', height: '0.875rem' }} />
                                    </button>
                                ) : (
                                    <kbd style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.6875rem', color: '#94a3b8', fontFamily: 'inherit', flexShrink: 0 }}>
                                        Esc
                                    </kbd>
                                )}
                            </div>

                            {/* Results */}
                            <div ref={resultsRef} style={{ maxHeight: '26rem', overflowY: 'auto', padding: '0.5rem 0' }}>
                                {filteredRoutes.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                                        <Search style={{ width: '2rem', height: '2rem', marginBottom: '0.75rem', opacity: 0.4 }} />
                                        <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{ui.noResults}</p>
                                        <p style={{ fontSize: '0.75rem', margin: '0.375rem 0 0', color: '#cbd5e1' }}>{ui.noResultsHint}</p>
                                    </div>
                                ) : (
                                    Object.entries(groupedResults).map(([groupName, routes]) => {
                                        const gc = GROUP_CONFIG[groupName] || { color: '#6b7280', bg: '#f9fafb' };
                                        const gLabel = GROUP_NAMES[groupName]?.[lang] ?? groupName;
                                        return (
                                            <div key={groupName}>
                                                {/* Group header */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem 0.25rem', marginTop: '0.25rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: isRTL ? '0' : '0.08em', color: gc.color }}>{gLabel}</span>
                                                    <div style={{ flex: 1, height: '1px', background: gc.bg }} />
                                                </div>

                                                {/* Route items */}
                                                {routes.map((route) => {
                                                    globalIdx++;
                                                    const idx = globalIdx;
                                                    const RouteIcon = route.icon;
                                                    const isActive = idx === activeIndex;
                                                    return (
                                                        <button
                                                            key={route.path}
                                                            data-idx={idx}
                                                            onClick={() => goTo(route.path)}
                                                            onMouseEnter={() => setActiveIndex(idx)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.875rem',
                                                                width: '100%', padding: '0.625rem 1.25rem',
                                                                border: 'none', cursor: 'pointer',
                                                                textAlign: isRTL ? 'right' : 'left',
                                                                flexDirection: isRTL ? 'row-reverse' : 'row',
                                                                background: isActive ? gc.bg : 'transparent',
                                                                transition: 'background 0.1s ease',
                                                            }}
                                                        >
                                                            {/* Icon */}
                                                            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: isActive ? gc.color : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s ease' }}>
                                                                <RouteIcon style={{ width: '0.875rem', height: '0.875rem', color: isActive ? 'white' : '#64748b' }} strokeWidth={1.75} />
                                                            </div>
                                                            {/* Text */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: isActive ? 600 : 500, color: isActive ? '#0f172a' : '#1e293b', lineHeight: 1.3 }}>{route.labels[lang]}</p>
                                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.3, marginTop: '0.1rem' }}>{route.descriptions[lang]}</p>
                                                            </div>
                                                            {/* Arrow indicator */}
                                                            {isActive && (
                                                                <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.375rem', background: gc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isRTL ? 'scaleX(-1)' : undefined }}>
                                                                        <path d="M2 5h6M5 2l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1.25rem', borderTop: '1px solid #f1f5f9', background: '#fafafa', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    {[
                                        { keys: ['↑', '↓'], label: ui.navigate },
                                        { keys: ['↵'], label: ui.go },
                                        { keys: ['Esc'], label: ui.close },
                                    ].map(({ keys, label }) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                            {keys.map(k => (
                                                <kbd key={k} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.375rem', height: '1.375rem', padding: '0 0.25rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.3125rem', fontSize: '0.6875rem', color: '#64748b', fontFamily: 'inherit', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>{k}</kbd>
                                            ))}
                                            <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{label}</span>
                                        </div>
                                    ))}
                                </div>
                                {!searchQuery && (
                                    <span style={{ fontSize: '0.6875rem', color: '#cbd5e1', fontWeight: 500 }}>{ui.quickAccess}</span>
                                )}
                                {searchQuery && (
                                    <span style={{ fontSize: '0.6875rem', color: '#cbd5e1', fontWeight: 500 }}>{ui.results(filteredRoutes.length)}</span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            <style>{`
                @keyframes searchModalIn {
                    from { opacity: 0; transform: scale(0.97) translateY(-8px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </>
    );
};
