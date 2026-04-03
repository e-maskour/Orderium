import { useMemo } from 'react';
import { DocumentItem } from '../types';

interface DocumentCalculation {
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  taxByRate: Record<number, number>;
}

export function useDocumentCalculation(items: DocumentItem[]): DocumentCalculation {
  const calculations = useMemo(() => {
    // Total HT (before tax)
    const totalHT = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount =
        item.discountType === 1 ? itemSubtotal * (item.discount / 100) : item.discount;
      return sum + (itemSubtotal - discountAmount);
    }, 0);

    // Group items by tax rate and calculate TVA for each rate
    const taxByRate = items.reduce(
      (acc, item) => {
        if (item.tax > 0) {
          const itemSubtotal = item.quantity * item.unitPrice;
          const discountAmount =
            item.discountType === 1 ? itemSubtotal * (item.discount / 100) : item.discount;
          const itemHT = itemSubtotal - discountAmount;
          const itemTVA = itemHT * (item.tax / 100);

          if (!acc[item.tax]) {
            acc[item.tax] = 0;
          }
          acc[item.tax] += itemTVA;
        }
        return acc;
      },
      {} as Record<number, number>,
    );

    // Total TVA (sum of all tax amounts)
    const totalTVA = Object.values(taxByRate).reduce((sum, tva) => sum + tva, 0);

    // Total TTC (total including tax)
    const totalTTC = totalHT + totalTVA;

    return {
      totalHT,
      totalTVA,
      totalTTC,
      taxByRate,
    };
  }, [items]);

  return calculations;
}

export function calculateItemTotal(item: DocumentItem): number {
  const subtotal = item.quantity * item.unitPrice;
  const discountAmount = item.discountType === 1 ? subtotal * (item.discount / 100) : item.discount;
  return subtotal - discountAmount;
}
