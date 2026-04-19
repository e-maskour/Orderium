import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { Partner } from '../../partners/entities/partner.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { Invoice, InvoiceStatus } from '../../invoices/entities/invoice.entity';
import { Payment } from '../../payments/payment.entity';
import { DocumentDirection } from '../../../common/entities/base-document.entity';
import { resolveDateRange, toSqlDate } from '../shared/date-range.util';
import { ReportFilterDto, PartnerStatementFilterDto, AgingReportFilterDto } from '../dto/report-filter.dto';

const TTL = 300_000;

@Injectable()
export class SupplierReportsService {
  private readonly logger = new Logger(SupplierReportsService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) { }

  private get partnerRepo() { return this.tenantConnService.getRepository(Partner); }
  private get orderRepo() { return this.tenantConnService.getRepository(Order); }
  private get invoiceRepo() { return this.tenantConnService.getRepository(Invoice); }
  private get paymentRepo() { return this.tenantConnService.getRepository(Payment); }

  private cacheKey(suffix: string, filter: object): string {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    return `tenant:${slug}:reports:suppliers:${suffix}:${JSON.stringify(filter)}`;
  }

  private async withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;
    const value = await fn();
    await this.cache.set(key, value, TTL);
    return value;
  }

  /** Top suppliers by total purchases */
  async getTopSuppliers(filter: ReportFilterDto) {
    const key = this.cacheKey('top', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(filter.preset, filter.startDate, filter.endDate);
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const allRows = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.date >= :from AND o.date <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .andWhere('o.status NOT IN (:...cancelled)', { cancelled: [OrderStatus.CANCELLED] })
        .andWhere('o.supplierId IS NOT NULL')
        .select('o.supplierId', 'supplierId')
        .addSelect('o.supplierName', 'supplierName')
        .addSelect('COUNT(o.id)', 'orderCount')
        .addSelect('SUM(o.total)', 'totalPurchases')
        .addSelect('AVG(o.total)', 'avgOrder')
        .groupBy('o.supplierId')
        .addGroupBy('o.supplierName')
        .orderBy('SUM(o.total)', 'DESC')
        .getRawMany<{ supplierId: number; supplierName: string; orderCount: string; totalPurchases: string; avgOrder: string }>();

      const total = allRows.length;
      const rows = allRows.slice((page - 1) * perPage, page * perPage);
      const top10 = allRows.slice(0, 10);

      return {
        kpis: {
          uniqueSuppliers: total,
          totalPurchases: allRows.reduce((s, r) => s + Number(r.totalPurchases), 0),
          topSupplier: allRows[0]?.supplierName ?? '-',
        },
        chart: {
          type: 'bar',
          labels: top10.map((r) => r.supplierName ?? `#${r.supplierId}`),
          series: [{ name: 'Achats (MAD)', data: top10.map((r) => Number(r.totalPurchases)) }],
        },
        rows: rows.map((r, i) => ({
          rank: (page - 1) * perPage + i + 1,
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          orderCount: Number(r.orderCount),
          totalAmount: Number(r.totalPurchases),
          avgOrder: Number(r.avgOrder),
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Supplier aging — outstanding purchase invoices grouped by supplier */
  async getSupplierAging(filter: AgingReportFilterDto) {
    const key = this.cacheKey('aging', filter);
    return this.withCache(key, async () => {
      const asOf = filter.asOfDate ? new Date(filter.asOfDate) : new Date();
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const raw = await this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.remainingAmount > 0')
        .andWhere('inv.isValidated = true')
        .andWhere('inv.direction = :dir', { dir: DocumentDirection.ACHAT })
        .andWhere('inv.status IN (:...statuses)', { statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] })
        .select(['inv.id', 'inv.supplierId', 'inv.supplierName', 'inv.dueDate', 'inv.date', 'inv.remainingAmount'])
        .getMany();

      const supplierMap = new Map<number | string, {
        supplierId: number | null; supplierName: string;
        current: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number; total: number;
      }>();

      for (const inv of raw) {
        const mapKey = inv.supplierId ?? inv.supplierName;
        if (!supplierMap.has(mapKey)) {
          supplierMap.set(mapKey, { supplierId: inv.supplierId, supplierName: inv.supplierName ?? '-', current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 });
        }
        const entry = supplierMap.get(mapKey)!;
        const ref = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
        const daysLate = Math.max(0, Math.floor((asOf.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24)));
        const amount = Number(inv.remainingAmount);
        entry.total += amount;
        if (daysLate === 0) entry.current += amount;
        else if (daysLate <= 30) entry.d1_30 += amount;
        else if (daysLate <= 60) entry.d31_60 += amount;
        else if (daysLate <= 90) entry.d61_90 += amount;
        else entry.d90plus += amount;
      }

      const allRows = Array.from(supplierMap.values()).sort((a, b) => b.total - a.total);
      const total = allRows.length;
      const rows = allRows.slice((page - 1) * perPage, page * perPage);

      return {
        kpis: {
          totalDettes: allRows.reduce((s, r) => s + r.total, 0),
          suppliers: total,
          over90: allRows.reduce((s, r) => s + r.d90plus, 0),
        },
        chart: {
          type: 'bar',
          labels: ['À échéance', '1-30j', '31-60j', '61-90j', '+90j'],
          series: [{
            name: 'Dettes (MAD)',
            data: [
              allRows.reduce((s, r) => s + r.current, 0),
              allRows.reduce((s, r) => s + r.d1_30, 0),
              allRows.reduce((s, r) => s + r.d31_60, 0),
              allRows.reduce((s, r) => s + r.d61_90, 0),
              allRows.reduce((s, r) => s + r.d90plus, 0),
            ],
          }],
        },
        rows: rows.map((r) => ({
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          current: r.current,
          days1_30: r.d1_30,
          days31_60: r.d31_60,
          days61_90: r.d61_90,
          over90: r.d90plus,
          total: r.total,
        })),
        meta: { total, page, perPage, asOfDate: asOf.toISOString().slice(0, 10) },
      };
    });
  }

  /** Supplier statement — ledger of purchase invoices + payments for a specific supplier */
  async getSupplierStatement(filter: PartnerStatementFilterDto) {
    const key = this.cacheKey('statement', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(filter.preset, filter.startDate, filter.endDate);
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      if (!filter.partnerId) {
        return { kpis: { openBalance: 0, totalInvoiced: 0, totalPaid: 0 }, chart: null, rows: [], meta: { total: 0, page, perPage } };
      }

      const partner = await this.partnerRepo.findOne({ where: { id: filter.partnerId } });

      const invoices = await this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.supplierId = :id', { id: filter.partnerId })
        .andWhere('inv.date >= :from AND inv.date <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .andWhere('inv.isValidated = true')
        .andWhere('inv.direction = :dir', { dir: DocumentDirection.ACHAT })
        .select(['inv.id', 'inv.documentNumber', 'inv.date', 'inv.total', 'inv.paidAmount', 'inv.remainingAmount', 'inv.status'])
        .getMany();

      const payments = await this.paymentRepo
        .createQueryBuilder('p')
        .where('p.supplierId = :id', { id: filter.partnerId })
        .andWhere('p.paymentDate >= :from AND p.paymentDate <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .select(['p.id', 'p.paymentDate', 'p.amount', 'p.paymentType', 'p.notes'])
        .getMany();

      const ledger = [
        ...invoices.map((inv) => ({
          id: `inv-${inv.id}`, date: inv.date, reference: inv.documentNumber,
          description: 'facture', debit: inv.total, credit: 0, balance: 0,
        })),
        ...payments.map((p) => ({
          id: `pay-${p.id}`, date: p.paymentDate, reference: 'Règlement',
          description: 'paiement', debit: 0, credit: p.amount, balance: 0,
        })),
      ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

      let runningBalance = 0;
      for (const row of ledger) {
        runningBalance += row.debit - row.credit;
        row.balance = runningBalance;
      }

      const total = ledger.length;
      const rows = ledger.slice((page - 1) * perPage, page * perPage);

      return {
        kpis: {
          openBalance: runningBalance,
          totalInvoiced: invoices.reduce((s, i) => s + Number(i.total), 0),
          totalPaid: payments.reduce((s, p) => s + Number(p.amount), 0),
        },
        chart: null,
        partnerName: partner?.name ?? '-',
        rows,
        meta: { total, page, perPage },
      };
    });
  }

  async getTopSuppliersXlsx(filter: ReportFilterDto): Promise<Buffer> {
    const data = await this.getTopSuppliers({ ...filter, page: 1, perPage: 10_000 });
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.rows.map((r) => ({
      'Fournisseur': r.supplierName, 'Commandes': r.orderCount,
      'Achats (MAD)': r.totalAmount, 'Panier moyen (MAD)': r.avgOrder,
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Top Fournisseurs');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
