// ─── Partner info extraction ──────────────────────────────────────────────

export interface PartnerableEntity {
  supplierId?: number | null;
  customerName?: string | null;
  customer?: {
    name?: string | null;
    phoneNumber?: string | null;
    address?: string | null;
    ice?: string | null;
  } | null;
  supplierName?: string | null;
  supplier?: {
    name?: string | null;
    phoneNumber?: string | null;
    address?: string | null;
    ice?: string | null;
  } | null;
  customerPhone?: string | null;
  supplierPhone?: string | null;
  customerAddress?: string | null;
  supplierAddress?: string | null;
}

export interface PartnerInfo {
  customerName: string;
  customerPhone: string | undefined;
  customerAddress: string | undefined;
  customerIce: string | undefined;
  supplierName: string | undefined;
}

export function extractPartnerInfo(
  entity: PartnerableEntity,
  isDemandePrix: boolean,
): PartnerInfo {
  return {
    customerName: isDemandePrix
      ? entity.supplierName || entity.supplier?.name || 'Fournisseur'
      : entity.customerName || entity.customer?.name || 'Client',
    customerPhone:
      (isDemandePrix
        ? entity.supplierPhone || entity.supplier?.phoneNumber
        : entity.customerPhone || entity.customer?.phoneNumber) ?? undefined,
    customerAddress:
      (isDemandePrix
        ? entity.supplierAddress || entity.supplier?.address
        : entity.customerAddress || entity.customer?.address) ?? undefined,
    customerIce:
      (isDemandePrix ? entity.supplier?.ice : entity.customer?.ice) ??
      undefined,
    supplierName: isDemandePrix
      ? entity.supplierName || entity.supplier?.name || undefined
      : undefined,
  };
}

// ─── Items mapping ────────────────────────────────────────────────────────

export interface RawDocumentItem {
  description?: string | null;
  product?: { name?: string | null } | null;
  quantity: unknown;
  unitPrice: unknown;
  discount?: unknown;
  tax?: unknown;
  total: unknown;
}

export function mapDocumentItems(items: RawDocumentItem[]): Array<{
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}> {
  return items.map((item) => ({
    description: item.description || item.product?.name || 'Article',
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unitPrice) || 0,
    discount: Number(item.discount) || 0,
    tax: Number(item.tax) || 0,
    total: Number(item.total) || 0,
  }));
}
