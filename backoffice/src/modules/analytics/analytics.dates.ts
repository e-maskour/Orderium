/**
 * Date ranges for analytics presets.
 *
 * `resolveRange` mirrors api/src/modules/reports/shared/date-range.util.ts
 * (period-to-date, Monday-based weeks) so the range shown on screen is the one
 * the API applies. `previousRange` gives the comparable earlier period used for
 * "vs previous period" deltas on the overview.
 */
import type { ReportFilter } from './analytics.interface';

export function toDateStr(d: Date): string {
  // Local date parts: toISOString() would shift the day in UTC+ timezones
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const startOfToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Same day-of-month `months` earlier, clamped to that month's last day. */
const shiftMonths = (d: Date, months: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
};

export function resolveRange(filter: ReportFilter): [Date, Date] | null {
  const today = startOfToday();
  switch (filter.preset ?? 'this_month') {
    case 'today':
      return [today, today];
    case 'yesterday': {
      const y = addDays(today, -1);
      return [y, y];
    }
    case 'this_week':
      return [addDays(today, -((today.getDay() + 6) % 7)), today];
    case 'this_month':
      return [new Date(today.getFullYear(), today.getMonth(), 1), today];
    case 'last_month':
      return [
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0),
      ];
    case 'this_quarter':
      return [new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1), today];
    case 'this_year':
      return [new Date(today.getFullYear(), 0, 1), today];
    case 'custom':
      return filter.startDate && filter.endDate
        ? [parseLocalDate(filter.startDate), parseLocalDate(filter.endDate)]
        : null;
    default:
      return null;
  }
}

/**
 * The comparable earlier period: yesterday for today, the same days of the
 * previous week / month / quarter / year for period-to-date presets, and the
 * equally long window just before for custom ranges.
 */
export function previousRange(filter: ReportFilter): [Date, Date] | null {
  const range = resolveRange(filter);
  if (!range) return null;
  const [from, to] = range;
  switch (filter.preset ?? 'this_month') {
    case 'today':
    case 'yesterday':
      return [addDays(from, -1), addDays(to, -1)];
    case 'this_week':
      return [addDays(from, -7), addDays(to, -7)];
    case 'this_month':
      return [shiftMonths(from, -1), shiftMonths(to, -1)];
    case 'last_month':
      return [
        new Date(from.getFullYear(), from.getMonth() - 1, 1),
        new Date(from.getFullYear(), from.getMonth(), 0),
      ];
    case 'this_quarter':
      return [shiftMonths(from, -3), shiftMonths(to, -3)];
    case 'this_year':
      return [shiftMonths(from, -12), shiftMonths(to, -12)];
    default: {
      const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
      return [addDays(from, -days), addDays(from, -1)];
    }
  }
}

/** A filter covering `range` exactly, as an explicit custom range. */
export function rangeFilter(range: [Date, Date]): ReportFilter {
  return { preset: 'custom', startDate: toDateStr(range[0]), endDate: toDateStr(range[1]) };
}
