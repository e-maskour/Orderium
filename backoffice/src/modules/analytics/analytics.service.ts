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
  PdfReportSpec,
  AnyReportFilter,
} from './analytics.interface';

type AnyFilter =
  | ReportFilter
  | AgingReportFilter
  | PartnerStatementFilter
  | StockReportFilter
  | SalesReportFilter;

function fetchReport<T = ReportData>(url: string, filter: AnyFilter): Promise<{ data: T }> {
  return apiClient.get<T>(`${url}${buildReportQueryString(filter)}`);
}

export const analyticsService = {
  // Sales
  getSalesRevenue: (f: SalesReportFilter) => fetchReport(API_ROUTES.REPORTS.SALES.REVENUE, f),
  getSalesTopProducts: (f: SalesReportFilter) =>
    fetchReport(API_ROUTES.REPORTS.SALES.TOP_PRODUCTS, f),
  getSalesByCustomer: (f: SalesReportFilter) =>
    fetchReport(API_ROUTES.REPORTS.SALES.BY_CUSTOMER, f),
  getSalesByCategory: (f: SalesReportFilter) =>
    fetchReport(API_ROUTES.REPORTS.SALES.BY_CATEGORY, f),
  getSalesByPos: (f: SalesReportFilter) => fetchReport(API_ROUTES.REPORTS.SALES.BY_POS, f),

  // Purchases
  getPurchasesByPeriod: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PURCHASES.BY_PERIOD, f),
  getPurchasesTopSuppliers: (f: ReportFilter) =>
    fetchReport(API_ROUTES.REPORTS.PURCHASES.TOP_SUPPLIERS, f),
  getPurchasesByProduct: (f: ReportFilter) =>
    fetchReport(API_ROUTES.REPORTS.PURCHASES.BY_PRODUCT, f),

  // Invoices
  getJournalVente: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.INVOICES.JOURNAL_VENTE, f),
  getJournalAchat: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.INVOICES.JOURNAL_ACHAT, f),
  getTvaSummary: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.INVOICES.TVA_SUMMARY, f),
  getOutstandingInvoices: (f: ReportFilter) =>
    fetchReport(API_ROUTES.REPORTS.INVOICES.OUTSTANDING, f),
  getInvoiceAging: (f: AgingReportFilter) => fetchReport(API_ROUTES.REPORTS.INVOICES.AGING, f),

  // Payments
  getCashflow: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PAYMENTS.CASHFLOW, f),
  getPaymentsByMethod: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PAYMENTS.BY_METHOD, f),
  getInOutFlow: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PAYMENTS.IN_OUT, f),

  // Clients
  getTopClients: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.CLIENTS.TOP, f),
  getClientAging: (f: AgingReportFilter) => fetchReport(API_ROUTES.REPORTS.CLIENTS.AGING, f),
  getInactiveClients: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.CLIENTS.INACTIVE, f),
  getClientStatement: (f: PartnerStatementFilter) =>
    fetchReport(API_ROUTES.REPORTS.CLIENTS.STATEMENT, f),

  // Suppliers
  getTopSuppliers: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.SUPPLIERS.TOP, f),
  getSupplierAging: (f: AgingReportFilter) => fetchReport(API_ROUTES.REPORTS.SUPPLIERS.AGING, f),
  getSupplierStatement: (f: PartnerStatementFilter) =>
    fetchReport(API_ROUTES.REPORTS.SUPPLIERS.STATEMENT, f),

  // Stock
  getStockValuation: (f: StockReportFilter) => fetchReport(API_ROUTES.REPORTS.STOCK.VALUATION, f),
  getLowStock: (f: StockReportFilter) => fetchReport(API_ROUTES.REPORTS.STOCK.LOW_STOCK, f),
  getStockMovements: (f: StockReportFilter) => fetchReport(API_ROUTES.REPORTS.STOCK.MOVEMENTS, f),
  getSlowDeadStock: (f: StockReportFilter) => fetchReport(API_ROUTES.REPORTS.STOCK.SLOW_DEAD, f),
  getStockByWarehouse: (f: StockReportFilter) =>
    fetchReport(API_ROUTES.REPORTS.STOCK.BY_WAREHOUSE, f),

  // Products
  getProductPerformance: (f: ReportFilter) =>
    fetchReport(API_ROUTES.REPORTS.PRODUCTS.PERFORMANCE, f),
  getMarginAnalysis: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PRODUCTS.MARGIN, f),
  getNeverSoldProducts: (f: ReportFilter) => fetchReport(API_ROUTES.REPORTS.PRODUCTS.NEVER_SOLD, f),

  // XLSX download helpers
  xlsxUrl: (path: string, filter: AnyFilter) => `${path}${buildReportQueryString(filter)}`,

  /**
   * Renders a report as a branded PDF and returns the file.
   *
   * Sends only the presentation spec — the API re-runs the report itself with
   * the same filter but without pagination, so the PDF holds the full result
   * set rather than the page currently on screen.
   */
  async generateReportPdf(
    spec: PdfReportSpec,
    filter: AnyReportFilter,
    locale?: string,
  ): Promise<{ blob: Blob; fileName: string }> {
    const { reportKey, ...presentation } = spec;

    // Pagination is the screen's concern; the export always covers everything.
    const { page: _page, perPage: _perPage, ...exportFilter } = filter as Record<string, unknown>;

    const response = await apiClient.raw(
      'POST',
      `${API_ROUTES.REPORTS.PDF(reportKey)}${buildReportQueryString(exportFilter as AnyFilter)}`,
      { body: { ...presentation, locale }, timeout: PDF_REQUEST_TIMEOUT_MS },
    );

    if (!response.ok) {
      throw new Error(await readPdfError(response));
    }

    return {
      blob: await response.blob(),
      fileName: parseFileName(response) ?? `${spec.fileName ?? reportKey}.pdf`,
    };
  },
};

/** PDF rendering goes through an external API — allow more than the default 30s. */
const PDF_REQUEST_TIMEOUT_MS = 60_000;

/** Extracts the server-provided file name from `Content-Disposition`. */
function parseFileName(response: Response): string | null {
  const header = response.headers.get('content-disposition');
  const match = header?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? null;
}

/**
 * Turns a failed PDF response into a readable message.
 *
 * `apiClient.raw` hands back non-OK responses untouched, so the JSON error
 * envelope has to be unwrapped here.
 */
async function readPdfError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    if (body?.message) return body.message;
  } catch {
    // Not JSON — fall through to the status text.
  }
  return response.statusText || `HTTP ${response.status}`;
}
