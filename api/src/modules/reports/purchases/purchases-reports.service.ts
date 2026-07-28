import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { resolveDateRange, toSqlDate } from '../shared/date-range.util';
import { SalesReportFilterDto } from '../dto/report-filter.dto';

const TTL = 300_000;

@Injectable()
export class PurchasesReportsService {
  private readonly logger = new Logger(PurchasesReportsService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private get orderRepo() {
    return this.tenantConnService.getRepository(Order);
  }

  private cacheKey(suffix: string, filter: SalesReportFilterDto): string {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    return `tenant:${slug}:reports:purchases:${suffix}:${JSON.stringify(filter)}`;
  }

  private async withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;
    const value = await fn();
    await this.cache.set(key, value, TTL);
    return value;
  }

  /** Purchases by period */
  async getPurchasesByPeriod(filter: SalesReportFilterDto) {
    const key = this.cacheKey('by-period', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const baseQb = this.orderRepo
        .createQueryBuilder('o')
        .where('o.date >= :from AND o.date <= :to', {
          from: toSqlDate(from),
          to: toSqlDate(to),
        })
        .andWhere('o.status NOT IN (:...cancelled)', {
          cancelled: [OrderStatus.CANCELLED],
        })
        .andWhere('o.supplierId IS NOT NULL'); // purchase orders only

      const kpiRaw = await baseQb
        .select('SUM(o.total)', 'totalPurchases')
        .addSelect('COUNT(o.id)', 'totalOrders')
        .addSelect('AVG(o.total)', 'avgOrder')
        .getRawOne<{
          totalPurchases: string;
          totalOrders: string;
          avgOrder: string;
        }>();

      const dailyRaw = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.date >= :from AND o.date <= :to', {
          from: toSqlDate(from),
          to: toSqlDate(to),
        })
        .andWhere('o.status NOT IN (:...cancelled)', {
          cancelled: [OrderStatus.CANCELLED],
        })
        .andWhere('o.supplierId IS NOT NULL')
        .select('o.date', 'day')
        .addSelect('SUM(o.total)', 'total')
        .addSelect('COUNT(o.id)', 'orders')
        .groupBy('o.date')
        .orderBy('o.date', 'ASC')
        .getRawMany<{ day: string; total: string; orders: string }>();

