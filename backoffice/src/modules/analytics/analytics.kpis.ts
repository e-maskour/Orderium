/**
 * KPI definitions per report — the single source for both the on-screen KPI
 * cards and the KPI band of the PDF export.
 *
 * Keys MUST match what the API puts in `data.kpis` for that report (see the
 * report services under api/src/modules/reports). Keeping screen and PDF on
 * one definition is what stops them drifting apart again.
 */
import type { TranslationKey } from '../../lib/i18n';
import type { PdfReportKpi } from './analytics.interface';

export type KpiFormat = 'currency' | 'integer' | 'number' | 'percent' | 'text';
export type KpiTone = 'green' | 'red' | 'blue' | 'orange' | 'purple' | 'teal';

export interface KpiDef {
  key: string;
  labelKey: TranslationKey;
  format: KpiFormat;
  tone: KpiTone;
  /** PrimeIcons class for the card. */
  icon: string;
}

const k = (
  key: string,
  labelKey: TranslationKey,
  format: KpiFormat,
  tone: KpiTone,
  icon: string,
): KpiDef => ({ key, labelKey, format, tone, icon });

// Shared building blocks
const REVENUE = (key = 'totalRevenue') =>
  k(key, 'analyticsKpiRevenue', 'currency', 'green', 'pi-chart-line');
const ORDERS = (key = 'totalOrders') =>
  k(key, 'analyticsKpiOrders', 'integer', 'blue', 'pi-shopping-cart');
const TOP_TEXT = (key: string, labelKey: TranslationKey) =>
  k(key, labelKey, 'text', 'purple', 'pi-star');

const AGING = (
  totalKey: string,
  totalLabel: TranslationKey,
  countKey: string,
  countLabel: TranslationKey,
) => [
  k(totalKey, totalLabel, 'currency', 'orange', 'pi-wallet'),
  k(countKey, countLabel, 'integer', 'blue', 'pi-users'),
  k('over90', 'analyticsKpiOver90', 'currency', 'red', 'pi-exclamation-triangle'),
];

const STATEMENT = [
  k('totalInvoiced', 'analyticsKpiInvoiced', 'currency', 'blue', 'pi-file'),
  k('totalPaid', 'analyticsKpiPaid', 'currency', 'green', 'pi-check-circle'),
  k('openBalance', 'analyticsKpiOpenBalance', 'currency', 'orange', 'pi-wallet'),
];

const JOURNAL = [
  k('totalTTC', 'analyticsKpiTotalTtc', 'currency', 'green', 'pi-file'),
  k('totalTVA', 'analyticsKpiTotalTva', 'currency', 'purple', 'pi-percentage'),
  k('totalPaid', 'analyticsKpiPaid', 'currency', 'teal', 'pi-check-circle'),
  k('totalRemaining', 'analyticsKpiRemaining', 'currency', 'red', 'pi-clock'),
  k('count', 'analyticsKpiInvoices', 'integer', 'blue', 'pi-list'),
];

const FLOWS = [
  k('totalInflow', 'analyticsKpiInflow', 'currency', 'green', 'pi-arrow-down-left'),
  k('totalOutflow', 'analyticsKpiOutflow', 'currency', 'red', 'pi-arrow-up-right'),
  k('netCashflow', 'analyticsKpiNet', 'currency', 'blue', 'pi-wallet'),
];

