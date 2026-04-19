import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { TenantConnectionService } from '../../tenant/tenant-connection.service';
import { Product } from '../../products/entities/product.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order.entity';
import { resolveDateRange, toSqlDate } from '../shared/date-range.util';
import { ReportFilterDto } from '../dto/report-filter.dto';

const TTL = 300_000;

@Injectable()
export class ProductReportsService {
  private readonly logger = new Logger(ProductReportsService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) { }

  private get productRepo() { return this.tenantConnService.getRepository(Product); }
  private get orderRepo() { return this.tenantConnService.getRepository(Order); }
  private get orderItemRepo() { return this.tenantConnService.getRepository(OrderItem); }

  private cacheKey(suffix: string, filter: object): string {
    const slug = this.tenantConnService.getCurrentTenantSlug();
    return `tenant:${slug}:reports:products:${suffix}:${JSON.stringify(filter)}`;
  }

  private async withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;
    const value = await fn();
    await this.cache.set(key, value, TTL);
    return value;
  }

  /** Product performance — revenue and qty sold from sales order items */
  async getProductPerformance(filter: ReportFilterDto) {
    const key = this.cacheKey('performance', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(filter.preset, filter.startDate, filter.endDate);
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const allRaw = await this.orderItemRepo
        .createQueryBuilder('item')
        .innerJoin('item.order', 'o')
        .innerJoin('item.product', 'p')
        .where('o.date >= :from AND o.date <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .andWhere('o.status NOT IN (:...cancelled)', { cancelled: [OrderStatus.CANCELLED] })
        .andWhere('o.customerId IS NOT NULL')
        .andWhere('item.productId IS NOT NULL')
        .select('p.id', 'productId')
        .addSelect('p.name', 'productName')
        .addSelect('p.code', 'productCode')
        .addSelect('SUM(item.quantity)', 'totalQty')
        .addSelect('SUM(item.total)', 'totalRevenue')
        .addSelect('COUNT(DISTINCT o.id)', 'orderCount')
        .groupBy('p.id')
        .addGroupBy('p.name')
        .addGroupBy('p.code')
        .orderBy('SUM(item.total)', 'DESC')
        .getRawMany<{ productId: number; productName: string; productCode: string; totalQty: string; totalRevenue: string; orderCount: string }>();

      const total = allRaw.length;
      const grandRevenue = allRaw.reduce((s, r) => s + Number(r.totalRevenue), 0);
      const rows = allRaw.slice((page - 1) * perPage, page * perPage).map((r) => ({
        productId: r.productId,
        productName: r.productName,
        productCode: r.productCode,
        totalQty: Number(r.totalQty),
        totalRevenue: Number(r.totalRevenue),
        orderCount: Number(r.orderCount),
        revenueShare: grandRevenue > 0 ? Math.round((Number(r.totalRevenue) / grandRevenue) * 100) : 0,
      }));

      const top10 = allRaw.slice(0, 10);

      return {
        kpis: {
          productsWithSales: total,
          totalRevenue: grandRevenue,
          topProduct: allRaw[0]?.productName ?? '-',
        },
        chart: {
          type: 'bar',
          labels: top10.map((r) => r.productName),
          series: [{ name: 'CA (MAD)', data: top10.map((r) => Number(r.totalRevenue)) }],
        },
        rows,
        meta: { total, page, perPage },
      };
    });
  }

  /** Margin analysis — (revenue - cost) per product */
  async getMarginAnalysis(filter: ReportFilterDto) {
    const key = this.cacheKey('margin', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(filter.preset, filter.startDate, filter.endDate);
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const allRaw = await this.orderItemRepo
        .createQueryBuilder('item')
        .innerJoin('item.order', 'o')
        .innerJoin('item.product', 'p')
        .where('o.date >= :from AND o.date <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .andWhere('o.status NOT IN (:...cancelled)', { cancelled: [OrderStatus.CANCELLED] })
        .andWhere('o.customerId IS NOT NULL')
        .andWhere('item.productId IS NOT NULL')
        .select('p.id', 'productId')
        .addSelect('p.name', 'productName')
        .addSelect('p.code', 'productCode')
        .addSelect('p.cost', 'cost')
        .addSelect('SUM(item.quantity)', 'totalQty')
        .addSelect('SUM(item.total)', 'totalRevenue')
        .addSelect('SUM(item.quantity * p.cost)', 'totalCost')
        .groupBy('p.id')
        .addGroupBy('p.name')
        .addGroupBy('p.code')
        .addGroupBy('p.cost')
        .orderBy('SUM(item.total) - SUM(item.quantity * p.cost)', 'DESC')
        .getRawMany<{ productId: number; productName: string; productCode: string; cost: string; totalQty: string; totalRevenue: string; totalCost: string }>();

      const total = allRaw.length;
      const rows = allRaw.slice((page - 1) * perPage, page * perPage).map((r) => {
        const revenue = Number(r.totalRevenue);
        const costTotal = Number(r.totalCost);
        const margin = revenue - costTotal;
        return {
          productId: r.productId,
          productName: r.productName,
          productCode: r.productCode,
          totalQty: Number(r.totalQty),
          totalRevenue: revenue,
          totalCost: costTotal,
          grossMargin: margin,
          marginPct: revenue > 0 ? Math.round((margin / revenue) * 100) : 0,
        };
      });

      return {
        kpis: {
          productsAnalysed: total,
          totalMargin: allRaw.reduce((s, r) => s + (Number(r.totalRevenue) - Number(r.totalCost)), 0),
          avgMarginRate: total > 0 ? Math.round(rows.reduce((s, r) => s + r.marginPct, 0) / total) : 0,
        },
        chart: {
          type: 'bar',
          labels: allRaw.slice(0, 10).map((r) => r.productName),
          series: [{ name: 'Marge (MAD)', data: allRaw.slice(0, 10).map((r) => Number(r.totalRevenue) - Number(r.totalCost)) }],
        },
        rows,
        meta: { total, page, perPage },
      };
    });
  }

  /** Products never sold in the given period */
  async getNeverSoldProducts(filter: ReportFilterDto) {
    const key = this.cacheKey('never-sold', filter);
    return this.withCache(key, async () => {
      const { from, to } = resolveDateRange(filter.preset, filter.startDate, filter.endDate);
      const page = filter.page ?? 1;
      const perPage = filter.perPage ?? 50;

      const soldIds = await this.orderItemRepo
        .createQueryBuilder('item')
        .innerJoin('item.order', 'o')
        .where('o.date >= :from AND o.date <= :to', { from: toSqlDate(from), to: toSqlDate(to) })
        .andWhere('o.status NOT IN (:...cancelled)', { cancelled: [OrderStatus.CANCELLED] })
        .andWhere('o.customerId IS NOT NULL')
        .andWhere('item.productId IS NOT NULL')
        .select('DISTINCT item.productId', 'productId')
        .getRawMany<{ productId: number }>();

      const soldSet = new Set(soldIds.map((r) => r.productId));

      const qb = this.productRepo
        .createQueryBuilder('p')
        .where('p.isEnabled = true')
        .andWhere('p.isService = false');

      const allProducts = await qb.select(['p.id', 'p.name', 'p.code', 'p.price', 'p.cost', 'p.stock']).getMany();
      const neverSold = allProducts.filter((p) => !soldSet.has(p.id));

      const total = neverSold.length;
      const rows = neverSold.slice((page - 1) * perPage, page * perPage);

      return {
        kpis: {
          neverSoldCount: total,
          totalProducts: allProducts.length,
          immobilisedValue: neverSold.reduce((s, p) => s + (p.stock ?? 0) * p.cost, 0),
        },
        chart: null,
        rows: rows.map((p) => ({
          productId: p.id,
          productName: p.name,
          sku: p.code,
          price: p.price,
          cost: p.cost,
          stock: p.stock ?? 0,
          stockValue: (p.stock ?? 0) * p.cost,
        })),
        meta: { total, page, perPage },
      };
    });
  }

  async getProductPerformanceXlsx(filter: ReportFilterDto): Promise<Buffer> {
    const data = await this.getProductPerformance({ ...filter, page: 1, perPage: 10_000 });
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.rows.map((r) => ({
      'Code': r.productCode, 'Produit': r.productName,
      'Qté vendue': r.totalQty, 'CA (MAD)': r.totalRevenue,
      'Part (%)': r.revenueShare, 'Commandes': r.orderCount,
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Performance Produits');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