      const [rows, total] = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.date >= :from AND o.date <= :to', {
          from: toSqlDate(from),
          to: toSqlDate(to),
        })
        .andWhere('o.status NOT IN (:...cancelled)', {
          cancelled: [OrderStatus.CANCELLED],
        })
        .andWhere('o.supplierId IS NOT NULL')
        .select([
          'o.id',
          'o.documentNumber',
          'o.date',
          'o.total',
          'o.supplierName',
          'o.status',
        ])
        .orderBy('o.date', 'DESC')
        .skip((page - 1) * perPage)
        .take(perPage)
        .getManyAndCount();

      return {
        kpis: {
          totalPurchases: Number(kpiRaw?.totalPurchases ?? 0),
          totalOrders: Number(kpiRaw?.totalOrders ?? 0),
          avgOrder: Number(kpiRaw?.avgOrder ?? 0),
        },
        chart: {
          type: 'line',
          labels: dailyRaw.map((r) => r.day),
          series: [
            {
              name: 'Achats (MAD)',
              data: dailyRaw.map((r) => Number(r.total)),
            },
          ],
        },
        rows: rows.map((o) => ({
          id: o.id,
          reference: o.documentNumber,
          date: o.date,
          supplier: o.supplierName,
          total: o.total,
          status: o.status,
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Top suppliers */
  async getTopSuppliers(filter: SalesReportFilterDto) {
    const key = this.cacheKey('top-suppliers', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const allRows = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.date >= :from AND o.date <= :to', {
          from: toSqlDate(from),
          to: toSqlDate(to),
        })
        .andWhere('o.status NOT IN (:...cancelled)', {
          cancelled: [OrderStatus.CANCELLED],
        })
        .andWhere('o.supplierId IS NOT NULL')
        .select('o.supplierId', 'supplierId')
        .addSelect('o.supplierName', 'supplierName')
        .addSelect('COUNT(o.id)', 'orderCount')
        .addSelect('SUM(o.total)', 'totalPurchases')
        .groupBy('o.supplierId')
        .addGroupBy('o.supplierName')
        .orderBy('SUM(o.total)', 'DESC')
        .getRawMany<{
          supplierId: number;
          supplierName: string;
          orderCount: string;
          totalPurchases: string;
        }>();

      const total = allRows.length;
      const rows = allRows.slice((page - 1) * perPage, page * perPage);
      const top10 = allRows.slice(0, 10);

      return {
        kpis: {
          uniqueSuppliers: total,
          totalPurchases: allRows.reduce(
            (s, r) => s + Number(r.totalPurchases),
            0,
          ),
          topSupplier: allRows[0]?.supplierName ?? '-',
        },
        chart: {
          type: 'bar',
          labels: top10.map((r) => r.supplierName ?? `#${r.supplierId}`),
          series: [
            {
              name: 'Achats (MAD)',
              data: top10.map((r) => Number(r.totalPurchases)),
            },
          ],
        },
        rows: rows.map((r) => ({
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          orderCount: Number(r.orderCount),
          totalPurchases: Number(r.totalPurchases),
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Purchases by product */
  async getPurchasesByProduct(filter: SalesReportFilterDto) {
    const key = this.cacheKey('by-product', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const allRows = await this.orderRepo
        .createQueryBuilder('o')
        .innerJoin('o.items', 'item')
        .leftJoin('item.product', 'p')
        .where('o.date >= :from AND o.date <= :to', {
          from: toSqlDate(from),
          to: toSqlDate(to),
        })
        .andWhere('o.status NOT IN (:...cancelled)', {
          cancelled: [OrderStatus.CANCELLED],
        })
        .andWhere('o.supplierId IS NOT NULL')
        .select('item.productId', 'productId')
        .addSelect('p.name', 'productName')
        .addSelect('p.code', 'productCode')
        .addSelect('SUM(item.quantity)', 'totalQty')
        .addSelect('SUM(item.total)', 'totalCost')
        .groupBy('item.productId')
        .addGroupBy('p.name')
        .addGroupBy('p.code')
        .orderBy('SUM(item.total)', 'DESC')
        .getRawMany<{
          productId: number;
          productName: string;
          productCode: string;
          totalQty: string;
          totalCost: string;
        }>();

      const total = allRows.length;
      const rows = allRows.slice((page - 1) * perPage, page * perPage);
      const top10 = allRows.slice(0, 10);

      return {
        kpis: {
          uniqueProducts: total,
          totalCost: allRows.reduce((s, r) => s + Number(r.totalCost), 0),
          topProduct: allRows[0]?.productName ?? '-',
        },
        chart: {
          type: 'bar',
          labels: top10.map((r) => r.productName ?? `#${r.productId}`),
          series: [
            { name: 'Coût (MAD)', data: top10.map((r) => Number(r.totalCost)) },
          ],
        },
        rows: rows.map((r) => ({
          productId: r.productId,
          productName: r.productName,
          productCode: r.productCode,
          totalQty: Number(r.totalQty),
          totalCost: Number(r.totalCost),
        })),
        meta: { total, page, perPage },
      };
    });
  }

  async getPurchasesXlsx(filter: SalesReportFilterDto): Promise<Buffer> {
    const data = await this.getPurchasesByPeriod({
      ...filter,
      page: 1,
      perPage: 10_000,
    });
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      data.rows.map((r) => ({
        Référence: r.reference,
        Date: r.date,
        Fournisseur: r.supplier,
        'Montant (MAD)': r.total,
        Statut: r.status,
      })),
    );
    ws['!cols'] = [
      { wch: 20 },
      { wch: 14 },
      { wch: 30 },
      { wch: 16 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Achats');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
