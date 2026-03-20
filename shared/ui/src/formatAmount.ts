/**
 * Canonical amount formatter for all Orderium apps.
 * Format: 12.374.123,90  (dots = thousands separator, comma = decimal)
 *
 * @param value   - The numeric value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string, e.g. "12.374.123,90"
 */
export function formatAmount(value: number | string | null | undefined, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num) || !isFinite(num)) return decimals > 0 ? `0,${'0'.repeat(decimals)}` : '0';

  const fixed = num.toFixed(decimals);
  const [integer, decimal] = fixed.split('.');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return decimals > 0 ? `${formattedInteger},${decimal}` : formattedInteger;
}

/**
 * Formats an amount with the Moroccan currency symbol.
 *
 * @param value   - The numeric value to format
 * @param lang    - Language: 'fr' appends "DH", 'ar' appends "د.م"
 * @param decimals - Number of decimal places (default: 2)
 * @returns e.g. "12.374,90 DH" or "12.374,90 د.م"
 */
export function formatCurrency(
  value: number | string | null | undefined,
  lang: 'fr' | 'ar' = 'fr',
  decimals: number = 2
): string {
  const symbol = lang === 'ar' ? 'د.م' : 'DH';
  return `${formatAmount(value, decimals)} ${symbol}`;
}
