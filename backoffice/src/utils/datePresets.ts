export type DatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'last_month'
  | 'year'
  | 'last_year'
  | 'custom';

export interface DateRange {
  start?: Date;
  end?: Date;
}

/** Resolves a preset to concrete bounds (start of first day → end of last day). */
export function presetRange(preset: DatePreset, now = new Date()): DateRange {
  const day = (y: number, m: number, d: number, end = false) =>
    end ? new Date(y, m, d, 23, 59, 59, 999) : new Date(y, m, d);
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (preset) {
    case 'today':
      return { start: day(y, m, d), end: day(y, m, d, true) };
    case 'yesterday':
      return { start: day(y, m, d - 1), end: day(y, m, d - 1, true) };
    case 'week': {
      // Week starts on Sunday, as the API filters have always assumed
      const first = d - now.getDay();
      return { start: day(y, m, first), end: day(y, m, first + 6, true) };
    }
    case 'month':
      return { start: day(y, m, 1), end: day(y, m + 1, 0, true) };
    case 'last_month':
      return { start: day(y, m - 1, 1), end: day(y, m, 0, true) };
    case 'year':
      return { start: day(y, 0, 1), end: day(y, 11, 31, true) };
    case 'last_year':
      return { start: day(y - 1, 0, 1), end: day(y - 1, 11, 31, true) };
    default:
      return {};
  }
}
