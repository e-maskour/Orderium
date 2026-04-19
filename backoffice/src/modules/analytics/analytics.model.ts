import type { ReportFilter, AgingReportFilter, PartnerStatementFilter, StockReportFilter, SalesReportFilter } from './analytics.interface';

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

export type ReportFilterParams = ReportFilter | AgingReportFilter | PartnerStatementFilter | StockReportFilter | SalesReportFilter;

export function buildReportQueryString(filter: ReportFilterParams): string {
  return toQuery(filter as Record<string, string | number | boolean | undefined>);
}
