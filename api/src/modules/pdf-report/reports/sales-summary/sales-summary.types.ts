/**
 * Payload for the `sales-summary` report.
 *
 * Shaped to match what `SalesReportsService.getRevenueReport()` already
 * returns, so the reports module can feed the engine without an extra
 * translation layer.
 */

/** Aggregate figures for the reporting period. */
export interface SalesSummaryKpis {
  totalRevenue: number;
  totalOrders: number;
  /** Average order value. */
  avgOrder: number;
  /** Optional period-over-period revenue change, in percent. */
  revenueChangePercent?: number;
}

/** One order line in the detail table. */
export interface SalesSummaryOrderRow {
  reference: string;
  date: Date | string;
  customer: string;
  total: number;
  status: string;
  /** Sales channel / point of sale, e.g. `BACKOFFICE`, `CLIENT_POS`. */
  channel?: string;
}

/** One product line in the best-sellers table. */
export interface SalesSummaryProductRow {
  product: string;
  quantity: number;
  revenue: number;
  /** Share of total revenue, in percent. */
  sharePercent?: number;
}

/** The reporting window, echoed into the report header chips. */
export interface SalesSummaryPeriod {
  from: Date | string;
  to: Date | string;
  /** Optional human label, e.g. `Ce mois-ci`. */
  label?: string;
}

/** Complete payload consumed by {@link SalesSummaryMapper}. */
export interface SalesSummaryData {
  period: SalesSummaryPeriod;
  kpis: SalesSummaryKpis;
  orders: SalesSummaryOrderRow[];
  /** Best-selling products. Omit to skip that section entirely. */
  topProducts?: SalesSummaryProductRow[];
  /** Optional narrative shown under the title. */
  summary?: string;
  /**
   * Total row count when `orders` is a page of a larger set — printed as a
   * note under the table so the reader knows the export is partial.
   */
  totalOrderCount?: number;
}
