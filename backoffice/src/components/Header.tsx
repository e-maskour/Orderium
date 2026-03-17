import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { NotificationBellPro } from './NotificationBellPro';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import { Divider } from 'primereact/divider';
import { InputText } from 'primereact/inputtext';
import {
    LogOut, Menu, X, Search, TrendingUp, TrendingDown, Package, FileCheck,
    PackageCheck, FileText, Wallet, UserCircle, DollarSign, ShoppingBag, Receipt,
    Truck, FolderTree, Building2, LayoutDashboard, Settings, Bell,
    Clock, Star, Plus, BarChart2, ShoppingCart, History, HardDrive, Users, CreditCard,
} from 'lucide-react';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { toastInfo } from '../services/toast.service';

const RECENT_KEY = 'orderium_search_recent';
const MAX_RECENT = 6;

interface HeaderProps {
    isSidebarOpen?: boolean;
    onMenuToggle?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Lang = 'en' | 'fr' | 'ar';

interface SearchRoute { path: string; labels: Record<Lang, string>; descriptions: Record<Lang, string>; icon: React.ComponentType<any>; group: string; type?: 'page' | 'create' | 'settings' | 'report'; keywords?: string[]; }

const APP_ROUTES: SearchRoute[] = [
    // ── Main ──
    { path: '/dashboard', labels: { en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة القيادة' }, descriptions: { en: 'Overview & statistics', fr: 'Aperçu & statistiques', ar: 'نظرة عامة وإحصائيات' }, icon: LayoutDashboard, group: 'Main', type: 'page', keywords: ['accueil', 'الرئيسية', 'home', 'stats', 'overview'] },
    { path: '/orders', labels: { en: 'Orders', fr: 'Commandes', ar: 'الطلبات' }, descriptions: { en: 'Manage customer orders', fr: 'Gérer les commandes clients', ar: 'إدارة طلبات العملاء' }, icon: ShoppingCart, group: 'Main', type: 'page', keywords: ['commande', 'طلب', 'order', 'livraison', 'delivery'] },
    { path: '/pos', labels: { en: 'Point of Sale', fr: 'Point de Vente', ar: 'نقطة البيع' }, descriptions: { en: 'POS terminal & cash register', fr: 'Terminal de caisse', ar: 'كاشير ونقطة البيع' }, icon: DollarSign, group: 'Main', type: 'page', keywords: ['pos', 'caisse', 'كاشير', 'vente', 'cash', 'register', 'terminal'] },
    { path: '/notifications', labels: { en: 'Notifications', fr: 'Notifications', ar: 'الإشعارات' }, descriptions: { en: 'All system notifications', fr: 'Toutes les notifications', ar: 'جميع إشعارات النظام' }, icon: Bell, group: 'Main', type: 'page', keywords: ['alertes', 'تنبيهات', 'alerts', 'messages'] },
    { path: '/delivery-persons', labels: { en: 'Delivery Persons', fr: 'Livreurs', ar: 'عمال التوصيل' }, descriptions: { en: 'Manage delivery staff', fr: 'Gérer les livreurs', ar: 'إدارة عمال التوصيل' }, icon: Truck, group: 'Main', type: 'page', keywords: ['livreurs', 'livreur', 'عمال التوصيل', 'توصيل', 'coursier', 'chauffeur', 'delivery'] },
    // ── Sales ──
    { path: '/devis', labels: { en: 'Quotes', fr: 'Devis', ar: 'عروض الأسعار' }, descriptions: { en: 'Sales quotes list', fr: 'Liste des devis', ar: 'قائمة عروض الأسعار' }, icon: FileCheck, group: 'Sales', type: 'page', keywords: ['devis', 'عرض سعر', 'quote', 'offre', 'cotation', 'proposal'] },
    { path: '/devis/create', labels: { en: 'New Quote', fr: 'Nouveau Devis', ar: 'عرض سعر جديد' }, descriptions: { en: 'Create a sales quote', fr: 'Créer un nouveau devis', ar: 'إنشاء عرض سعر جديد' }, icon: FileCheck, group: 'Sales', type: 'create', keywords: ['créer devis', 'nouveau devis', 'إنشاء عرض', 'new quote', 'create quote'] },
    { path: '/bons-livraison', labels: { en: 'Delivery Notes', fr: 'Bons de Livraison', ar: 'وصولات التسليم' }, descriptions: { en: 'Delivery notes list', fr: 'Liste des bons de livraison', ar: 'قائمة وصولات التسليم' }, icon: PackageCheck, group: 'Sales', type: 'page', keywords: ['bon livraison', 'livraison', 'وصل تسليم', 'bl', 'shipping'] },
    { path: '/bons-livraison/create', labels: { en: 'New Delivery Note', fr: 'Nouveau Bon de Livraison', ar: 'وصل تسليم جديد' }, descriptions: { en: 'Create a delivery note', fr: 'Créer un bon de livraison', ar: 'إنشاء وصل تسليم' }, icon: PackageCheck, group: 'Sales', type: 'create', keywords: ['nouveau bon livraison', 'créer livraison', 'وصل تسليم جديد'] },
    { path: '/factures/vente', labels: { en: 'Sales Invoices', fr: 'Factures de Vente', ar: 'فواتير البيع' }, descriptions: { en: 'Sales invoices list', fr: 'Liste des factures de vente', ar: 'قائمة فواتير البيع' }, icon: FileText, group: 'Sales', type: 'page', keywords: ['facture vente', 'فاتورة بيع', 'invoice', 'billing'] },
    { path: '/factures/vente/create', labels: { en: 'New Sales Invoice', fr: 'Nouvelle Facture de Vente', ar: 'فاتورة بيع جديدة' }, descriptions: { en: 'Create a sales invoice', fr: 'Créer une facture de vente', ar: 'إنشاء فاتورة بيع' }, icon: FileText, group: 'Sales', type: 'create', keywords: ['nouvelle facture vente', 'فاتورة بيع جديدة', 'new invoice'] },
    { path: '/paiements-vente', labels: { en: 'Sales Payments', fr: 'Paiements de Vente', ar: 'مدفوعات البيع' }, descriptions: { en: 'Track sales payments & receipts', fr: 'Suivi des paiements de vente', ar: 'تتبع مدفوعات البيع' }, icon: Wallet, group: 'Sales', type: 'page', keywords: ['paiements vente', 'paiement', 'مدفوعات البيع', 'règlement', 'encaissement', 'receipt'] },
    { path: '/customers', labels: { en: 'Customers', fr: 'Clients', ar: 'العملاء' }, descriptions: { en: 'Manage your customers', fr: 'Gérer votre clientèle', ar: 'إدارة قائمة العملاء' }, icon: UserCircle, group: 'Sales', type: 'page', keywords: ['clients', 'العملاء', 'customers', 'clientèle', 'buyer', 'acheteur'] },
    { path: '/customers/create', labels: { en: 'New Customer', fr: 'Nouveau Client', ar: 'عميل جديد' }, descriptions: { en: 'Create a new customer', fr: 'Créer un nouveau client', ar: 'إنشاء عميل جديد' }, icon: UserCircle, group: 'Sales', type: 'create', keywords: ['nouveau client', 'عميل جديد', 'create customer', 'add client'] },
    // ── Purchases ──
    { path: '/demande-prix', labels: { en: 'Price Requests', fr: 'Demandes de Prix', ar: 'طلبات الأسعار' }, descriptions: { en: 'Supplier price requests (RFQ)', fr: 'Demandes de prix fournisseurs', ar: 'طلبات أسعار من الموردين' }, icon: DollarSign, group: 'Purchases', type: 'page', keywords: ['demande prix', 'طلب سعر', 'rfq', 'tarif', 'استفسار'] },
    { path: '/demande-prix/create', labels: { en: 'New Price Request', fr: 'Nouvelle Demande de Prix', ar: 'طلب سعر جديد' }, descriptions: { en: 'Create a new RFQ', fr: 'Créer une demande de prix', ar: 'إنشاء طلب سعر جديد' }, icon: DollarSign, group: 'Purchases', type: 'create', keywords: ['nouvelle demande prix', 'طلب سعر جديد', 'new rfq'] },
    { path: '/bon-achat', labels: { en: 'Purchase Orders', fr: "Bons d'Achat", ar: 'أوامر الشراء' }, descriptions: { en: 'Purchase orders list', fr: "Liste des bons d'achat", ar: 'قائمة أوامر الشراء' }, icon: ShoppingBag, group: 'Purchases', type: 'page', keywords: ["bon d'achat", 'achat', 'أوامر الشراء', 'po', 'purchase order', 'commande achat'] },
    { path: '/bon-achat/create', labels: { en: 'New Purchase Order', fr: "Nouveau Bon d'Achat", ar: 'أمر شراء جديد' }, descriptions: { en: 'Create a purchase order', fr: "Créer un bon d'achat", ar: 'إنشاء أمر شراء' }, icon: ShoppingBag, group: 'Purchases', type: 'create', keywords: ["nouveau bon d'achat", 'أمر شراء جديد', 'new po'] },
    { path: '/factures/achat', labels: { en: 'Purchase Invoices', fr: "Factures d'Achat", ar: 'فواتير الشراء' }, descriptions: { en: 'Purchase invoices list', fr: "Liste des factures d'achat", ar: 'قائمة فواتير الشراء' }, icon: Receipt, group: 'Purchases', type: 'page', keywords: ["facture achat", 'فاتورة شراء', 'vendor invoice', 'bill'] },
    { path: '/factures/achat/create', labels: { en: 'New Purchase Invoice', fr: "Nouvelle Facture d'Achat", ar: 'فاتورة شراء جديدة' }, descriptions: { en: 'Create a purchase invoice', fr: "Créer une facture d'achat", ar: 'إنشاء فاتورة شراء' }, icon: Receipt, group: 'Purchases', type: 'create', keywords: ['nouvelle facture achat', 'فاتورة شراء جديدة', 'new bill'] },
    { path: '/paiements-achat', labels: { en: 'Purchase Payments', fr: "Paiements d'Achat", ar: 'مدفوعات الشراء' }, descriptions: { en: 'Track supplier payments', fr: "Suivi des paiements d'achat", ar: 'تتبع مدفوعات الموردين' }, icon: Wallet, group: 'Purchases', type: 'page', keywords: ["paiements achat", 'مدفوعات الشراء', 'règlement fournisseur'] },
    { path: '/fournisseurs', labels: { en: 'Suppliers', fr: 'Fournisseurs', ar: 'الموردون' }, descriptions: { en: 'Manage your suppliers', fr: 'Gérer vos fournisseurs', ar: 'إدارة قائمة الموردين' }, icon: Truck, group: 'Purchases', type: 'page', keywords: ['fournisseurs', 'الموردون', 'vendors', 'suppliers', 'prestataire'] },
    { path: '/fournisseurs/create', labels: { en: 'New Supplier', fr: 'Nouveau Fournisseur', ar: 'مورد جديد' }, descriptions: { en: 'Create a new supplier', fr: 'Créer un nouveau fournisseur', ar: 'إنشاء مورد جديد' }, icon: Truck, group: 'Purchases', type: 'create', keywords: ['nouveau fournisseur', 'مورد جديد', 'new vendor', 'add supplier'] },
    // ── Inventory ──
    { path: '/products', labels: { en: 'Products', fr: 'Produits', ar: 'المنتجات' }, descriptions: { en: 'Browse & manage products', fr: 'Parcourir & gérer les produits', ar: 'تصفح وإدارة المنتجات' }, icon: Package, group: 'Inventory', type: 'page', keywords: ['produits', 'المنتجات', 'articles', 'catalogue', 'sku', 'items'] },
    { path: '/products/create', labels: { en: 'New Product', fr: 'Nouveau Produit', ar: 'منتج جديد' }, descriptions: { en: 'Add a new product', fr: 'Ajouter un nouveau produit', ar: 'إضافة منتج جديد' }, icon: Package, group: 'Inventory', type: 'create', keywords: ['nouveau produit', 'منتج جديد', 'add product', 'new sku'] },
    { path: '/categories', labels: { en: 'Categories', fr: 'Catégories', ar: 'التصنيفات' }, descriptions: { en: 'Product category management', fr: 'Gestion des catégories', ar: 'إدارة تصنيفات المنتجات' }, icon: FolderTree, group: 'Inventory', type: 'page', keywords: ['catégories', 'التصنيفات', 'famille', 'taxonomy'] },
    { path: '/warehouses', labels: { en: 'Warehouses', fr: 'Entrepôts', ar: 'المستودعات' }, descriptions: { en: 'Warehouses & storage locations', fr: 'Entrepôts & emplacements de stockage', ar: 'المستودعات ومواقع التخزين' }, icon: Building2, group: 'Inventory', type: 'page', keywords: ['entrepôts', 'dépôt', 'depot', 'المستودعات', 'storage', 'location', 'magasin'] },
    { path: '/stock-movements', labels: { en: 'Stock Movements', fr: 'Mouvements de Stock', ar: 'حركات المخزون' }, descriptions: { en: 'Stock movement history & log', fr: 'Historique des mouvements de stock', ar: 'سجل حركات المخزون' }, icon: TrendingUp, group: 'Inventory', type: 'report', keywords: ['mouvements stock', 'حركات المخزون', 'stock log', 'mouvement'] },
    { path: '/inventory-adjustments', labels: { en: 'Inventory Adjustments', fr: "Ajustements d'Inventaire", ar: 'تعديلات المخزون' }, descriptions: { en: 'Adjust & correct stock levels', fr: 'Ajuster les niveaux de stock', ar: 'تعديل وتصحيح مستويات المخزون' }, icon: BarChart2, group: 'Inventory', type: 'page', keywords: ["ajustements d'inventaire", 'inventaire', 'تعديلات المخزون', 'stock count'] },
    // ── Drive ──
    { path: '/drive', labels: { en: 'Drive', fr: 'Drive', ar: 'Drive' }, descriptions: { en: 'Files, documents & cloud storage', fr: 'Fichiers, documents & stockage cloud', ar: 'الملفات والمستندات والتخزين' }, icon: HardDrive, group: 'Drive', type: 'page', keywords: ['fichiers', 'documents', 'ملفات', 'stockage', 'upload', 'télécharger', 'pièces jointes', 'attachments', 'cloud', 'storage', 'file manager', 'gestionnaire'] },
    // ── Settings ──
    { path: '/configurations', labels: { en: 'Configurations', fr: 'Configurations', ar: 'الإعدادات العامة' }, descriptions: { en: 'General app settings', fr: "Paramètres généraux de l'app", ar: 'إعدادات التطبيق العامة' }, icon: Settings, group: 'Settings', type: 'settings', keywords: ['paramètres', 'إعدادات', 'settings', 'config', 'réglages'] },
    { path: '/configurations/taxes', labels: { en: 'Taxes', fr: 'Taxes', ar: 'الضرائب' }, descriptions: { en: 'Tax rates & configuration', fr: 'Configuration des taxes & TVA', ar: 'معدلات الضرائب والإعدادات' }, icon: Settings, group: 'Settings', type: 'settings', keywords: ['taxes', 'tva', 'الضرائب', 'vat', 'impôts', 'fiscal'] },
    { path: '/configurations/currencies', labels: { en: 'Currencies', fr: 'Devises', ar: 'العملات' }, descriptions: { en: 'Currency & exchange rates', fr: 'Devises & taux de change', ar: 'العملات وأسعار الصرف' }, icon: DollarSign, group: 'Settings', type: 'settings', keywords: ['devises', 'monnaie', 'العملات', 'currency', 'exchange rate', 'forex'] },
    { path: '/configurations/payment-terms', labels: { en: 'Payment Terms', fr: 'Conditions de Paiement', ar: 'شروط الدفع' }, descriptions: { en: 'Payment terms & due dates', fr: 'Conditions & délais de paiement', ar: 'شروط الدفع وتواريخ الاستحقاق' }, icon: Wallet, group: 'Settings', type: 'settings', keywords: ['conditions paiement', 'شروط الدفع', 'délai', 'net 30'] },
    { path: '/configurations/sequences', labels: { en: 'Sequences', fr: 'Séquences', ar: 'تسلسلات الأرقام' }, descriptions: { en: 'Document numbering sequences', fr: 'Séquences de numérotation', ar: 'تسلسلات ترقيم المستندات' }, icon: FileText, group: 'Settings', type: 'settings', keywords: ['séquences', 'numérotation', 'تسلسلات', 'numbering', 'prefix'] },
    { path: '/configurations/uom', labels: { en: 'Units of Measure', fr: 'Unités de Mesure', ar: 'وحدات القياس' }, descriptions: { en: 'Units of measure configuration', fr: 'Configuration des unités de mesure', ar: 'إعداد وحدات القياس' }, icon: Package, group: 'Settings', type: 'settings', keywords: ['unités mesure', 'وحدات القياس', 'uom', 'kg', 'unit', 'pcs'] },
    { path: '/configurations/company', labels: { en: 'Company Settings', fr: 'Paramètres Société', ar: 'إعدادات الشركة' }, descriptions: { en: 'Company profile & information', fr: 'Profil & informations société', ar: 'ملف الشركة ومعلوماتها' }, icon: Building2, group: 'Settings', type: 'settings', keywords: ['société', 'entreprise', 'معلومات الشركة', 'company', 'profile', 'logo'] },
    { path: '/configurations/inventory', labels: { en: 'Inventory Settings', fr: 'Paramètres Inventaire', ar: 'إعدادات المخزون' }, descriptions: { en: 'Automatic stock movement settings', fr: 'Paramètres des mouvements de stock automatiques', ar: 'إعدادات حركات المخزون التلقائية' }, icon: Package, group: 'Settings', type: 'settings', keywords: ['inventaire', 'stock', 'mouvement', 'مخزون', 'حركة', 'warehouse', 'entrepôt'] },
];

const GROUP_CONFIG: Record<string, { color: string; bg: string }> = {
    Main: { color: '#6366f1', bg: '#eef2ff' },
    Sales: { color: '#10b981', bg: '#ecfdf5' },
    Purchases: { color: '#2563eb', bg: '#eff6ff' },
    Inventory: { color: '#3b82f6', bg: '#eff6ff' },
    Drive: { color: '#0ea5e9', bg: '#f0f9ff' },
    Settings: { color: '#8b5cf6', bg: '#f5f3ff' },
};

const TYPE_CONFIG: Record<string, { label: Record<Lang, string>; color: string; bg: string }> = {
    page: { label: { en: 'Page', fr: 'Page', ar: 'صفحة' }, color: '#475569', bg: '#f1f5f9' },
    create: { label: { en: 'New', fr: 'Nouveau', ar: 'جديد' }, color: '#10b981', bg: '#dcfce7' },
    settings: { label: { en: 'Config', fr: 'Config', ar: 'إعداد' }, color: '#8b5cf6', bg: '#ede9fe' },
    report: { label: { en: 'Report', fr: 'Rapport', ar: 'تقرير' }, color: '#235ae4', bg: '#eff3ff' },
};

const QUICK_ACCESS_PATHS = ['/dashboard', '/orders', '/products', '/customers', '/devis', '/factures/vente', '/drive', '/pos'];
const ALL_GROUPS = ['Main', 'Sales', 'Purchases', 'Inventory', 'Drive', 'Settings'];

const GROUP_NAMES: Record<string, Record<Lang, string>> = {
    Main: { en: 'Main', fr: 'Principal', ar: 'رئيسي' },
    Sales: { en: 'Sales', fr: 'Ventes', ar: 'المبيعات' },
    Purchases: { en: 'Purchases', fr: 'Achats', ar: 'المشتريات' },
    Inventory: { en: 'Inventory', fr: 'Inventaire', ar: 'المخزون' },
    Drive: { en: 'Drive', fr: 'Drive', ar: 'Drive' },
    Settings: { en: 'Settings', fr: 'Paramètres', ar: 'الإعدادات' },
};

const SEARCH_UI: Record<Lang, {
    placeholder: string; noResults: string; noResultsHint: string;
    navigate: string; go: string; close: string; quickAccess: string;
    recentLabel: string; results: (n: number) => string; filterAll: string;
}> = {
    en: {
        placeholder: 'Search pages, actions, settings…',
        noResults: 'No results found', noResultsHint: 'Try different keywords or check spelling',
        navigate: 'Navigate', go: 'Open', close: 'Close',
        quickAccess: 'Quick Access', recentLabel: 'Recently Visited',
        results: (n) => `${n} result${n !== 1 ? 's' : ''}`, filterAll: 'All',
    },
    fr: {
        placeholder: 'Rechercher pages, actions, paramètres…',
        noResults: 'Aucun résultat', noResultsHint: "Essayez d'autres mots-clés",
        navigate: 'Naviguer', go: 'Ouvrir', close: 'Fermer',
        quickAccess: 'Accès rapide', recentLabel: 'Récemment visité',
        results: (n) => `${n} résultat${n !== 1 ? 's' : ''}`, filterAll: 'Tout',
    },
    ar: {
        placeholder: 'ابحث في الصفحات والإجراءات والإعدادات…',
        noResults: 'لا توجد نتائج', noResultsHint: 'جرب كلمات مختلفة أو تحقق من الإملاء',
        navigate: 'تنقل', go: 'فتح', close: 'إغلاق',
        quickAccess: 'وصول سريع', recentLabel: 'تمت زيارته مؤخراً',
        results: (n) => `${n} نتيجة`, filterAll: 'الكل',
    },
};

function scoreRoute(route: SearchRoute, q: string, lang: Lang): number {
    const label = route.labels[lang].toLowerCase();
    if (label === q) return 100;
    if (label.startsWith(q)) return 90;
    if (label.includes(q)) return 75;
    if (route.keywords?.some(k => k.toLowerCase() === q)) return 70;
    if (route.keywords?.some(k => k.toLowerCase().startsWith(q))) return 60;
    if (route.keywords?.some(k => k.toLowerCase().includes(q))) return 50;
    if (route.descriptions[lang].toLowerCase().includes(q)) return 40;
    if (route.path.toLowerCase().includes(q)) return 30;
    if (route.group.toLowerCase().includes(q)) return 15;
    return 0;
}

function highlightText(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark style={{ background: '#fef08a', color: '#111827', borderRadius: '0.125rem', padding: 0 }}>
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </>
    );
}


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
    const [activeGroupFilter, setActiveGroupFilter] = useState<string | null>(null);
    const [recentPaths, setRecentPaths] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
    });
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

    // Filtered + scored results
    const filteredRoutes = useMemo(() => {
        let base: SearchRoute[];
        if (!searchQuery.trim()) {
            // No query: show recents first, then quick access
            const recentRoutes = recentPaths
                .map(p => APP_ROUTES.find(r => r.path === p))
                .filter(Boolean) as SearchRoute[];
            const quickRoutes = APP_ROUTES.filter(r =>
                QUICK_ACCESS_PATHS.includes(r.path) && !recentPaths.includes(r.path)
            );
            base = [...recentRoutes, ...quickRoutes];
        } else {
            const q = searchQuery.toLowerCase().trim();
            base = APP_ROUTES
                .map(r => ({ route: r, score: scoreRoute(r, q, lang) }))
                .filter(({ score }) => score > 0)
                .sort((a, b) => b.score - a.score)
                .map(({ route }) => route);
        }
        if (activeGroupFilter) {
            base = base.filter(r => r.group === activeGroupFilter);
        }
        return base;
    }, [searchQuery, lang, activeGroupFilter, recentPaths]);

    // Grouped results for rendering
    const groupedResults = useMemo(() => {
        if (searchQuery.trim() || activeGroupFilter) {
            const groups: Record<string, SearchRoute[]> = {};
            filteredRoutes.forEach(r => {
                if (!groups[r.group]) groups[r.group] = [];
                groups[r.group].push(r);
            });
            return groups;
        }
        // No query: show "Recently Visited" + "Quick Access" as virtual groups
        const recent = filteredRoutes.filter(r => recentPaths.includes(r.path));
        const quick = filteredRoutes.filter(r => !recentPaths.includes(r.path));
        const out: Record<string, SearchRoute[]> = {};
        if (recent.length) out['__recent'] = recent;
        if (quick.length) out['__quick'] = quick;
        return out;
    }, [filteredRoutes, searchQuery, activeGroupFilter, recentPaths]);

    const openSearch = useCallback(() => {
        setIsSearchOpen(true);
        setSearchQuery('');
        setActiveIndex(-1);
        setActiveGroupFilter(null);
        setTimeout(() => searchInputRef.current?.focus(), 60);
    }, []);

    const closeSearch = useCallback(() => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setActiveIndex(-1);
        setActiveGroupFilter(null);
    }, []);

    const goTo = useCallback((path: string) => {
        navigate(path);
        closeSearch();
        setRecentPaths(prev => {
            const updated = [path, ...prev.filter(p => p !== path)].slice(0, MAX_RECENT);
            try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* noop */ }
            return updated;
        });
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
                if (isSearchOpen) { closeSearch(); } else { openSearch(); }
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

    return (
        <>
            <div style={{ position: 'sticky', top: 0, zIndex: 100, direction: language === 'ar' ? 'rtl' : 'ltr', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.97)', borderBottom: '1px solid rgba(35, 90, 228, 0.12)' }}>
                {/* ── Top Bar ── */}
                <header className="flex align-items-center justify-content-between" style={{ height: '3.5rem', padding: '0 1.5rem' }}>
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
                    </div>

                    {/* Right */}
                    <div className="flex align-items-center gap-2">
                        {canInstall && (
                            <Button
                                label={t('install') || 'Install'} size="small" rounded onClick={handleInstallClick}
                                style={{ background: 'linear-gradient(135deg,#235ae4,#1a47b8)', border: 'none', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.875rem' }}
                            />
                        )}

                        {/* Search trigger — animated icon */}
                        <button
                            onClick={openSearch}
                            aria-label="Search (⌘K)"
                            title="Search (⌘K)"
                            className="header-search-icon-btn"
                        >
                            <span className="header-search-icon-ring" />
                            <Search style={{ width: '1.0625rem', height: '1.0625rem', position: 'relative', zIndex: 1 }} strokeWidth={1.75} />
                        </button>

                        <NotificationBellPro />
                        <LanguageToggle />

                        <Divider layout="vertical" className="hidden sm:flex" style={{ height: '1.5rem', margin: '0 0.25rem' }} />

                        <div className="flex align-items-center gap-2">
                            <Avatar
                                label={getInitials()} shape="circle" size="normal"
                                style={{ background: 'linear-gradient(135deg,#0f172a,#1a2342)', color: '#ffffff', fontWeight: 700, fontSize: '0.8125rem', width: '2.25rem', height: '2.25rem' }}
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
                // build flat list for keyboard nav
                let globalIdx = -1;
                const allFlat: SearchRoute[] = Object.values(groupedResults).flat();

                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                        {/* Backdrop */}
                        <div onClick={closeSearch} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)' }} />

                        {/* Modal card */}
                        <div style={{ position: 'relative', width: '100%', maxWidth: '680px', background: 'white', borderRadius: '0.75rem', boxShadow: '0 32px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.06)', overflow: 'hidden', animation: 'searchModalIn 0.18s cubic-bezier(0.16,1,0.3,1)', direction: isRTL ? 'rtl' : 'ltr', fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-latin)' }}>

                            {/* ── Search input row ── */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.125rem 1.5rem', borderBottom: '2px solid #f1f5f9' }}>
                                <Search style={{ width: '1.5rem', height: '1.5rem', color: '#6366f1', flexShrink: 0 }} strokeWidth={2} />
                                <InputText
                                    ref={searchInputRef}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={ui.placeholder}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1.125rem', fontWeight: 400, color: '#111827', background: 'transparent', fontFamily: 'inherit', textAlign: isRTL ? 'right' : 'left', boxShadow: 'none', padding: '0.5rem 0.75rem', lineHeight: 1.5 }}
                                />
                                {searchQuery ? (
                                    <Button
                                        text
                                        onClick={() => setSearchQuery('')}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.75rem', height: '1.75rem', background: '#f1f5f9', borderRadius: '0.375rem', color: '#64748b', flexShrink: 0, padding: 0 }}
                                    >
                                        <X style={{ width: '1rem', height: '1rem' }} />
                                    </Button>
                                ) : (
                                    <kbd style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.625rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
                                        Esc
                                    </kbd>
                                )}
                            </div>

                            {/* ── Group filter tabs ── */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.625rem 1.25rem', overflowX: 'auto', borderBottom: '1px solid #f1f5f9', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                {[null, ...ALL_GROUPS].map(g => {
                                    const label = g ? GROUP_NAMES[g]?.[lang] : ui.filterAll;
                                    const gc = g ? GROUP_CONFIG[g] : null;
                                    const isActive = activeGroupFilter === g;
                                    return (
                                        <Button
                                            key={g ?? '__all'}
                                            text
                                            onClick={() => { setActiveGroupFilter(g); setActiveIndex(-1); }}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                                padding: '0.4rem 1rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '1rem', fontWeight: isActive ? 700 : 500,
                                                whiteSpace: 'nowrap',
                                                background: isActive ? (gc ? gc.bg : '#e0e7ff') : 'transparent',
                                                color: isActive ? (gc ? gc.color : '#6366f1') : '#6b7280',
                                                letterSpacing: '-0.01em',
                                                boxShadow: isActive ? `inset 0 0 0 1.5px ${gc ? gc.color : '#6366f1'}33` : 'none',
                                                transition: 'all 0.12s ease',
                                            }}
                                        >
                                            {g && isActive && <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: gc?.color, flexShrink: 0 }} />}
                                            {label}
                                        </Button>
                                    );
                                })}
                            </div>

                            {/* ── Results ── */}
                            <div ref={resultsRef} style={{ maxHeight: '26rem', overflowY: 'auto', padding: '0.375rem 0' }}>
                                {filteredRoutes.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                                        <Search style={{ width: '2.25rem', height: '2.25rem', marginBottom: '0.875rem', opacity: 0.35 }} />
                                        <p style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>{ui.noResults}</p>
                                        <p style={{ fontSize: '0.875rem', margin: '0.375rem 0 0', color: '#cbd5e1' }}>{ui.noResultsHint}</p>
                                    </div>
                                ) : (
                                    Object.entries(groupedResults).map(([groupName, routes]) => {
                                        const isVirtualRecent = groupName === '__recent';
                                        const isVirtualQuick = groupName === '__quick';
                                        const gc = (!isVirtualRecent && !isVirtualQuick)
                                            ? (GROUP_CONFIG[groupName] || { color: '#6b7280', bg: '#f9fafb' })
                                            : { color: '#6b7280', bg: '#f9fafb' };
                                        const gLabel = isVirtualRecent ? ui.recentLabel
                                            : isVirtualQuick ? ui.quickAccess
                                                : (GROUP_NAMES[groupName]?.[lang] ?? groupName);
                                        const GroupIcon = isVirtualRecent ? History : isVirtualQuick ? Star : null;

                                        return (
                                            <div key={groupName}>
                                                {/* Group header */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem 0.3rem', marginTop: '0.125rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                                    {GroupIcon && <GroupIcon style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8', flexShrink: 0 }} strokeWidth={1.75} />}
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: isRTL ? '0' : '0.08em', color: gc.color }}>{gLabel}</span>
                                                    <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }} />
                                                </div>

                                                {/* Route items */}
                                                {routes.map((route) => {
                                                    globalIdx++;
                                                    const idx = globalIdx;
                                                    const RouteIcon = route.icon;
                                                    const isItemActive = idx === activeIndex;
                                                    const isCurrentPage = location.pathname === route.path;
                                                    const typeConf = route.type ? TYPE_CONFIG[route.type] : null;
                                                    const displayLabel = route.labels[lang];
                                                    const displayDesc = route.descriptions[lang];
                                                    const rowGc = (!isVirtualRecent && !isVirtualQuick)
                                                        ? (GROUP_CONFIG[route.group] || gc)
                                                        : (GROUP_CONFIG[route.group] || gc);

                                                    return (
                                                        <Button
                                                            key={route.path}
                                                            text
                                                            data-idx={idx}
                                                            onClick={() => goTo(route.path)}
                                                            onMouseEnter={() => setActiveIndex(idx)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.875rem',
                                                                width: '100%', padding: '0.625rem 1.25rem',
                                                                textAlign: isRTL ? 'right' : 'left',
                                                                flexDirection: isRTL ? 'row-reverse' : 'row',
                                                                background: isItemActive ? rowGc.bg : 'transparent',
                                                                transition: 'background 0.08s ease',
                                                            }}
                                                        >
                                                            {/* Icon */}
                                                            <div style={{
                                                                width: '2.375rem', height: '2.375rem', borderRadius: '0.625rem',
                                                                background: isItemActive ? rowGc.color : '#f1f5f9',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                flexShrink: 0, transition: 'all 0.1s ease',
                                                            }}>
                                                                <RouteIcon style={{ width: '1.0625rem', height: '1.0625rem', color: isItemActive ? 'white' : '#64748b' }} strokeWidth={1.75} />
                                                            </div>

                                                            {/* Text */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                                                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: isItemActive ? 600 : 500, color: isItemActive ? '#0f172a' : '#1e293b', lineHeight: 1.3 }}>
                                                                        {highlightText(displayLabel, searchQuery.trim())}
                                                                    </p>
                                                                    {isCurrentPage && (
                                                                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '1rem', background: '#ecfdf5', color: '#059669', flexShrink: 0 }}>
                                                                            ●
                                                                        </span>
                                                                    )}
                                                                    {typeConf && (
                                                                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '1rem', background: typeConf.bg, color: typeConf.color, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                                            {typeConf.label[lang]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p style={{ margin: 0, fontSize: '0.8125rem', color: isItemActive ? '#64748b' : '#94a3b8', lineHeight: 1.3, marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {highlightText(displayDesc, searchQuery.trim())}
                                                                </p>
                                                            </div>

                                                            {/* Path pill */}
                                                            {isItemActive && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{route.path}</span>
                                                                    <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.4375rem', background: rowGc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ transform: isRTL ? 'scaleX(-1)' : undefined }}>
                                                                            <path d="M2 5h6M5 2l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* ── Footer ── */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1.25rem', borderTop: '1px solid #f1f5f9', background: '#fafafa', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    {[
                                        { keys: ['↑', '↓'], label: ui.navigate },
                                        { keys: ['↵'], label: ui.go },
                                        { keys: ['Esc'], label: ui.close },
                                    ].map(({ keys, label }) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                            {keys.map(k => (
                                                <kbd key={k} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.375rem', height: '1.375rem', padding: '0 0.3rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.3125rem', fontSize: '0.75rem', color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>{k}</kbd>
                                            ))}
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {searchQuery && (
                                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 500 }}>{ui.results(allFlat.length)}</span>
                                    )}
                                    {recentPaths.length > 0 && !searchQuery && (
                                        <Button
                                            text
                                            onClick={() => { setRecentPaths([]); localStorage.removeItem(RECENT_KEY); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'transparent', fontSize: '0.75rem', color: '#cbd5e1', padding: '0.15rem 0.375rem', borderRadius: '0.25rem' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1'; }}
                                        >
                                            <Clock style={{ width: '0.75rem', height: '0.75rem' }} strokeWidth={2} />
                                            {lang === 'ar' ? 'مسح السجل' : lang === 'fr' ? 'Effacer l\'historique' : 'Clear history'}
                                        </Button>
                                    )}
                                </div>
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
                @keyframes searchIconPulse {
                    0%   { transform: scale(1); opacity: 0.55; }
                    50%  { transform: scale(1.75); opacity: 0; }
                    100% { transform: scale(1.75); opacity: 0; }
                }
                @keyframes searchIconBounce {
                    0%, 100% { transform: translateY(0); }
                    30%      { transform: translateY(-2px); }
                    60%      { transform: translateY(1px); }
                }
                /* ── Sub-Navigation Pills ── */
                .subnav-pill {
                    position: relative;
                }
                .subnav-pill:not(.subnav-pill--active):hover {
                    background: rgba(35, 90, 228, 0.06) !important;
                    color: #1e3a8a !important;
                    box-shadow: 0 0 0 0.5px rgba(35, 90, 228, 0.12);
                }
                .subnav-pill:not(.subnav-pill--active):hover svg {
                    opacity: 0.85 !important;
                }
                .subnav-pill:active {
                    transform: scale(0.97);
                }
                .subnav-pill--active {
                    pointer-events: auto;
                }
                .header-search-icon-btn {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 2.25rem;
                    height: 2.25rem;
                    padding: 0;
                    border: none;
                    border-radius: 0.5rem;
                    background: transparent;
                    color: #6b7280;
                    cursor: pointer;
                    transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
                    animation: searchIconBounce 3.5s ease-in-out 2s infinite;
                }
                .header-search-icon-btn:hover {
                    background: #f3f4f6;
                    color: #235ae4;
                    transform: scale(1.08);
                    animation: none;
                }
                .header-search-icon-btn:active {
                    transform: scale(0.93);
                }
                .header-search-icon-ring {
                    position: absolute;
                    inset: 0;
                    border-radius: 0.5rem;
                    border: 1.5px solid #235ae4;
                    opacity: 0;
                    animation: searchIconPulse 3.5s ease-out 2s infinite;
                    pointer-events: none;
                }
            `}</style>
        </>
    );
};
