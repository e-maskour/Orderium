import { Invoice, InvoiceStatus } from './entities/invoice.entity';

// ─── Min-price validation ─────────────────────────────────────────────────

export interface MinPriceCheckItem {
  productId?: number | null;
  unitPrice?: number | null;
}

/**
 * Returns an error message if any item violates the minimum price constraint,
 * or null if all items are within allowed prices.
 */
export function findMinPriceViolation(
  items: MinPriceCheckItem[],
  productMap: Map<number, { name: string; minPrice: number }>,
): string | null {
  for (const item of items) {
    if (!item.productId) continue;
    const product = productMap.get(item.productId);
    if (!product) continue;
    if (product.minPrice > 0 && (item.unitPrice ?? 0) < product.minPrice) {
      return `Unit price ${item.unitPrice} is below minimum price ${product.minPrice} for product "${product.name}"`;
    }
  }
  return null;
}

// ─── Status label ─────────────────────────────────────────────────────────

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  const labels: Record<string, string> = {
    [InvoiceStatus.DRAFT]: 'Brouillon',
    [InvoiceStatus.UNPAID]: 'Non payée',
    [InvoiceStatus.PARTIAL]: 'Partiellement payée',
    [InvoiceStatus.PAID]: 'Payée',
  };
  return labels[status] ?? status;
}

// ─── XLSX export ──────────────────────────────────────────────────────────

export function buildInvoiceExportRows(
  invoice: Invoice,
): Record<string, unknown>[] {
  const isFactureAchat = !!invoice.supplierId;
  const base: Record<string, unknown> = {
    Numéro: invoice.documentNumber,
    Date: invoice.date
      ? new Date(invoice.date).toLocaleDateString('fr-FR')
      : '',
    'Date échéance': invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('fr-FR')
      : '',
    Type: isFactureAchat ? 'Facture achat' : 'Facture vente',
    'Client/Fournisseur': isFactureAchat
      ? invoice.supplierName || invoice.supplier?.name || ''
      : invoice.customerName || invoice.customer?.name || '',
    Téléphone: isFactureAchat
      ? invoice.supplierPhone || ''
      : invoice.customerPhone || '',
    Adresse: isFactureAchat
      ? invoice.supplierAddress || invoice.supplier?.address || ''
      : invoice.customerAddress || invoice.customer?.address || '',
    Statut: getInvoiceStatusLabel(invoice.status),
    'Sous-total': Number(invoice.subtotal),
    Remise: Number(invoice.discount),
    'Type remise': invoice.discountType === 0 ? 'Montant' : 'Pourcentage',
    Taxe: Number(invoice.tax),
    Total: Number(invoice.total),
    'Montant payé': Number(invoice.paidAmount),
    'Montant restant': Number(invoice.remainingAmount),
    Notes: invoice.notes || '',
  };

  if (invoice.items && invoice.items.length > 0) {
    return invoice.items.map((item, index) => ({
      ...base,
      Ligne: index + 1,
      'Code produit': item.product?.code || '',
      'Produit/Service': item.description,
      Quantité: Number(item.quantity),
      'Prix unitaire': Number(item.unitPrice),
      'Remise ligne': Number(item.discount),
      'Type remise ligne': item.discountType === 0 ? 'Montant' : 'Pourcentage',
      'Taxe ligne (%)': Number(item.tax),
      'Total ligne': Number(item.total),
    }));
  }

  return [
    {
      ...base,
      Ligne: '',
      'Code produit': '',
      'Produit/Service': '',
      Quantité: '',
      'Prix unitaire': '',
      'Remise ligne': '',
      'Type remise ligne': '',
      'Taxe ligne (%)': '',
      'Total ligne': '',
    },
  ];
}

export const INVOICE_XLSX_COL_WIDTHS = [
  15, 12, 15, 18, 25, 15, 30, 15, 12, 10, 12, 10, 12, 12, 15, 30, 8, 15, 25, 10,
  12, 12, 18, 12, 12,
].map((w) => ({ wch: w }));
