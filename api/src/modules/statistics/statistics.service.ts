import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  Order,
  OrderItem,
  DeliveryStatus,
  OrderStatus,
} from '../orders/entities/order.entity';
import { DocumentDirection } from '../../common/entities/base-document.entity';
import { Partner } from '../partners/entities/partner.entity';
import { DeliveryPerson } from '../delivery/entities/delivery.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { StockQuant } from '../inventory/entities/stock-quant.entity';
import {
  StockMovement,
  MovementType,
  MovementStatus,
} from '../inventory/entities/stock-movement.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

export interface OrderStatistics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalCustomers: number;
  pendingOrders: number;
  inDeliveryOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  activeDeliveryPersons: number;
}

export interface DailyStats {
  date: string;
  orders: number;
  revenue: number;
  newOrders: number;
  delivered: number;
  cancelled: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  sales: number;
  revenue: number;
}

export interface ComprehensiveStats {
  overview: OrderStatistics;
  dailyStats: DailyStats[];
  topProducts: TopProduct[];
}

export interface RecentActivity {
  type: 'order' | 'customer' | 'product' | 'revenue';
  title: string;
  description: string;
  timestamp: Date;
  value?: number;
  orderId?: number;
  customerId?: number;
  productId?: number;
}

export type DashboardPeriod = 'mtd' | 'ytd';

export interface DashboardKpi {
  value: number;
  previous: number;
  /** % change vs the previous period, null when there is no baseline */
  change: number | null;
}

export interface DashboardSeriesPoint {
  /** Bucket start date, YYYY-MM-DD */
  date: string;
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  period: DashboardPeriod;
  range: { start: string; end: string };
  kpis: {
    sales: DashboardKpi;
    revenue: DashboardKpi;
    cost: DashboardKpi;
    profit: DashboardKpi;
  };
  breakdown: {
    revenue: number;
    collected: number;
    outstanding: number;
    cost: number;
    profit: number;
    margin: number;
    salesCount: number;
  };
  salesSeries: {
    daily: DashboardSeriesPoint[];
    weekly: DashboardSeriesPoint[];
    monthly: DashboardSeriesPoint[];
  };
  inventory: { qtyInHand: number; incoming: number };
  partners: { customers: number; suppliers: number };
  stock: {
    lowStock: number;
    outOfStock: number;
    categories: number;
    products: number;
  };
  customerSeries: { month: string; new: number; returning: number }[];
  purchases: {
    count: number;
    cost: number;
    cancelledSales: number;
    returns: number;
  };
  recentSales: {
    id: number;
    documentNumber: string;
    customerName: string | null;
    date: string;
    total: number;
    paidAmount: number;
    status: string;
  }[];
  lowStockProducts: {
    id: number;
    name: string;
    code: string | null;
    imageUrl: string | null;
    stock: number;
    threshold: number;
  }[];
}

/** 5-minute TTL for all statistics cache entries */
const STATS_TTL = 300_000;

/** Local-calendar YYYY-MM-DD (matches Postgres `date` columns, which carry no timezone) */
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const pctChange = (value: number, previous: number): number | null =>
  previous === 0 ? null : ((value - previous) / Math.abs(previous)) * 100;

