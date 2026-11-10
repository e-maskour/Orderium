/**
 * Analytics report registry — single source of truth for the analytics
 * information architecture. The hub, the domain tab bar (with its menus), the
 * per-domain sub-tabs and the breadcrumbs all read from here, so adding a
 * report means adding one entry below (plus its route in App.tsx).
 */
import {
  AlertCircle,
  ArrowLeftRight,
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  Boxes,
  CalendarRange,
  Clock,
  CreditCard,
  FileText,
  Layers,
  Moon,
  Package,
  PackageMinus,
  PackageX,
  Percent,
  Receipt,
  ScrollText,
  ShoppingBag,
  Store,
  Tag,
  Trophy,
  TrendingUp,
  Truck,
  UserMinus,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { TranslationKey } from '../../lib/i18n';

export interface AnalyticsReport {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  path: string;
  icon: LucideIcon;
}

export type DomainAccent =
  | 'blue'
  | 'orange'
  | 'purple'
  | 'green'
  | 'teal'
  | 'amber'
  | 'cyan'
  | 'pink';

export interface AnalyticsDomain {
  id: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  accent: DomainAccent;
  reports: AnalyticsReport[];
}

export const ANALYTICS_ROOT = '/analytics';
/** Searchable catalogue of every report. */
export const ANALYTICS_CATALOG = '/analytics/reports';

export const ANALYTICS_DOMAINS: AnalyticsDomain[] = [
  {
    id: 'sales',
    labelKey: 'analyticsDomainSales',
    icon: TrendingUp,
    accent: 'blue',
    reports: [
      {
        titleKey: 'analyticsSalesRevenueTitle',
        descriptionKey: 'analyticsSalesRevenueDescription',
        path: '/analytics/sales/revenue',
        icon: TrendingUp,
      },
      {
        titleKey: 'analyticsTopProductsTitle',
        descriptionKey: 'analyticsTopProductsDescription',
        path: '/analytics/sales/top-products',
        icon: Trophy,
      },
      {
        titleKey: 'analyticsSalesByCustomerTitle',
        descriptionKey: 'analyticsSalesByCustomerDescription',
        path: '/analytics/sales/by-customer',
        icon: Users,
      },
      {
        titleKey: 'analyticsSalesByCategoryTitle',
        descriptionKey: 'analyticsSalesByCategoryDescription',
        path: '/analytics/sales/by-category',
        icon: Layers,
      },
      {
        titleKey: 'analyticsSalesByPosTitle',
        descriptionKey: 'analyticsSalesByPosDescription',
        path: '/analytics/sales/by-pos',
        icon: Store,
      },
    ],
  },
  {
    id: 'purchases',
    labelKey: 'analyticsDomainPurchases',
    icon: ShoppingBag,
    accent: 'orange',
    reports: [
      {
        titleKey: 'analyticsPurchasesByPeriodTitle',
        descriptionKey: 'analyticsPurchasesByPeriodDescription',
        path: '/analytics/purchases/by-period',
        icon: CalendarRange,
      },
      {
        titleKey: 'analyticsTopSuppliersTitle',
        descriptionKey: 'analyticsTopSuppliersDescription',
        path: '/analytics/purchases/top-suppliers',
        icon: Trophy,
      },
      {
        titleKey: 'analyticsPurchasesByProductTitle',
        descriptionKey: 'analyticsPurchasesByProductDescription',
        path: '/analytics/purchases/by-product',
        icon: Package,
      },
    ],
  },
  {
    id: 'invoices',
    labelKey: 'analyticsDomainInvoices',
    icon: FileText,
    accent: 'purple',
    reports: [
      {
        titleKey: 'analyticsInvoicesJournalVenteTitle',
        descriptionKey: 'analyticsInvoicesJournalVenteDescription',
        path: '/analytics/invoices/journal-vente',
        icon: ScrollText,
      },
      {
        titleKey: 'analyticsInvoicesJournalAchatTitle',
        descriptionKey: 'analyticsInvoicesJournalAchatDescription',
        path: '/analytics/invoices/journal-achat',
        icon: Receipt,
      },
      {
        titleKey: 'analyticsTvaSummaryTitle',
        descriptionKey: 'analyticsTvaSummaryDescription',
        path: '/analytics/invoices/tva',
        icon: Percent,
      },
      {
        titleKey: 'analyticsOutstandingInvoicesTitle',
        descriptionKey: 'analyticsOutstandingInvoicesDescription',
        path: '/analytics/invoices/outstanding',
        icon: AlertCircle,
      },
      {
        titleKey: 'analyticsInvoiceAgingTitle',
        descriptionKey: 'analyticsInvoiceAgingDescription',
        path: '/analytics/invoices/aging',
        icon: Clock,
      },
    ],
  },
  {
    id: 'payments',
    labelKey: 'analyticsDomainPayments',
    icon: CreditCard,
    accent: 'green',
    reports: [
      {
        titleKey: 'analyticsCashflowTitle',
        descriptionKey: 'analyticsCashflowDescription',
        path: '/analytics/payments/cashflow',
        icon: Wallet,
      },
      {
        titleKey: 'analyticsPaymentsByMethodTitle',
        descriptionKey: 'analyticsPaymentsByMethodDescription',
        path: '/analytics/payments/by-method',
        icon: CreditCard,
      },
      {
        titleKey: 'analyticsInOutFlowTitle',
        descriptionKey: 'analyticsInOutFlowDescription',
        path: '/analytics/payments/in-out',
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    id: 'clients',
    labelKey: 'analyticsDomainClients',
    icon: Users,
    accent: 'teal',
    reports: [
      {
        titleKey: 'analyticsTopClientsTitle',
        descriptionKey: 'analyticsTopClientsDescription',
        path: '/analytics/clients/top',
        icon: Trophy,
      },
      {
        titleKey: 'analyticsClientAgingTitle',
        descriptionKey: 'analyticsClientAgingDescription',
        path: '/analytics/clients/aging',
        icon: Clock,
      },
      {
        titleKey: 'analyticsInactiveClientsTitle',
        descriptionKey: 'analyticsInactiveClientsDescription',
        path: '/analytics/clients/inactive',
        icon: UserMinus,
      },
      {
        titleKey: 'analyticsClientStatementTitle',
        descriptionKey: 'analyticsClientStatementDescription',
        path: '/analytics/clients/statement',
        icon: BookOpen,
      },
    ],
  },
  {
    id: 'suppliers',
    labelKey: 'analyticsDomainSuppliers',
    icon: Truck,
    accent: 'amber',
    reports: [
      {
        titleKey: 'analyticsTopSuppliersTitle',
        descriptionKey: 'analyticsTopSuppliersDescription',
        path: '/analytics/suppliers/top',
        icon: Trophy,
      },
      {
        titleKey: 'analyticsSupplierAgingTitle',
        descriptionKey: 'analyticsSupplierAgingDescription',
        path: '/analytics/suppliers/aging',
        icon: Clock,
      },
      {
        titleKey: 'analyticsSupplierStatementTitle',
        descriptionKey: 'analyticsSupplierStatementDescription',
        path: '/analytics/suppliers/statement',
        icon: BookOpen,
      },
    ],
  },
  {
    id: 'stock',
    labelKey: 'analyticsDomainStock',
    icon: Boxes,
    accent: 'cyan',
    reports: [
      {
        titleKey: 'analyticsStockValuationTitle',
        descriptionKey: 'analyticsStockValuationDescription',
        path: '/analytics/stock/valuation',
        icon: BadgeDollarSign,
      },
      {
        titleKey: 'analyticsLowStockTitle',
        descriptionKey: 'analyticsLowStockDescription',
        path: '/analytics/stock/low-stock',
        icon: PackageMinus,
      },
      {
        titleKey: 'analyticsStockMovementsTitle',
        descriptionKey: 'analyticsStockMovementsDescription',
        path: '/analytics/stock/movements',
        icon: ArrowLeftRight,
      },
      {
        titleKey: 'analyticsSlowDeadStockTitle',
        descriptionKey: 'analyticsSlowDeadStockDescription',
        path: '/analytics/stock/slow-dead',
        icon: Moon,
      },
      {
        titleKey: 'analyticsStockByWarehouseTitle',
        descriptionKey: 'analyticsStockByWarehouseDescription',
        path: '/analytics/stock/by-warehouse',
        icon: Warehouse,
      },
    ],
  },
  {
    id: 'products',
    labelKey: 'analyticsDomainProducts',
    icon: Tag,
    accent: 'pink',
    reports: [
      {
        titleKey: 'analyticsProductPerformanceTitle',
        descriptionKey: 'analyticsProductPerformanceDescription',
        path: '/analytics/products/performance',
        icon: BarChart3,
      },
      {
        titleKey: 'analyticsMarginAnalysisTitle',
        descriptionKey: 'analyticsMarginAnalysisDescription',
        path: '/analytics/products/margin',
        icon: Percent,
      },
      {
        titleKey: 'analyticsNeverSoldProductsTitle',
        descriptionKey: 'analyticsNeverSoldProductsDescription',
        path: '/analytics/products/never-sold',
        icon: PackageX,
      },
    ],
  },
];

export const ANALYTICS_REPORT_COUNT = ANALYTICS_DOMAINS.reduce((n, d) => n + d.reports.length, 0);

/** Domain whose URL segment matches `/analytics/<domain>/…`. */
export function findDomain(pathname: string): AnalyticsDomain | undefined {
  const segment = pathname.split('/')[2];
  return ANALYTICS_DOMAINS.find((d) => d.id === segment);
}

export function findReport(
  pathname: string,
): { domain: AnalyticsDomain; report: AnalyticsReport } | undefined {
  for (const domain of ANALYTICS_DOMAINS) {
    const report = domain.reports.find((r) => r.path === pathname);
    if (report) return { domain, report };
  }
  return undefined;
}

// ─── Recently viewed (per-browser convenience, never required) ───────────

const RECENT_KEY = 'orderium.analytics.recent';
const RECENT_MAX = 6;

export function readRecentReports(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === 'string' && !!findReport(p))
      : [];
  } catch {
    return [];
  }
}

export function pushRecentReport(path: string): void {
  try {
    const next = [path, ...readRecentReports().filter((p) => p !== path)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota) — recents are optional.
  }
}
