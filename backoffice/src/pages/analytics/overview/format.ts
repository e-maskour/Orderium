import { formatAmount, formatQuantity } from '@orderium/ui';

// ─── Formatting ──────────────────────────────────────────────

export type Fmt = 'currency' | 'integer' | 'percent' | 'number';

export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function fmtParts(v: unknown, f: Fmt): { main: string; unit?: string } {
  const n = num(v);
  switch (f) {
    case 'currency':
      return { main: formatAmount(n), unit: 'MAD' };
    case 'percent':
      return { main: formatQuantity(n, 1), unit: '%' };
    case 'integer':
      return { main: formatQuantity(Math.round(n), 0) };
    default:
      return { main: formatQuantity(n, 2) };
  }
}

export function fmt(v: unknown, f: Fmt): string {
  const { main, unit } = fmtParts(v, f);
  return unit ? `${main}\u00A0${unit}` : main;
}
