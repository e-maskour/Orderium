export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export interface ReportFilter {
  preset?: DatePreset;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

export interface SalesReportFilter extends ReportFilter {
  warehouseId?: number;
  categoryId?: number;
  partnerId?: number;
}

export interface StockReportFilter extends ReportFilter {
  warehouseId?: number;
  categoryId?: number;
}

export interface AgingReportFilter {
  asOfDate?: string;
  page?: number;
  perPage?: number;
}

export interface PartnerStatementFilter extends ReportFilter {
  partnerId?: number;
}

export interface ReportKpi {
  label: string;
  value: number | string;
  suffix?: string;
  color?: 'green' | 'red' | 'blue' | 'orange' | 'purple';
}

export interface ReportChart {
  type: 'bar' | 'line' | 'pie' | 'area';
  labels: string[];
  series: { name: string; data: number[] }[] | number[];
}

export interface ReportMeta {
  total: number;
  page: number;
  perPage: number;
}

export interface ReportData<R = Record<string, unknown>> {
  kpis: Record<string, number | string>;
  chart: ReportChart | null;
  rows: R[];
  meta: ReportMeta | null;
}
