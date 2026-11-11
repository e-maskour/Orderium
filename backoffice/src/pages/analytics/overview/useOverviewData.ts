import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { previousRange, rangeFilter } from '../../../modules/analytics/analytics.dates';
import type { ReportData, ReportFilter } from '../../../modules/analytics/analytics.interface';

/** One overview data source — a report queried for the overview's period. */
export interface SourceState {
  data: ReportData | null;
  loading: boolean;
  /** The user lacks the permission for this report: hide the widget. */
  denied: boolean;
  error: string | null;
}

type Fetcher = (f: ReportFilter) => Promise<{ data: ReportData }>;

/** Small pages: the overview only shows the head of ranked lists. */
const TOP = { page: 1, perPage: 5 };

const SOURCES = {
  revenue: (f) => analyticsService.getSalesRevenue(f),
  topProducts: (f) => analyticsService.getSalesTopProducts({ ...f, ...TOP }),
  topCustomers: (f) => analyticsService.getSalesByCustomer({ ...f, ...TOP }),
  byCategory: (f) => analyticsService.getSalesByCategory(f),
  byChannel: (f) => analyticsService.getSalesByPos(f),
  purchases: (f) => analyticsService.getPurchasesByPeriod({ ...f, ...TOP }),
  margin: (f) => analyticsService.getMarginAnalysis({ ...f, ...TOP }),
  cashflow: (f) => analyticsService.getCashflow(f),
  outstanding: (f) => analyticsService.getOutstandingInvoices({ ...f, ...TOP }),
  // Point-in-time reports — the period does not apply.
  stockValue: () => analyticsService.getStockValuation(TOP),
  lowStock: () => analyticsService.getLowStock(TOP),
  receivables: () => analyticsService.getClientAging({}),
  payables: () => analyticsService.getSupplierAging({}),
} satisfies Record<string, Fetcher>;

/** Same reports over the previous comparable period, for deltas. */
const PREVIOUS = {
  revenue: SOURCES.revenue,
  purchases: SOURCES.purchases,
  margin: SOURCES.margin,
} satisfies Record<string, Fetcher>;

export type SourceKey = keyof typeof SOURCES;
export type PreviousKey = keyof typeof PREVIOUS;

const idle = (): SourceState => ({ data: null, loading: true, denied: false, error: null });

function initial<K extends string>(keys: K[]): Record<K, SourceState> {
  return Object.fromEntries(keys.map((k) => [k, idle()])) as Record<K, SourceState>;
}

/**
 * Loads every overview source in parallel. Each source settles on its own, so
 * one slow or forbidden report never blocks or breaks the rest of the page.
 */
export function useOverviewData(filter: ReportFilter, reloadToken: number) {
  const [current, setCurrent] = useState(() => initial(Object.keys(SOURCES) as SourceKey[]));
  const [previous, setPrevious] = useState(() => initial(Object.keys(PREVIOUS) as PreviousKey[]));
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    const prevRange = previousRange(filter);
    const prevFilter = prevRange ? rangeFilter(prevRange) : null;

    const run = <K extends string>(
      fetchers: Record<K, Fetcher>,
      f: ReportFilter | null,
      set: Dispatch<SetStateAction<Record<K, SourceState>>>,
    ) =>
      (Object.keys(fetchers) as K[]).map(async (key) => {
        set((s) => ({ ...s, [key]: { ...s[key], loading: true, error: null } }));
        if (!f) {
          set((s) => ({ ...s, [key]: { data: null, loading: false, denied: false, error: null } }));
          return;
        }
        try {
          const res = await fetchers[key](f);
          if (runId.current !== id) return;
          set((s) => ({
            ...s,
            [key]: { data: res.data, loading: false, denied: false, error: null },
          }));
        } catch (err) {
          if (runId.current !== id) return;
          const status = (err as { status?: number })?.status;
          set((s) => ({
            ...s,
            [key]: {
              data: null,
              loading: false,
              denied: status === 403,
              error: err instanceof Error ? err.message : String(err),
            },
          }));
        }
      });

    void Promise.allSettled([
      ...run(SOURCES, filter, setCurrent),
      ...run(PREVIOUS, prevFilter, setPrevious),
    ]).then(() => runId.current === id && setLoadedAt(new Date()));
  }, [filter, reloadToken]);

  const loading =
    Object.values<SourceState>(current).some((s) => s.loading) ||
    Object.values<SourceState>(previous).some((s) => s.loading);

  return { current, previous, loading, loadedAt };
}
