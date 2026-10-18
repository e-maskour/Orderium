// French number conventions for every Morocom app: "," is the decimal separator.
// Display values use formatAmount (12.374,90). Input values are never grouped (14230,12).

/**
 * Parses user input that may use "," or "." as decimal separator.
 * Spaces (incl. narrow no-break spaces) are ignored. Returns null for empty/invalid input.
 */
export function parseDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = value.replace(/[\s  ]/g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Formats a number for an input field: comma decimal, no thousands grouping.
 * minFractionDigits pads ("12" → "12,00"); maxFractionDigits rounds.
 */
export function formatDecimalInput(
  value: number | null | undefined,
  minFractionDigits = 0,
  maxFractionDigits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const max = Math.max(minFractionDigits, maxFractionDigits);
  let text = value.toFixed(max);
  if (max > minFractionDigits) {
    // Drop trailing zeros beyond the minimum
    const [int, dec = ''] = text.split('.');
    let trimmed = dec.replace(/0+$/, '');
    if (trimmed.length < minFractionDigits) trimmed = trimmed.padEnd(minFractionDigits, '0');
    text = trimmed ? `${int}.${trimmed}` : int;
  }
  return text.replace('.', ',');
}

/**
 * Formats a quantity for display: comma decimal, "." thousands, no useless trailing zeros.
 * 2.5 → "2,5", 3 → "3", 1250.125 → "1.250,125"
 */
export function formatQuantity(value: number | string | null | undefined, maxDecimals = 3): string {
  const num = parseDecimal(value as string | number | null | undefined) ?? 0;
  const [int, dec] = formatDecimalInput(num, 0, maxDecimals).split(',');
  const sign = int.startsWith('-') ? '-' : '';
  const grouped = int.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec ? `${sign}${grouped},${dec}` : `${sign}${grouped}`;
}
