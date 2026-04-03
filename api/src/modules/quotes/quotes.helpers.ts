/**
 * Pure helper functions for the quotes module.
 * No database access, no injected services — inputs in, outputs out.
 */
import { Quote, QuoteItem, QuoteStatus } from './entities/quote.entity';
import { SequenceConfig } from '../../common/types/sequence-config.interface';
import {
  buildFormatPattern,
  generateSequenceNumber,
} from '../../common/helpers/sequence.helpers';

// ─── Sequence response enrichment ─────────────────────────────────────────

export function enrichSequenceForResponse(
  sequence: SequenceConfig,
): SequenceConfig & { format: string; nextDocumentNumber: string } {
  return {
    ...sequence,
    format: buildFormatPattern(sequence),
    nextDocumentNumber: generateSequenceNumber(sequence),
  };
}

// ─── Min-price validation ──────────────────────────────────────────────────

export interface MinPriceCheckItem {
  productId?: number | null;
  unitPrice?: number | null;
}

/**
 * Validates item unit prices against a product min-price map.
 * Returns a human-readable error string if any item fails, or null if all pass.
 * Only applies to VENTE (customer) documents.
 */
export function findMinPriceViolation(
  items: MinPriceCheckItem[],
  productMap: Map<number, { name: string; minPrice: number }>,
): string | null {
  for (const item of items) {
    if (item.productId == null || item.unitPrice == null) continue;
    const product = productMap.get(item.productId);
    if (product && product.minPrice > 0 && item.unitPrice < product.minPrice) {
      return `Unit price ${item.unitPrice} is below minimum price ${product.minPrice} for product "${product.name}"`;
    }
  }
  return null;
}

// ─── Status label ──────────────────────────────────────────────────────────

export function getQuoteStatusLabel(status: QuoteStatus): string {
  const labels: Record<QuoteStatus, string> = {
    [QuoteStatus.DRAFT]: 'Brouillon',
    [QuoteStatus.OPEN]: 'Ouvert',
    [QuoteStatus.SIGNED]: 'Signée',
    [QuoteStatus.CLOSED]: 'Fermée',
    [QuoteStatus.DELIVERED]: 'Bon de livraison',
    [QuoteStatus.INVOICED]: 'Facturée',
  };
  return labels[status] ?? status;
}

// ─── XLSX export ───────────────────────────────────────────────────────────

export function buildQuoteExportRows(quote: Quote): Record<string, unknown>[] {
  const isDemandePrix = !!quote.supplierId;
  const base: Record<string, unknown> = {
    Numéro: quote.documentNumber,
    Date: quote.date ? new Date(quote.date).toLocaleDateString('fr-FR') : '',
    'Date expiration': quote.expirationDate
      ? new Date(quote.expirationDate).toLocaleDateString('fr-FR')
      : '',
    Type: isDemandePrix ? 'Demande de prix' : 'Devis',
    'Client/Fournisseur': isDemandePrix
      ? quote.supplierName || quote.supplier?.name || ''
      : quote.customerName || quote.customer?.name || '',
    Téléphone: isDemandePrix
      ? quote.supplierPhone || ''
      : quote.customerPhone || '',
    Adresse: isDemandePrix
      ? quote.supplierAddress || quote.supplier?.address || ''
      : quote.customerAddress || quote.customer?.address || '',
    Statut: getQuoteStatusLabel(quote.status),
    'Sous-total': Number(quote.subtotal),
    Remise: Number(quote.discount),
    'Type remise': quote.discountType === 0 ? 'Montant' : 'Pourcentage',
    Taxe: Number(quote.tax),
    Total: Number(quote.total),
    Notes: quote.notes || '',
  };

  const emptyItem = {
    Ligne: '',
    'Code produit': '',
    'Produit/Service': '',
    Quantité: '',
    'Prix unitaire': '',
    'Remise ligne': '',
    'Type remise ligne': '',
    'Taxe ligne (%)': '',
    'Total ligne': '',
  };

  if (!quote.items?.length) return [{ ...base, ...emptyItem }];

  return quote.items.map((item, index) => ({
    ...base,
    Ligne: index + 1,
    'Code produit': item.product?.code || '',
    'Produit/Service': item.description,
    Quantité: Number(item.quantity),
    'Prix unitaire': item.unitPrice !== null ? Number(item.unitPrice) : '',
    'Remise ligne': Number(item.discount),
    'Type remise ligne': item.discountType === 0 ? 'Montant' : 'Pourcentage',
    'Taxe ligne (%)': Number(item.tax),
    'Total ligne': item.total !== null ? Number(item.total) : '',
  }));
}

export const QUOTE_XLSX_COL_WIDTHS = [
  { wch: 15 },
  { wch: 12 },
  { wch: 15 },
  { wch: 18 },
  { wch: 25 },
  { wch: 15 },
  { wch: 30 },
  { wch: 15 },
  { wch: 12 },
  { wch: 10 },
  { wch: 12 },
  { wch: 10 },
  { wch: 12 },
  { wch: 30 },
  { wch: 8 },
  { wch: 15 },
  { wch: 25 },
  { wch: 10 },
  { wch: 12 },
  { wch: 12 },
  { wch: 18 },
  { wch: 12 },
  { wch: 12 },
];
