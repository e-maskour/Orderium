import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';

export interface OrderStatistics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface DailyStats {
  date: string;
  orders: string;
  revenue: string;
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
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

    return {
      totalOrders: parseInt(result?.totalOrders ?? '0', 10) || 0,
      totalRevenue: parseFloat(result?.totalRevenue ?? '0') || 0,
      averageOrderValue: parseFloat(result?.averageOrderValue ?? '0') || 0,
    };
  }

  async getDailyStats(days = 7): Promise<DailyStats[]> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.date)', 'date')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(order.total)', 'revenue')
      .where('order.date >= NOW() - INTERVAL :days DAY', { days })
      .groupBy('DATE(order.date)')
      .orderBy('DATE(order.date)', 'DESC')
      .getRawMany<DailyStats>();

    return result;
  }
}
