import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { Invoice, InvoiceItem, InvoiceStatus } from '../../invoices/entities/invoice.entity';
import { DocumentDirection } from '../../../common/entities/base-document.entity';
import { resolveDateRange, toSqlDate } from '../shared/date-range.util';
import { InvoiceReportFilterDto, ReportFilterDto, AgingReportFilterDto } from '../dto/report-filter.dto';

const TTL = 300_000;

/** Moroccan VAT rates */
const TVA_RATES = [20, 14, 10, 7, 0];

@Injectable()
export class InvoiceReportsService {
  private readonly logger = new Logger(InvoiceReportsService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) { }

  private get invoiceRepo() {
    return this.tenantConnService.getRepository(Invoice);
  }

  private get invoiceItemRepo() {
    return this.tenantConnService.getRepository(InvoiceItem);
  }

  private cacheKey(suffix: string, filter: object): string {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    return `tenant:${slug}:reports:invoices:${suffix}:${JSON.stringify(filter)}`;
  }

  private async withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;
    const value = await fn();
    await this.cache.set(key, value, TTL);
    return value;
  }

  /** Sales invoice journal */
  async getJournalVente(filter: InvoiceReportFilterDto) {
    const key = this.cacheKey('journal-vente', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(filter.preset, filter.startDate, filter.endDate);
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const qb = this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.date >= :from AND inv.date <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .andWhere('inv.direction = :dir', { dir: DocumentDirection.VENTE })
        .andWhere('inv.isValidated = true');

      const kpiRaw = await qb
        .select('SUM(inv.total)', 'totalHT')
        .addSelect('SUM(inv.tax)', 'totalTVA')
        .addSelect('SUM(inv.paidAmount)', 'totalPaid')
        .addSelect('SUM(inv.remainingAmount)', 'totalRemaining')
        .addSelect('COUNT(inv.id)', 'count')
        .getRawOne<{ totalHT: string; totalTVA: string; totalPaid: string; totalRemaining: string; count: string }>();

      const [rows, total] = await this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.date >= :from AND inv.date <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .andWhere('inv.direction = :dir', { dir: DocumentDirection.VENTE })
        .andWhere('inv.isValidated = true')
        .select(['inv.id', 'inv.documentNumber', 'inv.date', 'inv.customerName', 'inv.subtotal', 'inv.tax', 'inv.total', 'inv.paidAmount', 'inv.remainingAmount', 'inv.status'])
        .orderBy('inv.date', 'DESC')
        .skip((page - 1) * perPage)
        .take(perPage)
        .getManyAndCount();

      return {
        kpis: {
          totalTTC: Number(kpiRaw?.totalHT ?? 0),
          totalTVA: Number(kpiRaw?.totalTVA ?? 0),
          totalPaid: Number(kpiRaw?.totalPaid ?? 0),
          totalRemaining: Number(kpiRaw?.totalRemaining ?? 0),
          count: Number(kpiRaw?.count ?? 0),
        },
        chart: null,
        rows: rows.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.documentNumber,
          invoiceDate: inv.date,
          customerName: inv.customerName,
          ht: inv.subtotal,
          tva: inv.tax,
          ttc: inv.total,
          paid: inv.paidAmount,
          remaining: inv.remainingAmount,
          status: inv.status,
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Purchase invoice journal */
  async getJournalAchat(filter: InvoiceReportFilterDto) {
    const key = this.cacheKey('journal-achat', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(filter.preset, filter.startDate, filter.endDate);
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const qb = this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.date >= :from AND inv.date <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .andWhere('inv.direction = :dir', { dir: DocumentDirection.ACHAT })
        .andWhere('inv.isValidated = true');

      const kpiRaw = await qb
        .select('SUM(inv.total)', 'totalTTC')
        .addSelect('SUM(inv.tax)', 'totalTVA')
        .addSelect('SUM(inv.paidAmount)', 'totalPaid')
        .addSelect('SUM(inv.remainingAmount)', 'totalRemaining')
        .addSelect('COUNT(inv.id)', 'count')
        .getRawOne<{ totalTTC: string; totalTVA: string; totalPaid: string; totalRemaining: string; count: string }>();

      const [rows, total] = await this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.date >= :from AND inv.date <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .andWhere('inv.direction = :dir', { dir: DocumentDirection.ACHAT })
        .andWhere('inv.isValidated = true')
        .select(['inv.id', 'inv.documentNumber', 'inv.date', 'inv.supplierName', 'inv.subtotal', 'inv.tax', 'inv.total', 'inv.paidAmount', 'inv.remainingAmount', 'inv.status'])
        .orderBy('inv.date', 'DESC')
        .skip((page - 1) * perPage)
        .take(perPage)
        .getManyAndCount();

      return {
        kpis: {
          totalTTC: Number(kpiRaw?.totalTTC ?? 0),
          totalTVA: Number(kpiRaw?.totalTVA ?? 0),
          totalPaid: Number(kpiRaw?.totalPaid ?? 0),
          totalRemaining: Number(kpiRaw?.totalRemaining ?? 0),
          count: Number(kpiRaw?.count ?? 0),
        },
        chart: null,
        rows: rows.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.documentNumber,
          invoiceDate: inv.date,
          supplierName: inv.supplierName,
          ht: inv.subtotal,
          tva: inv.tax,
          ttc: inv.total,
          paid: inv.paidAmount,
          remaining: inv.remainingAmount,
          status: inv.status,
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** TVA summary grouped by Moroccan tax rates */
  async getTvaSummary(filter: InvoiceReportFilterDto) {
    const key = this.cacheKey('tva-summary', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(filter.preset, filter.startDate, filter.endDate);

      // Aggregate invoice items by tax rate and direction
      const rawItems = await this.invoiceItemRepo
        .createQueryBuilder('item')
        .innerJoin('item.invoice', 'inv')
        .where('inv.date >= :from AND inv.date <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .andWhere('inv.isValidated = true')
        .select('item.tax', 'taxRate')
        .addSelect('inv.direction', 'direction')
        .addSelect('SUM(item.total)', 'totalHT')
        .addSelect('SUM(item.total * item.tax / 100)', 'totalTVA')
        .groupBy('item.tax')
        .addGroupBy('inv.direction')
        .orderBy('item.tax', 'DESC')
        .getRawMany<{ taxRate: string; direction: string; totalHT: string; totalTVA: string }>();

      // Pivot: one row per rate, columns for VENTE and ACHAT
      const pivot = TVA_RATES.map((rate) => {
        const vente = rawItems.find((r) => Number(r.taxRate) === rate && r.direction === DocumentDirection.VENTE);
        const achat = rawItems.find((r) => Number(r.taxRate) === rate && r.direction === DocumentDirection.ACHAT);
        return {
          tvaRate: rate,
          baseHt: Number(vente?.totalHT ?? 0),
          tvaCollected: Number(vente?.totalTVA ?? 0),
          achatHT: Number(achat?.totalHT ?? 0),
          tvaDeductible: Number(achat?.totalTVA ?? 0),
          tvaDue: Number(vente?.totalTVA ?? 0) - Number(achat?.totalTVA ?? 0),
        };
      });

      const totalVenteTVA = pivot.reduce((s, r) => s + r.tvaCollected, 0);
      const totalAchatTVA = pivot.reduce((s, r) => s + r.tvaDeductible, 0);

      return {
        kpis: {
          totalVenteTVA,
          totalAchatTVA,
          tvaAVerser: totalVenteTVA - totalAchatTVA,
        },
        chart: {
          type: 'bar',
          labels: TVA_RATES.map((r) => `TVA ${r}%`),
          series: [
            { name: 'TVA Collectée (Ventes)', data: pivot.map((r) => r.tvaCollected) },
            { name: 'TVA Déductible (Achats)', data: pivot.map((r) => r.tvaDeductible) },
          ],
        },
        rows: pivot,
        meta: null,
      };
    });
  }

  /** Outstanding invoices (impayés) */
  async getOutstanding(filter: ReportFilterDto) {
    const key = this.cacheKey('outstanding', filter);
    return this.withCache(key, async () => {
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const [rows, total] = await this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.remainingAmount > 0')
        .andWhere('inv.isValidated = true')
        .andWhere('inv.status IN (:...statuses)', { statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] })
        .select(['inv.id', 'inv.documentNumber', 'inv.date', 'inv.dueDate', 'inv.direction', 'inv.customerName', 'inv.supplierName', 'inv.total', 'inv.paidAmount', 'inv.remainingAmount', 'inv.status'])
        .orderBy('inv.dueDate', 'ASC')
        .skip((page - 1) * perPage)
        .take(perPage)
        .getManyAndCount();

      const kpiRaw = await this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.remainingAmount > 0')
        .andWhere('inv.isValidated = true')
        .andWhere('inv.status IN (:...statuses)', { statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] })
        .select('SUM(inv.remainingAmount)', 'totalRemaining')
        .addSelect('COUNT(inv.id)', 'count')
        .getRawOne<{ totalRemaining: string; count: string }>();

      const today = new Date();
      const overdueCount = rows.filter((inv) => inv.dueDate && new Date(inv.dueDate) < today).length;

      return {
        kpis: {
          totalRemaining: Number(kpiRaw?.totalRemaining ?? 0),
          count: Number(kpiRaw?.count ?? 0),
          overdueCount,
        },
        chart: null,
        rows: rows.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.documentNumber,
          date: inv.date,
          dueDate: inv.dueDate,
          direction: inv.direction,
          partnerName: inv.direction === DocumentDirection.VENTE ? inv.customerName : inv.supplierName,
          total: inv.total,
          paid: inv.paidAmount,
          amountDue: inv.remainingAmount,
          status: inv.status,
          isOverdue: inv.dueDate ? new Date(inv.dueDate) < today : false,
          daysOverdue: inv.dueDate && new Date(inv.dueDate) < today ? Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / 86400000) : 0,
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Aging balance — groups outstanding invoices into 4 buckets per partner */
  async getAgingBalance(filter: AgingReportFilterDto) {
    const key = this.cacheKey('aging', filter);
    return this.withCache(key, async () => {
      const asOf = filter.asOfDate ? new Date(filter.asOfDate) : new Date();
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const raw = await this.invoiceRepo
        .createQueryBuilder('inv')
        .where('inv.remainingAmount > 0')
        .andWhere('inv.isValidated = true')
        .andWhere('inv.status IN (:...statuses)', { statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] })
        .select(['inv.id', 'inv.documentNumber', 'inv.date', 'inv.dueDate', 'inv.direction', 'inv.customerId', 'inv.customerName', 'inv.supplierId', 'inv.supplierName', 'inv.remainingAmount'])
        .getMany();

      // Group by partner
      const partnerMap = new Map<string, {
        partnerId: number | null; partnerName: string; direction: string;
        current: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number; total: number;
      }>();

      for (const inv of raw) {
        const isVente = inv.direction === DocumentDirection.VENTE;
        const partnerId = isVente ? inv.customerId : inv.supplierId;
        const partnerName = isVente ? (inv.customerName ?? '-') : (inv.supplierName ?? '-');
        const mapKey = `${inv.direction}:${partnerId ?? partnerName}`;
        if (!partnerMap.has(mapKey)) {
          partnerMap.set(mapKey, { partnerId, partnerName, direction: inv.direction, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 });
        }
        const entry = partnerMap.get(mapKey)!;
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

      const allRows = Array.from(partnerMap.values()).sort((a, b) => b.total - a.total);
      const total = allRows.length;
      const rows = allRows.slice((page - 1) * perPage, page * perPage);

      return {
        kpis: {
          totalRemaining: allRows.reduce((s, r) => s + r.total, 0),
          partners: total,
          over90: allRows.reduce((s, r) => s + r.d90plus, 0),
        },
        chart: {
          type: 'bar',
          labels: ['À l\'échéance', '1-30 jours', '31-60 jours', '61-90 jours', '+90 jours'],
          series: [{
            name: 'Solde (MAD)',
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
          partnerId: r.partnerId,
          partnerName: r.partnerName,
          direction: r.direction,
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

  async getJournalVenteXlsx(filter: InvoiceReportFilterDto): Promise<Buffer> {
    const data = await this.getJournalVente({ ...filter, page: 1, perPage: 10_000 });
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.rows.map((r) => ({
      'Numéro': r.invoiceNumber, 'Date': r.invoiceDate, 'Client': r.customerName,
      'HT (MAD)': r.ht, 'TVA (MAD)': r.tva, 'TTC (MAD)': r.ttc,
      'Payé (MAD)': r.paid, 'Reste (MAD)': r.remaining, 'Statut': r.status,
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Journal Ventes');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async getTvaSummaryXlsx(filter: InvoiceReportFilterDto): Promise<Buffer> {
    const data = await this.getTvaSummary(filter);
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.rows.map((r) => ({
      'Taux TVA (%)': r.tvaRate,
      'Ventes HT (MAD)': r.baseHt,
      'TVA Collectée (MAD)': r.tvaCollected,
      'Achats HT (MAD)': r.achatHT,
      'TVA Déductible (MAD)': r.tvaDeductible,
      'TVA Nette (MAD)': r.tvaDue,
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Récap TVA');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
