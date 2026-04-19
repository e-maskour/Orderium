import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import {
  Order,
  OrderStatus,
  OrderOriginType,
} from '../../orders/entities/order.entity';
import { resolveDateRange, toSqlDate } from '../shared/date-range.util';
import { SalesReportFilterDto } from '../dto/report-filter.dto';

const TTL = 300_000; // 5 min

@Injectable()
export class SalesReportsService {
  private readonly logger = new Logger(SalesReportsService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private get orderRepo() {
    return this.tenantConnService.getRepository(Order);
  }

  private cacheKey(suffix: string, filter: SalesReportFilterDto): string {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    return `tenant:${slug}:reports:sales:${suffix}:${JSON.stringify(filter)}`;
  }

  private async withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;
    const value = await fn();
    await this.cache.set(key, value, TTL);
    return value;
  }

  /** Revenue by period — daily buckets within the date range */
  async getRevenueReport(filter: SalesReportFilterDto) {
    const key = this.cacheKey('revenue', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );
      const params: Record<string, unknown> = {
        from: toSqlDate(from),
        to: toSqlDate(to),
        cancelled: [OrderStatus.CANCELLED],
      };
      const baseWhere =
        'o.date >= :from AND o.date <= :to AND o.status NOT IN (:...cancelled) AND o.customerId IS NOT NULL';
      const originFilter = filter.originType
        ? 'AND o.originType = :originType'
        : '';
      if (filter.originType) params.originType = filter.originType;

      // KPIs — separate QB
      const kpiRaw = await this.orderRepo
        .createQueryBuilder('o')
        .where(`${baseWhere} ${originFilter}`, params)
        .select('SUM(o.total)', 'totalRevenue')
        .addSelect('COUNT(o.id)', 'totalOrders')
        .addSelect('AVG(o.total)', 'avgOrder')
        .getRawOne<{
          totalRevenue: string;
          totalOrders: string;
          avgOrder: string;
        }>();

      // Time series (daily) — separate QB
      const dailyRaw = await this.orderRepo
        .createQueryBuilder('o')
        .where(`${baseWhere} ${originFilter}`, params)
        .select('o.date', 'day')
        .addSelect('SUM(o.total)', 'revenue')
        .addSelect('COUNT(o.id)', 'orders')
        .groupBy('o.date')
        .orderBy('o.date', 'ASC')
        .getRawMany<{ day: string; revenue: string; orders: string }>();

      // Table rows (paginated) — separate QB, uses getManyAndCount (no GROUP BY)
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;
      const [rows, total] = await this.orderRepo
        .createQueryBuilder('o')
        .where(`${baseWhere} ${originFilter}`, params)
        .select([
          'o.id',
          'o.documentNumber',
          'o.orderNumber',
          'o.date',
          'o.total',
          'o.customerName',
          'o.status',
          'o.originType',
        ])
        .orderBy('o.date', 'DESC')
        .skip((page - 1) * perPage)
        .take(perPage)
        .getManyAndCount();

      return {
        kpis: {
          totalRevenue: Number(kpiRaw?.totalRevenue ?? 0),
          totalOrders: Number(kpiRaw?.totalOrders ?? 0),
          avgOrder: Number(kpiRaw?.avgOrder ?? 0),
        },
        chart: {
          type: 'line',
          labels: dailyRaw.map((r) => r.day),
          series: [
            {
              name: "Chiffre d'affaires (MAD)",
              data: dailyRaw.map((r) => Number(r.revenue)),
            },
            { name: 'Commandes', data: dailyRaw.map((r) => Number(r.orders)) },
          ],
        },
        rows: rows.map((o) => ({
          id: o.id,
          reference: o.documentNumber ?? o.orderNumber,
          date: o.date,
          customer: o.customerName,
          total: o.total,
          status: o.status,
          channel: o.originType,
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Top products by sales volume and revenue */
  async getTopProducts(filter: SalesReportFilterDto) {
    const key = this.cacheKey('top-products', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const qb = this.orderRepo
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
        .andWhere('o.customerId IS NOT NULL')
        .select('item.productId', 'productId')
        .addSelect('p.name', 'productName')
        .addSelect('p.code', 'productCode')
        .addSelect('SUM(item.quantity)', 'totalQty')
        .addSelect('SUM(item.total)', 'totalRevenue')
        .addSelect('COUNT(DISTINCT o.id)', 'orderCount')
        .groupBy('item.productId')
        .addGroupBy('p.name')
        .addGroupBy('p.code');

      if (filter.categoryId) {
        qb.innerJoin('p.categories', 'cat').andWhere('cat.id = :catId', {
          catId: filter.categoryId,
        });
      }

      const allRows = await qb.orderBy('SUM(item.total)', 'DESC').getRawMany<{
        productId: number;
        productName: string;
        productCode: string;
        totalQty: string;
        totalRevenue: string;
        orderCount: string;
      }>();

      const total = allRows.length;
      const rows = allRows.slice((page - 1) * perPage, page * perPage);

      const topRevenue = rows.slice(0, 10);

      return {
        kpis: {
          uniqueProducts: total,
          topProduct: rows[0]?.productName ?? '-',
          topRevenue: Number(rows[0]?.totalRevenue ?? 0),
        },
        chart: {
          type: 'bar',
          labels: topRevenue.map((r) => r.productName ?? `#${r.productId}`),
          series: [
            {
              name: 'CA (MAD)',
              data: topRevenue.map((r) => Number(r.totalRevenue)),
            },
            {
              name: 'Quantité',
              data: topRevenue.map((r) => Number(r.totalQty)),
            },
          ],
        },
        rows: rows.map((r) => ({
          productId: r.productId,
          productName: r.productName,
          productCode: r.productCode,
          totalQty: Number(r.totalQty),
          totalRevenue: Number(r.totalRevenue),
          orderCount: Number(r.orderCount),
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Sales by customer */
  async getSalesByCustomer(filter: SalesReportFilterDto) {
    const key = this.cacheKey('by-customer', filter);
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
        .andWhere('o.customerId IS NOT NULL')
        .select('o.customerId', 'customerId')
        .addSelect('o.customerName', 'customerName')
        .addSelect('COUNT(o.id)', 'orderCount')
        .addSelect('SUM(o.total)', 'totalRevenue')
        .addSelect('AVG(o.total)', 'avgOrder')
        .groupBy('o.customerId')
        .addGroupBy('o.customerName')
        .orderBy('SUM(o.total)', 'DESC')
        .getRawMany<{
          customerId: number;
          customerName: string;
          orderCount: string;
          totalRevenue: string;
          avgOrder: string;
        }>();

      const total = allRows.length;
      const rows = allRows.slice((page - 1) * perPage, page * perPage);
      const top10 = allRows.slice(0, 10);

      return {
        kpis: {
          uniqueCustomers: total,
          totalRevenue: allRows.reduce((s, r) => s + Number(r.totalRevenue), 0),
          topCustomer: allRows[0]?.customerName ?? '-',
        },
        chart: {
          type: 'bar',
          labels: top10.map((r) => r.customerName ?? `#${r.customerId}`),
          series: [
            {
              name: 'CA (MAD)',
              data: top10.map((r) => Number(r.totalRevenue)),
            },
          ],
        },
        rows: rows.map((r) => ({
          customerId: r.customerId,
          customerName: r.customerName,
          orderCount: Number(r.orderCount),
          totalRevenue: Number(r.totalRevenue),
          avgOrder: Number(r.avgOrder),
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Sales by category */
  async getSalesByCategory(filter: SalesReportFilterDto) {
    const key = this.cacheKey('by-category', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const qb = this.orderRepo
        .createQueryBuilder('o')
        .innerJoin('o.items', 'item')
        .leftJoin('item.product', 'p')
        .leftJoin('p.categories', 'cat')
        .where('o.date >= :from AND o.date <= :to', {
          from: toSqlDate(from),
          to: toSqlDate(to),
        })
        .andWhere('o.status NOT IN (:...cancelled)', {
          cancelled: [OrderStatus.CANCELLED],
        })
        .andWhere('o.customerId IS NOT NULL')
        .select('cat.id', 'categoryId')
        .addSelect('cat.name', 'categoryName')
        .addSelect('SUM(item.total)', 'totalRevenue')
        .addSelect('SUM(item.quantity)', 'totalQty')
        .addSelect('COUNT(DISTINCT o.id)', 'orderCount')
        .groupBy('cat.id')
        .addGroupBy('cat.name')
        .orderBy('SUM(item.total)', 'DESC');

      const allRows = await qb.getRawMany<{
        categoryId: number;
        categoryName: string;
        totalRevenue: string;
        totalQty: string;
        orderCount: string;
      }>();

      const total = allRows.length;
      const rows = allRows.slice((page - 1) * perPage, page * perPage);

      return {
        kpis: {
          uniqueCategories: total,
          totalRevenue: allRows.reduce((s, r) => s + Number(r.totalRevenue), 0),
          topCategory: allRows[0]?.categoryName ?? '-',
        },
        chart: {
          type: 'pie',
          labels: allRows
            .slice(0, 8)
            .map((r) => r.categoryName ?? 'Sans catégorie'),
          series: allRows.slice(0, 8).map((r) => Number(r.totalRevenue)),
        },
        rows: rows.map((r) => ({
          categoryId: r.categoryId,
          categoryName: r.categoryName ?? 'Sans catégorie',
          totalRevenue: Number(r.totalRevenue),
          totalQty: Number(r.totalQty),
          orderCount: Number(r.orderCount),
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Sales by POS channel / origin */
  async getSalesByPos(filter: SalesReportFilterDto) {
    const key = this.cacheKey('by-pos', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(
        filter.preset,
        filter.startDate,
        filter.endDate,
      );
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const raw = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.date >= :from AND o.date <= :to', {
          from: toSqlDate(from),
          to: toSqlDate(to),
        })
        .andWhere('o.status NOT IN (:...cancelled)', {
          cancelled: [OrderStatus.CANCELLED],
        })
        .andWhere('o.customerId IS NOT NULL')
        .select('o.originType', 'channel')
        .addSelect('COUNT(o.id)', 'orderCount')
        .addSelect('SUM(o.total)', 'totalRevenue')
        .groupBy('o.originType')
        .orderBy('SUM(o.total)', 'DESC')
        .getRawMany<{
          channel: string;
          orderCount: string;
          totalRevenue: string;
        }>();

      // Daily breakdown per channel (last 30 days)
      const daily = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.date >= :from AND o.date <= :to', {
          from: toSqlDate(from),
          to: toSqlDate(to),
        })
        .andWhere('o.status NOT IN (:...cancelled)', {
          cancelled: [OrderStatus.CANCELLED],
        })
        .andWhere('o.customerId IS NOT NULL')
        .select('o.date', 'day')
        .addSelect('o.originType', 'channel')
        .addSelect('SUM(o.total)', 'revenue')
        .groupBy('o.date')
        .addGroupBy('o.originType')
        .orderBy('o.date', 'ASC')
        .getRawMany<{ day: string; channel: string; revenue: string }>();

      const channels = [
        OrderOriginType.BACKOFFICE,
        OrderOriginType.CLIENT_POS,
        OrderOriginType.ADMIN_POS,
      ];
      const days = [...new Set(daily.map((d) => d.day))].sort();
      const series = channels.map((ch) => ({
        name: ch,
        data: days.map((day) => {
          const match = daily.find(
            (d) => d.day === day && (d.channel as OrderOriginType) === ch,
          );
          return Number(match?.revenue ?? 0);
        }),
      }));

      const total = raw.length;
      const rows = raw.slice((page - 1) * perPage, page * perPage);

      return {
        kpis: {
          totalRevenue: raw.reduce((s, r) => s + Number(r.totalRevenue), 0),
          totalOrders: raw.reduce((s, r) => s + Number(r.orderCount), 0),
          channels: raw.length,
        },
        chart: { type: 'bar', labels: days, series },
        rows: rows.map((r) => ({
          channel: r.channel,
          orderCount: Number(r.orderCount),
          totalRevenue: Number(r.totalRevenue),
        })),
        meta: { total, page, perPage },
      };
    });
  }

  /** Get XLSX buffer for revenue report */
  async getRevenueXlsx(filter: SalesReportFilterDto): Promise<Buffer> {
    const data = await this.getRevenueReport({
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
        Client: r.customer,
        'Montant (MAD)': r.total,
        Statut: r.status,
        Canal: r.channel,
      })),
    );
    ws['!cols'] = [
      { wch: 20 },
      { wch: 14 },
      { wch: 30 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'CA Ventes');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
