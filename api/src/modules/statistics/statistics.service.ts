import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../orders/entities/document.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async getOrderStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .select('COUNT(*)', 'totalOrders')
      .addSelect('SUM(document.total)', 'totalRevenue')
      .addSelect('AVG(document.total)', 'averageOrderValue');

    if (startDate) {
      queryBuilder.andWhere('document.date >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('document.date <= :endDate', { endDate });
    }

    const result = await queryBuilder.getRawOne();

    return {
      totalOrders: parseInt(result.totalOrders) || 0,
      totalRevenue: parseFloat(result.totalRevenue) || 0,
      averageOrderValue: parseFloat(result.averageOrderValue) || 0,
    };
  }

  async getDailyStats(days = 7): Promise<any[]> {
    const result = await this.documentRepository
      .createQueryBuilder('document')
      .select('DATE(document.date)', 'date')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(document.total)', 'revenue')
      .where('document.date >= NOW() - INTERVAL :days DAY', { days })
      .groupBy('DATE(document.date)')
      .orderBy('DATE(document.date)', 'DESC')
      .getRawMany();

    return result;
  }
}
