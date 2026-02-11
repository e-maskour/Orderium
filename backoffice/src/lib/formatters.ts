/**
 * Format a number with European style (dot as thousands separator, comma as decimal separator)
 * Example: 12345.67 -> "12.345,67"
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
  // Convert to number and handle invalid values
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue) || numValue === null || numValue === undefined) {
    return '0,00';
  }
  
  const rounded = Number(numValue.toFixed(decimals));
  const parts = rounded.toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];
  return `${integerPart},${decimalPart}`;
}

/**
 * Format currency with DH (French) or د.م (Arabic)
 * Example: 12345.67, 'fr' -> "12.345,67 DH"
 * Example: 12345.67, 'ar' -> "12.345,67 د.م"
 */
export function formatCurrency(value: number | string, language: 'fr' | 'ar' = 'fr'): string {
  const formattedNumber = formatNumber(value, 2);
  const currency = language === 'ar' ? 'د.م' : 'DH';
  return `${formattedNumber} ${currency}`;
}
