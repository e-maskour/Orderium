import { apiClient } from '../../common/api/api-client';
import { API_ROUTES } from '../../common/api/api-routes';
import { buildReportQueryString } from './analytics.model';
import type {
  ReportFilter,
  AgingReportFilter,
  PartnerStatementFilter,
  StockReportFilter,
  SalesReportFilter,
  ReportData,
} from './analytics.interface';

type AnyFilter = ReportFilter | AgingReportFilter | PartnerStatementFilter | StockReportFilter | SalesReportFilter;

function fetchReport<T = ReportData>(url: string, filter: AnyFilter): Promise<{ data: T }> {
  return apiClient.get<T>(`${url}${buildReportQueryString(filter)}`);
}

export const analyticsService = {
  // Sales
  getSalesRevenue: (f: SalesReportFilter) => fetchReport(API_ROUTES.REPORTS.SALES.REVENUE, f),
  getSalesTopProducts: (f: SalesReportFilter) => fetchReport(API_ROUTES.REPORTS.SALES.TOP_PRODUCTS, f),
  getSalesByCustomer: (f: SalesReportFilter) => fetchReport(API_ROUTES.REPORTS.SALES.BY_CUSTOMER, f),
  getSalesByCategory: (f: SalesReportFilter) => fetchReport(API_ROUTES.REPORTS.SALES.BY_CATEGORY, f),
  getSalesByPos: (f: SalesReportFilter) => fetchReport(API_ROUTES.REPORTS.SALES.BY_POS, f),

  // Purchases
  getPurchasesByPeriod: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PURCHASES.BY_PERIOD, f),
  getPurchasesTopSuppliers: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PURCHASES.TOP_SUPPLIERS, f),
  getPurchasesByProduct: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PURCHASES.BY_PRODUCT, f),

  // Invoices
  getJournalVente: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.INVOICES.JOURNAL_VENTE, f),
  getJournalAchat: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.INVOICES.JOURNAL_ACHAT, f),
  getTvaSummary: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.INVOICES.TVA_SUMMARY, f),
  getOutstandingInvoices: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.INVOICES.OUTSTANDING, f),
  getInvoiceAging: (f: AgingReportFilter) => fetchReport(API_ROUTES.REPORTS.INVOICES.AGING, f),

  // Payments
  getCashflow: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PAYMENTS.CASHFLOW, f),
  getPaymentsByMethod: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PAYMENTS.BY_METHOD, f),
  getInOutFlow: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PAYMENTS.IN_OUT, f),

  // Clients
  getTopClients: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.CLIENTS.TOP, f),
  getClientAging: (f: AgingReportFilter) => fetchReport(API_ROUTES.REPORTS.CLIENTS.AGING, f),
  getInactiveClients: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.CLIENTS.INACTIVE, f),
  getClientStatement: (f: PartnerStatementFilter) => fetchReport(API_ROUTES.REPORTS.CLIENTS.STATEMENT, f),

  // Suppliers
  getTopSuppliers: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.SUPPLIERS.TOP, f),
  getSupplierAging: (f: AgingReportFilter) => fetchReport(API_ROUTES.REPORTS.SUPPLIERS.AGING, f),
  getSupplierStatement: (f: PartnerStatementFilter) => fetchReport(API_ROUTES.REPORTS.SUPPLIERS.STATEMENT, f),

  // Stock
  getStockValuation: (f: StockReportFilter) => fetchReport(API_ROUTES.REPORTS.STOCK.VALUATION, f),
  getLowStock: (f: StockReportFilter) => fetchReport(API_ROUTES.REPORTS.STOCK.LOW_STOCK, f),
  getStockMovements: (f: StockReportFilter) => fetchReport(API_ROUTES.REPORTS.STOCK.MOVEMENTS, f),
  getSlowDeadStock: (f: StockReportFilter) => fetchReport(API_ROUTES.REPORTS.STOCK.SLOW_DEAD, f),
  getStockByWarehouse: (f: StockReportFilter) => fetchReport(API_ROUTES.REPORTS.STOCK.BY_WAREHOUSE, f),

  // Products
  getProductPerformance: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PRODUCTS.PERFORMANCE, f),
  getMarginAnalysis: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PRODUCTS.MARGIN, f),
  getNeverSoldProducts: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PRODUCTS.NEVER_SOLD, f),

  // XLSX download helpers
  xlsxUrl: (path: string, filter: AnyFilter) => `${path}${buildReportQueryString(filter)}`,
};
