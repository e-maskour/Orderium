/** Calculate available quantity, safely parsing decimal/string values from the DB */
export function calcAvailableQty(
  quantity: unknown,
  reservedQuantity: unknown,
): number {
  const qty = parseFloat(String(quantity) || '0');
  const reserved = parseFloat(String(reservedQuantity) || '0');
  return qty - reserved;
}
