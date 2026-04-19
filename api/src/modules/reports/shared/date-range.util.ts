import { DatePreset } from '../dto/report-filter.dto';

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Resolves a DatePreset or explicit startDate/endDate pair into a { from, to } Date range.
 * Times are normalised to start-of-day (00:00:00) and end-of-day (23:59:59) in local server time.
 */
export function resolveDateRange(
  preset?: DatePreset,
  startDate?: string,
  endDate?: string,
): DateRange {
  const now = new Date();

  const startOfDay = (d: Date): Date => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  };

  const endOfDay = (d: Date): Date => {
    const r = new Date(d);
    r.setHours(23, 59, 59, 999);
    return r;
  };

  if (preset === DatePreset.CUSTOM && startDate && endDate) {
    return {
      from: startOfDay(new Date(startDate)),
      to: endOfDay(new Date(endDate)),
    };
  }

  switch (preset) {
    case DatePreset.TODAY:
      return { from: startOfDay(now), to: endOfDay(now) };

    case DatePreset.YESTERDAY: {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }

    case DatePreset.THIS_WEEK: {
      const day = now.getDay(); // 0=Sunday
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      return { from: startOfDay(monday), to: endOfDay(now) };
    }

    case DatePreset.THIS_MONTH: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(from), to: endOfDay(now) };
    }

    case DatePreset.LAST_MONTH: {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(from), to: endOfDay(to) };
    }

    case DatePreset.THIS_QUARTER: {
      const quarter = Math.floor(now.getMonth() / 3);
      const from = new Date(now.getFullYear(), quarter * 3, 1);
      return { from: startOfDay(from), to: endOfDay(now) };
    }

    case DatePreset.THIS_YEAR: {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: startOfDay(from), to: endOfDay(now) };
    }

    default: {
      // Default: this month
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
  }
}

/**
 * Formats a date as YYYY-MM-DD string for SQL date comparisons.
 */
export function toSqlDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Groups a list of { date: string, value: number } items into monthly buckets,
 * returning an array of { month: string (YYYY-MM), total: number }.
 */
export function groupByMonth(
  rows: Array<{ date: string; value: number }>,
): Array<{ month: string; total: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const month = row.date.slice(0, 7); // YYYY-MM
    map.set(month, (map.get(month) ?? 0) + row.value);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}
