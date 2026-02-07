/**
 * Formats a number to French format:
 * - Uses '.' as thousands separator
 * - Uses ',' as decimal separator
 * 
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "12.283,89")
 */
export function formatFrenchNumber(value: number, decimals: number = 2): string {
  // Handle edge cases
  if (isNaN(value) || !isFinite(value)) return '0';
  
  // Round to specified decimal places
  const rounded = Number(value.toFixed(decimals));
  
  // Split into integer and decimal parts
  const parts = rounded.toFixed(decimals).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add thousands separator (.)
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Combine with comma as decimal separator
  return decimals > 0 ? `${formattedInteger},${decimalPart}` : formattedInteger;
}

/**
 * Formats a currency amount in French format with DH suffix
 * 
 * @param value - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with DH suffix (e.g., "12.283,89 DH")
 */
export function formatDH(value: number, decimals: number = 2): string {
  return `${formatFrenchNumber(value, decimals)} DH`;
}