@Injectable()
export class StatisticsService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private get tenantSlug(): string {
    return this.tenantConnService.getCurrentTenantSlug();
  }

  private statsKey(suffix: string): string {
    return `tenant:${this.tenantSlug}:statistics:${suffix}`;
  }

  private async withCache<T>(
    key: string,
    ttl: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.cacheManager.get<T>(key);
    if (cached) return cached;
    const value = await fn();
    await this.cacheManager.set(key, value, ttl);
    return value;
  }

  async invalidateStatsCache(): Promise<void> {
    // Invalidate the most common dashboard keys (called after write operations)
    const slug = this.tenantSlug;
    const keys = [
      `tenant:${slug}:statistics:overview::`,
      `tenant:${slug}:statistics:daily:7`,
      `tenant:${slug}:statistics:daily:30`,
      `tenant:${slug}:statistics:top:5`,
      `tenant:${slug}:statistics:top:10`,
      `tenant:${slug}:statistics:comprehensive:7`,
      `tenant:${slug}:statistics:comprehensive:30`,
      `tenant:${slug}:statistics:recent:10`,
      `tenant:${slug}:statistics:dashboard:mtd:${ymd(new Date())}`,
      `tenant:${slug}:statistics:dashboard:ytd:${ymd(new Date())}`,
    ];
    await Promise.all(keys.map((k) => this.cacheManager.del(k)));
  }

  private get orderRepository(): Repository<Order> {
    return this.tenantConnService.getRepository(Order);
  }

  private get partnerRepository(): Repository<Partner> {
    return this.tenantConnService.getRepository(Partner);
  }

  private get deliveryPersonRepository(): Repository<DeliveryPerson> {
    return this.tenantConnService.getRepository(DeliveryPerson);
  }

  private get productRepository(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

  async getOrderStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<OrderStatistics> {
    return this.withCache<OrderStatistics>(
      this.statsKey(
        `overview:${startDate?.toISOString() ?? ''}:${endDate?.toISOString() ?? ''}`,
      ),
      STATS_TTL,
      async () => {
        const queryBuilder = this.orderRepository
          .createQueryBuilder('order')
          .select('COUNT(*)', 'totalOrders')
          .addSelect('SUM(order.total)', 'totalRevenue')
          .addSelect('AVG(order.total)', 'averageOrderValue');

        if (startDate) {
          queryBuilder.andWhere('order.date >= :startDate', { startDate });
        }
        if (endDate) {
          queryBuilder.andWhere('order.date <= :endDate', { endDate });
        }

        const result = await queryBuilder.getRawOne<{
          totalOrders: string;
          totalRevenue: string;
          averageOrderValue: string;
        }>();

        // Get order counts by delivery status
        const statusCounts = await this.getOrderCountsByStatus(
          startDate,
          endDate,
        );

        // Get total customers
        const totalCustomers = await this.partnerRepository.count({
          where: { isCustomer: true },
        });

        // Get active delivery persons
        const activeDeliveryPersons = await this.deliveryPersonRepository.count(
          {
            where: { isActive: true },
          },
        );

        const stats: OrderStatistics = {
          totalOrders: parseInt(result?.totalOrders || '0', 10),
          totalRevenue: parseFloat(result?.totalRevenue || '0'),
          averageOrderValue: parseFloat(result?.averageOrderValue || '0'),
          totalCustomers,
          pendingOrders: statusCounts.pending,
          inDeliveryOrders: statusCounts.inDelivery,
          deliveredOrders: statusCounts.delivered,
          cancelledOrders: statusCounts.cancelled,
          activeDeliveryPersons,
        };

        return stats;
      },
    );
  }

  async getTopProducts(limit = 5): Promise<TopProduct[]> {
    return this.withCache<TopProduct[]>(
      this.statsKey(`top:${limit}`),
      STATS_TTL,
      async () => {
        const result = await this.orderRepository
          .createQueryBuilder('order')
          .innerJoin('order.items', 'item')
          .innerJoin('item.product', 'product')
          .select('product.id', 'productId')
          .addSelect('product.name', 'productName')
          .addSelect('SUM(item.quantity)', 'sales')
          .addSelect('SUM(item.quantity * item.unitPrice)', 'revenue')
          .groupBy('product.id')
          .addGroupBy('product.name')
          .orderBy('revenue', 'DESC')
          .limit(limit)
          .getRawMany();

        const products = result.map((row) => ({
          productId: parseInt(row.productId, 10),
          productName: row.productName,
          sales: parseInt(row.sales, 10) || 0,
          revenue: parseFloat(row.revenue) || 0,
        }));

        return products;
      },
    );
  }

  async getComprehensiveStats(days = 7): Promise<ComprehensiveStats> {
    return this.withCache<ComprehensiveStats>(
      this.statsKey(`comprehensive:${days}`),
      STATS_TTL,
      async () => {
        const [overview, dailyStats, topProducts] = await Promise.all([
          this.getOrderStatistics(),
          this.getDailyStats(days),
          this.getTopProducts(5),
        ]);
        return { overview, dailyStats, topProducts };
      },
    );
  }

  private async getOrderCountsByStatus(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    pending: number;
    inDelivery: number;
    delivered: number;
    cancelled: number;
  }> {
    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    if (startDate) {
      queryBuilder.andWhere('order.date >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.date <= :endDate', { endDate });
    }

    const [pending, inDelivery, delivered, cancelled] = await Promise.all([
      queryBuilder
        .clone()
        .where('order.deliveryStatus = :status', {
          status: DeliveryStatus.PENDING,
        })
        .getCount(),
      queryBuilder
        .clone()
        .where('order.deliveryStatus IN (:...statuses)', {
          statuses: [DeliveryStatus.IN_DELIVERY, DeliveryStatus.TO_DELIVERY],
        })
        .getCount(),
      queryBuilder
        .clone()
        .where('order.deliveryStatus = :status', {
          status: DeliveryStatus.DELIVERED,
        })
        .getCount(),
      queryBuilder
        .clone()
        .where('order.deliveryStatus = :status', {
          status: DeliveryStatus.CANCELED,
        })
        .getCount(),
    ]);

    return { pending, inDelivery, delivered, cancelled };
  }

  async getDailyStats(days = 7): Promise<DailyStats[]> {
    return this.withCache<DailyStats[]>(
      this.statsKey(`daily:${days}`),
      STATS_TTL,
      async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const result = await this.orderRepository
          .createQueryBuilder('order')
          .select('DATE(order.date)', 'date')
          .addSelect('COUNT(*)', 'orders')
          .addSelect('SUM(order.total)', 'revenue')
          .addSelect(
            `SUM(CASE WHEN order.deliveryStatus = '${DeliveryStatus.PENDING}' THEN 1 ELSE 0 END)`,
            'newOrders',
          )
          .addSelect(
            `SUM(CASE WHEN order.deliveryStatus = '${DeliveryStatus.DELIVERED}' THEN 1 ELSE 0 END)`,
            'delivered',
          )
          .addSelect(
            `SUM(CASE WHEN order.deliveryStatus = '${DeliveryStatus.CANCELED}' THEN 1 ELSE 0 END)`,
            'cancelled',
          )
          .where('order.date >= :startDate', { startDate })
          .groupBy('DATE(order.date)')
          .orderBy('DATE(order.date)', 'ASC')
          .getRawMany();

        const daily = result.map((row) => ({
          date: row.date,
          orders: parseInt(row.orders, 10) || 0,
          revenue: parseFloat(row.revenue) || 0,
          newOrders: parseInt(row.newOrders, 10) || 0,
          delivered: parseInt(row.delivered, 10) || 0,
          cancelled: parseInt(row.cancelled, 10) || 0,
        }));

        return daily;
      },
    );
  }

  async getRecentActivities(limit = 10): Promise<RecentActivity[]> {
    return this.withCache<RecentActivity[]>(
      this.statsKey(`recent:${limit}`),
      120_000,
      async () => {
        const activities: RecentActivity[] = [];
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Get recent orders
        const recentOrders = await this.orderRepository
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.customer', 'customer')
          .where('order.dateCreated >= :startDate', { startDate: last24Hours })
          .orderBy('order.dateCreated', 'DESC')
          .limit(5)
          .getMany();

        for (const order of recentOrders) {
          if (order.deliveryStatus === DeliveryStatus.DELIVERED) {
            activities.push({
              type: 'order',
              title: 'Delivered',
              description: `Order #${order.documentNumber} delivered successfully`,
              timestamp: order.deliveredAt || order.dateCreated,
              value: order.total,
              orderId: order.id,
            });
          } else {
            activities.push({
              type: 'order',
              title: 'New Order Received',
              description: `Order #${order.documentNumber} from ${order.customerName || 'Customer'}`,
              timestamp: order.dateCreated,
              value: order.total,
              orderId: order.id,
            });
          }
        }

        // Get recently registered customers
        const recentCustomers = await this.partnerRepository
          .createQueryBuilder('partner')
          .where('partner.isCustomer = :isCustomer', { isCustomer: true })
          .andWhere('partner.dateCreated >= :startDate', {
            startDate: last24Hours,
          })
          .orderBy('partner.dateCreated', 'DESC')
          .limit(3)
          .getMany();

        for (const customer of recentCustomers) {
          activities.push({
            type: 'customer',
            title: 'New Customer',
            description: `${customer.name} registered`,
            timestamp: customer.dateCreated,
            customerId: customer.id,
          });
        }

        // Get low stock products (assuming there's a stock field)
        const lowStockProducts = await this.productRepository
          .createQueryBuilder('product')
          .where('product.stock <= :threshold', { threshold: 10 })
          .andWhere('product.stock > 0')
          .orderBy('product.stock', 'ASC')
          .limit(2)
          .getMany();

        for (const product of lowStockProducts) {
          activities.push({
            type: 'product',
            title: 'Low Stock',
            description: `${product.name} needs restocking (${product.stock} remaining)`,
            timestamp: new Date(
              now.getTime() - Math.random() * 3 * 60 * 60 * 1000,
            ), // Random time in last 3 hours
            productId: product.id,
          });
        }

        // Calculate daily revenue goal
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayRevenue = await this.orderRepository
          .createQueryBuilder('order')
          .select('SUM(order.total)', 'total')
          .where('order.date >= :todayStart', { todayStart })
          .getRawOne<{ total: string }>();

        const revenue = parseFloat(todayRevenue?.total || '0');
        const dailyGoal = 3000; // You can make this configurable
        const percentage = Math.min(100, (revenue / dailyGoal) * 100);

        if (percentage > 0) {
          activities.push({
            type: 'revenue',
            title: 'Daily Goal',
            description: `Reached ${percentage.toFixed(0)}% of daily revenue goal`,
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
            value: revenue,
          });
        }

        // Sort all activities by timestamp (most recent first)
        activities.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
        );
        return activities.slice(0, limit);
      },
    );
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  /**
   * Everything the backoffice dashboard renders, in one round-trip.
   * "Sales" are non-cancelled VENTE orders; cost is the product cost of the
   * lines sold (COGS), so profit = revenue − cost.
   */
  async getDashboard(period: DashboardPeriod = 'mtd'): Promise<DashboardStats> {
    const today = ymd(new Date());
    return this.withCache<DashboardStats>(
      this.statsKey(`dashboard:${period}:${today}`),
      STATS_TTL,
      async () => {
        const now = new Date();
        const start =
          period === 'ytd'
            ? new Date(now.getFullYear(), 0, 1)
            : new Date(now.getFullYear(), now.getMonth(), 1);
        const prevStart =
          period === 'ytd'
            ? new Date(now.getFullYear() - 1, 0, 1)
            : new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevEnd =
          period === 'ytd'
            ? new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
            : new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

        const [
          current,
          previous,
          salesSeries,
          inventory,
          partners,
          stock,
          customerSeries,
          purchases,
          recentSales,
          lowStockProducts,
        ] = await Promise.all([
          this.getSalesTotals(start, now),
          this.getSalesTotals(prevStart, prevEnd),
          this.getSalesSeries(now),
          this.getInventoryTotals(),
          this.getPartnerCounts(),
          this.getStockCounts(),
          this.getCustomerSeries(now),
          this.getPurchaseTotals(start, now),
          this.getRecentSales(5),
          this.getLowStockProducts(5),
        ]);

        const kpi = (value: number, prev: number): DashboardKpi => ({
          value,
          previous: prev,
          change: pctChange(value, prev),
        });
        const profit = current.revenue - current.cost;
        const prevProfit = previous.revenue - previous.cost;

        return {
          period,
          range: { start: ymd(start), end: ymd(now) },
          kpis: {
            sales: kpi(current.count, previous.count),
            revenue: kpi(current.revenue, previous.revenue),
            cost: kpi(current.cost, previous.cost),
            profit: kpi(profit, prevProfit),
          },
          breakdown: {
            revenue: current.revenue,
            collected: current.paid,
            outstanding: Math.max(0, current.revenue - current.paid),
            cost: current.cost,
            profit,
            margin: current.revenue > 0 ? (profit / current.revenue) * 100 : 0,
            salesCount: current.count,
          },
          salesSeries,
          inventory,
          partners,
          stock,
          customerSeries,
          purchases,
          recentSales,
          lowStockProducts,
        };
      },
    );
  }

  /** Base query: non-cancelled sales orders */
  private salesQuery(alias = 'order') {
    return this.orderRepository
      .createQueryBuilder(alias)
      .where(`${alias}.direction = :vente`, { vente: DocumentDirection.VENTE })
      .andWhere(`${alias}.status <> :cancelled`, {
        cancelled: OrderStatus.CANCELLED,
      });
  }

  private async getSalesTotals(
    from: Date,
    to: Date,
  ): Promise<{ count: number; revenue: number; paid: number; cost: number }> {
    const range = { from: ymd(from), to: ymd(to) };
    const [totals, cost] = await Promise.all([
      this.salesQuery()
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(order.total), 0)', 'revenue')
        .addSelect('COALESCE(SUM(order.paidAmount), 0)', 'paid')
        .andWhere('order.date BETWEEN :from AND :to', range)
        .getRawOne<{ count: string; revenue: string; paid: string }>(),
      this.tenantConnService
        .getRepository(OrderItem)
        .createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .leftJoin('item.product', 'product')
        .select(
          'COALESCE(SUM(item.quantity * COALESCE(product.cost, 0)), 0)',
          'cost',
        )
        .where('order.direction = :vente', { vente: DocumentDirection.VENTE })
        .andWhere('order.status <> :cancelled', {
          cancelled: OrderStatus.CANCELLED,
        })
        .andWhere('order.date BETWEEN :from AND :to', range)
        .getRawOne<{ cost: string }>(),
    ]);
    return {
      count: parseInt(totals?.count ?? '0', 10),
      revenue: parseFloat(totals?.revenue ?? '0'),
      paid: parseFloat(totals?.paid ?? '0'),
      cost: parseFloat(cost?.cost ?? '0'),
    };
  }

  /** Revenue per day (30d), per ISO week (12w) and per month (12m), zero-filled */
  private async getSalesSeries(
    now: Date,
  ): Promise<DashboardStats['salesSeries']> {
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 29,
    );
    const mondayOffset = (now.getDay() + 6) % 7;
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - mondayOffset - 7 * 11,
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const bucketed = async (unit: 'day' | 'week' | 'month', from: Date) => {
      const rows = await this.salesQuery()
        .select(
          `TO_CHAR(DATE_TRUNC('${unit}', order.date), 'YYYY-MM-DD')`,
          'bucket',
        )
        .addSelect('COUNT(*)', 'orders')
        .addSelect('COALESCE(SUM(order.total), 0)', 'revenue')
        .andWhere('order.date >= :from', { from: ymd(from) })
        .groupBy('bucket')
        .getRawMany<{ bucket: string; orders: string; revenue: string }>();
      return new Map(rows.map((r) => [r.bucket, r]));
    };

    const fill = (
      rows: Map<string, { orders: string; revenue: string }>,
      keys: string[],
    ): DashboardSeriesPoint[] =>
      keys.map((date) => ({
        date,
        orders: parseInt(rows.get(date)?.orders ?? '0', 10),
        revenue: parseFloat(rows.get(date)?.revenue ?? '0'),
      }));

    const range = (n: number, at: (i: number) => Date) =>
      Array.from({ length: n }, (_, i) => ymd(at(i)));

    const [daily, weekly, monthly] = await Promise.all([
      bucketed('day', dayStart),
      bucketed('week', weekStart),
      bucketed('month', monthStart),
    ]);

    return {
      daily: fill(
        daily,
        range(
          30,
          (i) =>
            new Date(
              dayStart.getFullYear(),
              dayStart.getMonth(),
              dayStart.getDate() + i,
            ),
        ),
      ),
      weekly: fill(
        weekly,
        range(
          12,
          (i) =>
            new Date(
              weekStart.getFullYear(),
              weekStart.getMonth(),
              weekStart.getDate() + 7 * i,
            ),
        ),
      ),
      monthly: fill(
        monthly,
        range(
          12,
          (i) =>
            new Date(monthStart.getFullYear(), monthStart.getMonth() + i, 1),
        ),
      ),
    };
  }

  private async getInventoryTotals(): Promise<DashboardStats['inventory']> {
    const [onHand, incoming] = await Promise.all([
      this.productRepository
        .createQueryBuilder('product')
        .select('COALESCE(SUM(product.stock), 0)', 'qty')
        .where('product.isService = false')
        .andWhere('product.stock > 0')
        .getRawOne<{ qty: string }>(),
      this.tenantConnService
        .getRepository(StockQuant)
        .createQueryBuilder('quant')
        .select('COALESCE(SUM(quant.incomingQuantity), 0)', 'qty')
        .getRawOne<{ qty: string }>(),
    ]);
    return {
      qtyInHand: parseFloat(onHand?.qty ?? '0'),
      incoming: parseFloat(incoming?.qty ?? '0'),
    };
  }

  private async getPartnerCounts(): Promise<DashboardStats['partners']> {
    const [customers, suppliers] = await Promise.all([
      this.partnerRepository.count({ where: { isCustomer: true } }),
      this.partnerRepository.count({ where: { isSupplier: true } }),
    ]);
    return { customers, suppliers };
  }

  /** Products whose stock is at or under their alert threshold (default 5) */
  private lowStockQuery() {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.isService = false')
      .andWhere('product.isEnabled = true')
      .andWhere(
        'COALESCE(product.stock, 0) <= COALESCE(product.stockAlertThreshold, 5)',
      );
  }

  private async getStockCounts(): Promise<DashboardStats['stock']> {
    const [lowStock, outOfStock, categories, products] = await Promise.all([
      this.lowStockQuery().getCount(),
      this.lowStockQuery()
        .andWhere('COALESCE(product.stock, 0) <= 0')
        .getCount(),
      this.tenantConnService.getRepository(Category).count(),
      this.productRepository.count({
        where: { isService: false, isEnabled: true },
      }),
    ]);
    return { lowStock, outOfStock, categories, products };
  }

  /** Per month (12m): customers buying for the first time vs returning buyers */
  private async getCustomerSeries(
    now: Date,
  ): Promise<DashboardStats['customerSeries']> {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const rows: { month: string; new: string; returning: string }[] =
      await this.orderRepository.query(
        `WITH sales AS (
           SELECT "customerId", "date" FROM "orders"
           WHERE "direction" = $1 AND "status" <> $2 AND "customerId" IS NOT NULL
         ),
         firsts AS (
           SELECT "customerId", DATE_TRUNC('month', MIN("date")) AS first_month
           FROM sales GROUP BY "customerId"
         ),
         active AS (
           SELECT DISTINCT "customerId", DATE_TRUNC('month', "date") AS month
           FROM sales WHERE "date" >= $3
         )
         SELECT TO_CHAR(a.month, 'YYYY-MM-DD') AS month,
                SUM(CASE WHEN f.first_month = a.month THEN 1 ELSE 0 END) AS new,
                SUM(CASE WHEN f.first_month < a.month THEN 1 ELSE 0 END) AS returning
         FROM active a JOIN firsts f ON f."customerId" = a."customerId"
         GROUP BY a.month`,
        [DocumentDirection.VENTE, OrderStatus.CANCELLED, ymd(monthStart)],
      );
    const byMonth = new Map(rows.map((r) => [r.month, r]));
    return Array.from({ length: 12 }, (_, i) => {
      const month = ymd(
        new Date(monthStart.getFullYear(), monthStart.getMonth() + i, 1),
      );
      const row = byMonth.get(month);
      return {
        month,
        new: parseInt(row?.new ?? '0', 10),
        returning: parseInt(row?.returning ?? '0', 10),
      };
    });
  }

  private async getPurchaseTotals(
    from: Date,
    to: Date,
  ): Promise<DashboardStats['purchases']> {
    const range = { from: ymd(from), to: ymd(to) };
    const [purchases, cancelledSales, returns] = await Promise.all([
      this.orderRepository
        .createQueryBuilder('order')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(order.total), 0)', 'cost')
        .where('order.direction = :achat', { achat: DocumentDirection.ACHAT })
        .andWhere('order.status <> :cancelled', {
          cancelled: OrderStatus.CANCELLED,
        })
        .andWhere('order.date BETWEEN :from AND :to', range)
        .getRawOne<{ count: string; cost: string }>(),
      this.orderRepository
        .createQueryBuilder('order')
        .where('order.direction = :vente', { vente: DocumentDirection.VENTE })
        .andWhere('order.status = :cancelled', {
          cancelled: OrderStatus.CANCELLED,
        })
        .andWhere('order.date BETWEEN :from AND :to', range)
        .getCount(),
      this.tenantConnService
        .getRepository(StockMovement)
        .createQueryBuilder('move')
        .where('move.movementType = :type', { type: MovementType.RETURN_IN })
        .andWhere('move.status = :done', { done: MovementStatus.DONE })
        .andWhere('move.dateDone >= :from', { from: range.from })
        .getCount(),
    ]);
    return {
      count: parseInt(purchases?.count ?? '0', 10),
      cost: parseFloat(purchases?.cost ?? '0'),
      cancelledSales,
      returns,
    };
  }

  private async getRecentSales(
    limit: number,
  ): Promise<DashboardStats['recentSales']> {
    const orders = await this.orderRepository.find({
      where: { direction: DocumentDirection.VENTE },
      order: { date: 'DESC', id: 'DESC' },
      take: limit,
    });
    return orders.map((o) => ({
      id: o.id,
      documentNumber: o.orderNumber || o.documentNumber,
      customerName: o.customerName ?? null,
      date: typeof o.date === 'string' ? o.date : ymd(new Date(o.date)),
      total: o.total,
      paidAmount: o.paidAmount,
      status: o.status,
    }));
  }

  private async getLowStockProducts(
    limit: number,
  ): Promise<DashboardStats['lowStockProducts']> {
    const products = await this.lowStockQuery()
      .orderBy('product.stock', 'ASC', 'NULLS FIRST')
      .addOrderBy('product.name', 'ASC')
      .limit(limit)
      .getMany();
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      imageUrl: p.imageUrl,
      stock: p.stock ?? 0,
      threshold: p.stockAlertThreshold ?? 5,
    }));
  }
}
