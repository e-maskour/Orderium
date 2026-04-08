/**
 * Computes the period key for a given reset period and date.
 *
 * This key is stored on the sequence row and compared at generation time.
 * If the key has changed since the last generation, the counter resets to 1.
 *
 * Examples:
 *   computePeriodKey('yearly',  new Date('2026-04-04')) → '2026'
 *   computePeriodKey('monthly', new Date('2026-04-04')) → '2026-04'
 *   computePeriodKey('daily',   new Date('2026-04-04')) → '2026-04-04'
 *   computePeriodKey('never',   new Date('2026-04-04')) → 'NEVER'
 */
export function computePeriodKey(resetPeriod: string, date: Date): string {
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');

  switch (resetPeriod) {
    case 'daily':
      return `${y}-${m}-${d}`;
    case 'monthly':
      return `${y}-${m}`;
    case 'yearly':
      return y;
    case 'never':
      return 'NEVER';
    default:
      return y;
  }
}

/** Numeric granularity — higher = more frequent resets. */
const GRANULARITY: Record<string, number> = {
  daily: 4,
  monthly: 3,
  quarterly: 2,
  yearly: 1,
  never: 0,
};

/**
 * Returns the effective period key, choosing the MORE GRANULAR of:
 *  - the admin-configured `resetPeriod`, and
 *  - the time components present in the format template.
 *
 * This guarantees that a format containing 'MM' is always treated as at
 * least monthly — so the counter resets whenever the month shown in the
 * document number changes, regardless of what `resetPeriod` was set to.
 *
 * Examples (format DV-YYYY-MM-XXXX, resetPeriod='yearly'):
 *   April 2026 → '2026-04'   (monthly wins over yearly)
 *   May   2026 → '2026-05'   (different key → counter resets to 1)
 */
export function computeEffectivePeriodKey(
  resetPeriod: string,
  formatFlags: {
    dayInFormat?: boolean;
    monthInFormat?: boolean;
    trimesterInFormat?: boolean;
  },
  date: Date,
): string {
  const {
    dayInFormat = false,
    monthInFormat = false,
    trimesterInFormat = false,
  } = formatFlags;

  // Derive the period implied by the format's time components.
  const formatPeriod: string = dayInFormat
    ? 'daily'
    : monthInFormat
      ? 'monthly'
      : trimesterInFormat
        ? 'quarterly'
        : 'never';

  // Use whichever is more granular (higher number).
  const cfgGranularity = GRANULARITY[resetPeriod] ?? 1;
  const fmtGranularity = GRANULARITY[formatPeriod] ?? 0;
  const effective =
    fmtGranularity > cfgGranularity ? formatPeriod : resetPeriod;

  // Special case: quarterly (trimester) — Q1 = months 1-3, Q2 = 4-6, etc.
  if (effective === 'quarterly') {
    const y = date.getFullYear().toString();
    const q = Math.ceil((date.getMonth() + 1) / 3).toString();
    return `${y}-Q${q}`;
  }

  return computePeriodKey(effective, date);
}
