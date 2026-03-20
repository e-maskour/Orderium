import { formatAmount } from '@orderium/ui';

export { formatAmount as formatFrenchNumber } from '@orderium/ui';

export function formatDH(value: number, decimals: number = 2): string {
  return `${formatAmount(value, decimals)} DH`;
}
