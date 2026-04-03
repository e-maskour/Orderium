// ─── Monthly chart data ───────────────────────────────────────────────────

export function computeMonthlyData(
  invoices: Array<{ date: Date | string; total: unknown }>,
): Array<{ month: number; count: number; amount: number }> {
  return Array.from({ length: 12 }, (_, i) => {
    const monthly = invoices.filter(
      (inv) => new Date(inv.date).getMonth() === i,
    );
    return {
      month: i + 1,
      count: monthly.length,
      amount: monthly.reduce((sum, inv) => sum + Number(inv.total), 0),
    };
  });
}

// ─── Dashboard aggregation ────────────────────────────────────────────────

export interface PartnerRevEntry {
  id: number;
  name: string;
  total: number;
  invoicesCount: number;
}

export interface PartnerLastEntry {
  id: number;
  name: string;
  phoneNumber: string;
  lastUpdate: Date;
  invoicesCount: number;
}

/**
 * Aggregates invoices by partner, returning the top 5 by revenue/expenses
 * and the 5 most recently invoiced partners.
 */
export function aggregatePartnerInvoices(
  invoices: Array<{
    customerId?: number | null;
    supplierId?: number | null;
    total: unknown;
    date: Date | string;
  }>,
  partners: Array<{ id: number; name: string; phoneNumber?: string | null }>,
  partnerIdField: 'customerId' | 'supplierId',
): { topPartners: PartnerRevEntry[]; lastUpdatedPartners: PartnerLastEntry[] } {
  const revMap = new Map<number, PartnerRevEntry>();
  const lastMap = new Map<number, PartnerLastEntry>();

  for (const invoice of invoices) {
    const partnerId = invoice[partnerIdField];
    if (!partnerId) continue;
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) continue;

    const invoiceDate = new Date(invoice.date);
    const amount = Number(invoice.total);

    const rev = revMap.get(partnerId);
    if (rev) {
      rev.total += amount;
      rev.invoicesCount += 1;
    } else {
      revMap.set(partnerId, {
        id: partner.id,
        name: partner.name,
        total: amount,
        invoicesCount: 1,
      });
    }

    const last = lastMap.get(partnerId);
    if (last) {
      if (invoiceDate > last.lastUpdate) last.lastUpdate = invoiceDate;
      last.invoicesCount += 1;
    } else {
      lastMap.set(partnerId, {
        id: partner.id,
        name: partner.name,
        phoneNumber: partner.phoneNumber || '',
        lastUpdate: invoiceDate,
        invoicesCount: 1,
      });
    }
  }

  const topPartners = Array.from(revMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const lastUpdatedPartners = Array.from(lastMap.values())
    .sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime())
    .slice(0, 5);

  return { topPartners, lastUpdatedPartners };
}
