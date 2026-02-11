import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, DeliveryStatus } from '../orders/entities/order.entity';
import { Partner } from '../partners/entities/partner.entity';
import { DeliveryPerson } from '../delivery/entities/delivery.entity';
import { Product } from '../products/entities/product.entity';

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

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getOrderStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<OrderStatistics> {
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
    const statusCounts = await this.getOrderCountsByStatus(startDate, endDate);

    // Get total customers
    const totalCustomers = await this.partnerRepository.count({
      where: { isCustomer: true },
    });

    // Get active delivery persons
    const activeDeliveryPersons = await this.deliveryPersonRepository.count({
      where: { isActive: true },
    });

    return {
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
  }

  async getTopProducts(limit = 5): Promise<TopProduct[]> {
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

    return result.map((row) => ({
      productId: parseInt(row.productId, 10),
      productName: row.productName,
      sales: parseInt(row.sales, 10) || 0,
      revenue: parseFloat(row.revenue) || 0,
    }));
  }

  async getComprehensiveStats(days = 7): Promise<ComprehensiveStats> {
    const [overview, dailyStats, topProducts] = await Promise.all([
      this.getOrderStatistics(),
      this.getDailyStats(days),
      this.getTopProducts(5),
    ]);

    return {
      overview,
      dailyStats,
      topProducts,
    };
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

    return result.map((row) => ({
      date: row.date,
      orders: parseInt(row.orders, 10) || 0,
      revenue: parseFloat(row.revenue) || 0,
      newOrders: parseInt(row.newOrders, 10) || 0,
      delivered: parseInt(row.delivered, 10) || 0,
      cancelled: parseInt(row.cancelled, 10) || 0,
    }));
  }

  async getRecentActivities(limit = 10): Promise<RecentActivity[]> {
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
      .andWhere('partner.dateCreated >= :startDate', { startDate: last24Hours })
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
        timestamp: new Date(now.getTime() - Math.random() * 3 * 60 * 60 * 1000), // Random time in last 3 hours
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
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Return limited number of activities
    return activities.slice(0, limit);
  }
}
