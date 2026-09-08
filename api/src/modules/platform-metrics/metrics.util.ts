/**
 * Shared date/format helpers for platform metrics.
 *
 * Every metric is keyed to a calendar day in one fixed reporting timezone
 * (METRICS_TIMEZONE, default Africa/Casablanca). Without a fixed zone, day
 * boundaries drift with the server's locale and daily totals silently shift.
 */

const DEFAULT_TIMEZONE = 'Africa/Casablanca';

/** `YYYY-MM-DD` for `at`, evaluated in the reporting timezone. */
export function reportingDate(at: Date, timeZone?: string | null): string {
  const zone = timeZone || DEFAULT_TIMEZONE;
  try {
    // en-CA formats as YYYY-MM-DD, which is exactly the shape we store.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
  } catch {
    // Unknown timezone in config — fall back to UTC rather than crashing a cron.
    return at.toISOString().slice(0, 10);
  }
}

/** First day of the month containing `date` (`YYYY-MM-DD` in, `YYYY-MM-DD` out). */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** `date` shifted by `days` (negative to go back), staying in `YYYY-MM-DD`. */
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of dates from `from` to `to`. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  // Guard against an inverted or absurd range producing an unbounded loop.
  for (let i = 0; i < 3660 && cursor <= to; i++) {
    out.push(cursor);
    cursor = shiftDate(cursor, 1);
  }
  return out;
}

/** Start of the hour containing `at`, as a Date. */
export function hourStart(at: Date): Date {
  const d = new Date(at);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Percentage change from `previous` to `current`.
 *
 * Returns null when there is no previous value to compare against, so the UI
 * can render "new" instead of a meaningless +100%.
 */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Latency histogram bucket upper bounds, in milliseconds.
 *
 * Fixed buckets let us keep an approximate p95 in Redis with a handful of
 * counters instead of retaining every sample. The last bucket is unbounded.
 */
export const LATENCY_BUCKETS_MS = [
  10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
];

/** Index of the histogram bucket a duration falls into. */
export function latencyBucketIndex(durationMs: number): number {
  for (let i = 0; i < LATENCY_BUCKETS_MS.length; i++) {
    if (durationMs <= LATENCY_BUCKETS_MS[i]) return i;
  }
  return LATENCY_BUCKETS_MS.length; // overflow bucket
}

/**
 * Approximate the `q` quantile from histogram bucket counts.
 *
 * Returns the upper bound of the bucket the quantile falls in — an
 * over-estimate by design, which is the safe direction for a latency alarm.
 */
export function quantileFromBuckets(counts: number[], q: number): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const target = total * q;
  let seen = 0;
  for (let i = 0; i < counts.length; i++) {
    seen += counts[i];
    if (seen >= target) {
      return i < LATENCY_BUCKETS_MS.length
        ? LATENCY_BUCKETS_MS[i]
        : LATENCY_BUCKETS_MS[LATENCY_BUCKETS_MS.length - 1] * 2;
    }
  }
  return LATENCY_BUCKETS_MS[LATENCY_BUCKETS_MS.length - 1] * 2;
}
