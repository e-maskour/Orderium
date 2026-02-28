import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  StatisticsService,
  OrderStatistics,
  DailyStats,
  TopProduct,
  ComprehensiveStats,
  RecentActivity,
} from './statistics.service';
import { ApiRes } from '../../common/api-response';
import { STT } from '../../common/response-codes';

@ApiTags('Statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) { }

  @Get()
  @ApiOperation({ summary: 'Get all statistics' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const stats = await this.statisticsService.getOrderStatistics(start, end);
    return ApiRes(STT.ALL, stats);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get order statistics' })
  async getOrderStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const stats = await this.statisticsService.getOrderStatistics(start, end);
    return ApiRes(STT.ORDERS, stats);
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily statistics' })
  async getDailyStats(
    @Query('days') days?: string,
  ) {
    const daysNum = Math.min(365, Math.max(1, parseInt(days ?? '7', 10) || 7));
    const stats = await this.statisticsService.getDailyStats(daysNum);
    return ApiRes(STT.DAILY, stats);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  async getTopProducts(
    @Query('limit') limit?: string,
  ) {
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '5', 10) || 5));
    const products = await this.statisticsService.getTopProducts(limitNum);
    return ApiRes(STT.TOP_PRODUCTS, products);
  }

  @Get('comprehensive')
  @ApiOperation({ summary: 'Get comprehensive statistics' })
  async getComprehensiveStats(
    @Query('days') days?: string,
  ) {
    const daysNum = Math.min(365, Math.max(1, parseInt(days ?? '7', 10) || 7));
    const stats = await this.statisticsService.getComprehensiveStats(daysNum);
    return ApiRes(STT.COMPREHENSIVE, stats);
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'Get recent activities' })
  async getRecentActivities(
    @Query('limit') limit?: string,
  ) {
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '10', 10) || 10));
    const activities = await this.statisticsService.getRecentActivities(limitNum);
    return ApiRes(STT.RECENT_ACTIVITIES, activities);
  }
}
