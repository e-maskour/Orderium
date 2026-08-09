import { BadRequestException, Injectable } from '@nestjs/common';
import { SalesReportsService } from '../sales/sales-reports.service';
import { PurchasesReportsService } from '../purchases/purchases-reports.service';
import { InvoiceReportsService } from '../invoices/invoice-reports.service';
import { PaymentReportsService } from '../payments/payment-reports.service';
import { ClientReportsService } from '../partners/client-reports.service';
import { SupplierReportsService } from '../partners/supplier-reports.service';
import { StockReportsService } from '../stock/stock-reports.service';
import { ProductReportsService } from '../products/product-reports.service';
import { ReportPdfFilterDto } from './dto/report-pdf-filter.dto';

/** Envelope every analytics report service returns. */
export interface ResolvedReportData {
  kpis?: Record<string, number | string | null | undefined>;
  rows: Array<Record<string, unknown>>;
  meta?: { total?: number; page?: number; perPage?: number };
}

/** Fetches one report's data for a given filter. */
type ReportFetcher = (filter: ReportPdfFilterDto) => Promise<unknown>;

/**
 * Maps a report key to the service call that produces it.
 *
 * Keys mirror the read endpoints (`/reports/sales/revenue` → `sales-revenue`),
 * so the backoffice route table and this map stay obviously in sync.
 */
@Injectable()
export class ReportPdfResolver {
  private readonly fetchers: Record<string, ReportFetcher>;

  constructor(
    private readonly sales: SalesReportsService,
    private readonly purchases: PurchasesReportsService,
    private readonly invoices: InvoiceReportsService,
    private readonly payments: PaymentReportsService,
    private readonly clients: ClientReportsService,
    private readonly suppliers: SupplierReportsService,
    private readonly stock: StockReportsService,
    private readonly products: ProductReportsService,
  ) {
    this.fetchers = {
      // ── Sales ────────────────────────────────────────────────
      'sales-revenue': (f) => this.sales.getRevenueReport(f),
      'sales-top-products': (f) => this.sales.getTopProducts(f),
      'sales-by-customer': (f) => this.sales.getSalesByCustomer(f),
      'sales-by-category': (f) => this.sales.getSalesByCategory(f),
      'sales-by-pos': (f) => this.sales.getSalesByPos(f),

      // ── Purchases ────────────────────────────────────────────
      'purchases-by-period': (f) => this.purchases.getPurchasesByPeriod(f),
      'purchases-top-suppliers': (f) => this.purchases.getTopSuppliers(f),
      'purchases-by-product': (f) => this.purchases.getPurchasesByProduct(f),

      // ── Invoices ─────────────────────────────────────────────
      'invoices-journal-vente': (f) => this.invoices.getJournalVente(f),
      'invoices-journal-achat': (f) => this.invoices.getJournalAchat(f),
      'invoices-tva-summary': (f) => this.invoices.getTvaSummary(f),
      'invoices-outstanding': (f) => this.invoices.getOutstanding(f),
      'invoices-aging': (f) => this.invoices.getAgingBalance(f),

      // ── Payments ─────────────────────────────────────────────
      'payments-cashflow': (f) => this.payments.getCashflow(f),
      'payments-by-method': (f) => this.payments.getByMethod(f),
      'payments-in-out': (f) => this.payments.getInOutFlow(f),

      // ── Clients ──────────────────────────────────────────────
      'clients-top': (f) => this.clients.getTopCustomers(f),
      'clients-aging': (f) => this.clients.getCustomerAging(f),
      'clients-inactive': (f) => this.clients.getInactiveCustomers(f),
      'clients-statement': (f) => this.clients.getCustomerStatement(f),

      // ── Suppliers ────────────────────────────────────────────
      'suppliers-top': (f) => this.suppliers.getTopSuppliers(f),
      'suppliers-aging': (f) => this.suppliers.getSupplierAging(f),
      'suppliers-statement': (f) => this.suppliers.getSupplierStatement(f),

      // ── Stock ────────────────────────────────────────────────
      'stock-valuation': (f) => this.stock.getStockValuation(f),
      'stock-low-stock': (f) => this.stock.getLowStock(f),
      'stock-movements': (f) => this.stock.getMovementsJournal(f),
      'stock-slow-dead': (f) => this.stock.getSlowDeadStock(f),
      'stock-by-warehouse': (f) => this.stock.getStockByWarehouse(f),

      // ── Products ─────────────────────────────────────────────
      'products-performance': (f) => this.products.getProductPerformance(f),
      'products-margin': (f) => this.products.getMarginAnalysis(f),
      'products-never-sold': (f) => this.products.getNeverSoldProducts(f),
    };
  }

  /** Every report key that can be exported to PDF. */
  list(): string[] {
    return Object.keys(this.fetchers).sort();
  }

  /**
   * Runs the report behind `reportKey` and normalises its envelope.
   *
   * @throws BadRequestException when the key is unknown — the key comes from
   * the client, so an unrecognised one is a client error, not a server fault.
   */
  async resolve(
    reportKey: string,
    filter: ReportPdfFilterDto,
  ): Promise<ResolvedReportData> {
    const fetcher = this.fetchers[reportKey];
    if (!fetcher) {
      throw new BadRequestException(
        `Unknown report key "${reportKey}". Known keys: ${this.list().join(', ')}`,
      );
    }

    return normaliseReportData(await fetcher(filter));
  }
}

/**
 * Coerces a report service result into the `{ kpis, rows, meta }` envelope.
 *
 * Most services already return it; a few return a bare array of rows.
 */
export function normaliseReportData(result: unknown): ResolvedReportData {
  if (Array.isArray(result)) {
    return { rows: result as Array<Record<string, unknown>> };
  }

  const envelope = (result ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(envelope.rows)
    ? (envelope.rows as Array<Record<string, unknown>>)
    : [];

  return {
    kpis: (envelope.kpis ?? undefined) as ResolvedReportData['kpis'],
    rows,
    meta: (envelope.meta ?? undefined) as ResolvedReportData['meta'],
  };
}