export const REPORT_KPIS: Record<string, KpiDef[]> = {
  // ── Sales ─────────────────────────────────────────────────
  'sales-revenue': [
    REVENUE(),
    ORDERS(),
    k('avgOrder', 'analyticsKpiAvgOrder', 'currency', 'orange', 'pi-shopping-bag'),
  ],
  'sales-top-products': [
    k('uniqueProducts', 'analyticsKpiProducts', 'integer', 'blue', 'pi-box'),
    TOP_TEXT('topProduct', 'analyticsKpiTopProduct'),
    k('topRevenue', 'analyticsKpiTopProductRevenue', 'currency', 'green', 'pi-chart-line'),
  ],
  'sales-by-customer': [
    k('uniqueCustomers', 'analyticsKpiCustomers', 'integer', 'blue', 'pi-users'),
    REVENUE(),
    TOP_TEXT('topCustomer', 'analyticsKpiTopCustomer'),
  ],
  'sales-by-category': [
    k('uniqueCategories', 'analyticsKpiCategories', 'integer', 'blue', 'pi-tags'),
    REVENUE(),
    TOP_TEXT('topCategory', 'analyticsKpiTopCategory'),
  ],
  'sales-by-pos': [
    REVENUE(),
    ORDERS(),
    k('channels', 'analyticsKpiChannels', 'integer', 'teal', 'pi-sitemap'),
  ],

  // ── Purchases ─────────────────────────────────────────────
  'purchases-by-period': [
    k('totalPurchases', 'analyticsKpiPurchases', 'currency', 'orange', 'pi-shopping-bag'),
    ORDERS(),
    k('avgOrder', 'analyticsKpiAvgOrder', 'currency', 'purple', 'pi-calculator'),
  ],
  'purchases-top-suppliers': [
    k('uniqueSuppliers', 'analyticsKpiSuppliers', 'integer', 'blue', 'pi-truck'),
    k('totalPurchases', 'analyticsKpiPurchases', 'currency', 'orange', 'pi-shopping-bag'),
    TOP_TEXT('topSupplier', 'analyticsKpiTopSupplier'),
  ],
  'purchases-by-product': [
    k('uniqueProducts', 'analyticsKpiProducts', 'integer', 'blue', 'pi-box'),
    k('totalCost', 'analyticsKpiTotalCost', 'currency', 'orange', 'pi-wallet'),
    TOP_TEXT('topProduct', 'analyticsKpiTopProduct'),
  ],

  // ── Invoices ──────────────────────────────────────────────
  'invoices-journal-vente': JOURNAL,
  'invoices-journal-achat': JOURNAL,
  'invoices-tva-summary': [
    k('totalVenteTVA', 'analyticsKpiTvaCollected', 'currency', 'green', 'pi-arrow-down-left'),
    k('totalAchatTVA', 'analyticsKpiTvaDeductible', 'currency', 'teal', 'pi-arrow-up-right'),
    k('tvaAVerser', 'analyticsKpiTvaDue', 'currency', 'red', 'pi-percentage'),
  ],
  'invoices-outstanding': [
    k('totalRemaining', 'analyticsKpiRemaining', 'currency', 'red', 'pi-exclamation-circle'),
    k('count', 'analyticsKpiInvoices', 'integer', 'blue', 'pi-list'),
    k('overdueCount', 'analyticsKpiOverdue', 'integer', 'orange', 'pi-clock'),
  ],
  'invoices-aging': AGING(
    'totalRemaining',
    'analyticsKpiRemaining',
    'partners',
    'analyticsKpiPartners',
  ),

  // ── Payments ──────────────────────────────────────────────
  'payments-cashflow': FLOWS,
  'payments-in-out': FLOWS,
  'payments-by-method': [
    k('totalPayments', 'analyticsKpiPayments', 'integer', 'blue', 'pi-list'),
    k('totalAmount', 'analyticsKpiAmount', 'currency', 'green', 'pi-wallet'),
    TOP_TEXT('topMethod', 'analyticsKpiTopMethod'),
  ],

  // ── Clients ───────────────────────────────────────────────
  'clients-top': [
    k('uniqueCustomers', 'analyticsKpiCustomers', 'integer', 'blue', 'pi-users'),
    REVENUE(),
    TOP_TEXT('topCustomer', 'analyticsKpiTopCustomer'),
  ],
  'clients-aging': AGING(
    'totalCreances',
    'analyticsKpiReceivables',
    'customers',
    'analyticsKpiCustomers',
  ),
  'clients-inactive': [
    k('inactiveCount', 'analyticsKpiInactive', 'integer', 'orange', 'pi-user-minus'),
    k('avgDaysSinceOrder', 'analyticsKpiAvgDays', 'integer', 'blue', 'pi-calendar'),
    k(
      'totalLostRevenuePotential',
      'analyticsKpiLostRevenue',
      'currency',
      'red',
      'pi-exclamation-triangle',
    ),
  ],
  'clients-statement': STATEMENT,

  // ── Suppliers ─────────────────────────────────────────────
  'suppliers-top': [
    k('uniqueSuppliers', 'analyticsKpiSuppliers', 'integer', 'blue', 'pi-truck'),
    k('totalPurchases', 'analyticsKpiPurchases', 'currency', 'orange', 'pi-shopping-bag'),
    TOP_TEXT('topSupplier', 'analyticsKpiTopSupplier'),
  ],
  'suppliers-aging': AGING(
    'totalDettes',
    'analyticsKpiPayables',
    'suppliers',
    'analyticsKpiSuppliers',
  ),
  'suppliers-statement': STATEMENT,

  // ── Stock ─────────────────────────────────────────────────
  'stock-valuation': [
    k('totalValuation', 'analyticsKpiStockValue', 'currency', 'green', 'pi-wallet'),
    k('productCount', 'analyticsKpiProducts', 'integer', 'blue', 'pi-box'),
    k('totalQuantity', 'analyticsKpiQuantity', 'number', 'teal', 'pi-database'),
  ],
  'stock-low-stock': [
    k('lowStockCount', 'analyticsKpiLowStock', 'integer', 'orange', 'pi-arrow-down'),
    k('outOfStockCount', 'analyticsKpiOutOfStock', 'integer', 'red', 'pi-ban'),
    k('alertCount', 'analyticsKpiAlerts', 'integer', 'blue', 'pi-bell'),
  ],
  'stock-movements': [
    k('totalMovements', 'analyticsKpiMovements', 'integer', 'blue', 'pi-arrows-h'),
  ],
  'stock-slow-dead': [
    k('deadStockCount', 'analyticsKpiDeadStock', 'integer', 'orange', 'pi-moon'),
    k('immobilisedValue', 'analyticsKpiImmobilised', 'currency', 'red', 'pi-lock'),
  ],
  'stock-by-warehouse': [
    k('totalWarehouses', 'analyticsKpiWarehouses', 'integer', 'blue', 'pi-building'),
    k('totalQuantity', 'analyticsKpiQuantity', 'number', 'teal', 'pi-database'),
  ],

  // ── Products ──────────────────────────────────────────────
  'products-performance': [
    k('productsWithSales', 'analyticsKpiProducts', 'integer', 'blue', 'pi-box'),
    REVENUE(),
    TOP_TEXT('topProduct', 'analyticsKpiTopProduct'),
  ],
  'products-margin': [
    k('productsAnalysed', 'analyticsKpiAnalysed', 'integer', 'blue', 'pi-box'),
    k('totalMargin', 'analyticsKpiMargin', 'currency', 'green', 'pi-chart-line'),
    k('avgMarginRate', 'analyticsKpiAvgMargin', 'percent', 'purple', 'pi-percentage'),
  ],
  'products-never-sold': [
    k('neverSoldCount', 'analyticsKpiNeverSold', 'integer', 'orange', 'pi-box'),
    k('totalProducts', 'analyticsKpiProducts', 'integer', 'blue', 'pi-th-large'),
    k('immobilisedValue', 'analyticsKpiImmobilised', 'currency', 'red', 'pi-lock'),
  ],
};

type Translate = (key: TranslationKey) => string;

/** PDF engine formats — `text` has no PDF equivalent beyond the default. */
const PDF_FORMAT: Record<KpiFormat, PdfReportKpi['format']> = {
  currency: 'currency',
  integer: 'integer',
  number: 'number',
  percent: 'percent',
  text: 'text',
};

/** KPI band for the PDF export, or `undefined` when the report has none. */
export function pdfKpisFor(reportKey: string, t: Translate): PdfReportKpi[] | undefined {
  const defs = REPORT_KPIS[reportKey];
  return defs?.map((d) => ({ key: d.key, label: t(d.labelKey), format: PDF_FORMAT[d.format] }));
}
