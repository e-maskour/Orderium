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

@ApiTags('Statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all statistics' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ success: boolean; stats: OrderStatistics }> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const stats = await this.statisticsService.getOrderStatistics(start, end);
    return { success: true, stats };
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get order statistics' })
  async getOrderStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ success: boolean; stats: OrderStatistics }> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const stats = await this.statisticsService.getOrderStatistics(start, end);
    return { success: true, stats };
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily statistics' })
  async getDailyStats(
    @Query('days') days?: string,
  ): Promise<{ success: boolean; stats: DailyStats[] }> {
    const daysNum = days ? parseInt(days, 10) : 7;
    const stats = await this.statisticsService.getDailyStats(daysNum);
    return { success: true, stats };
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  async getTopProducts(
    @Query('limit') limit?: string,
  ): Promise<{ success: boolean; stats: TopProduct[] }> {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    const stats = await this.statisticsService.getTopProducts(limitNum);
    return { success: true, stats };
  }

  @Get('comprehensive')
  @ApiOperation({ summary: 'Get comprehensive statistics' })
  async getComprehensiveStats(
    @Query('days') days?: string,
  ): Promise<{ success: boolean; stats: ComprehensiveStats }> {
    const daysNum = days ? parseInt(days, 10) : 7;
    const stats = await this.statisticsService.getComprehensiveStats(daysNum);
    return { success: true, stats };
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'Get recent activities' })
  async getRecentActivities(
    @Query('limit') limit?: string,
  ): Promise<{ success: boolean; activities: RecentActivity[] }> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const activities =
      await this.statisticsService.getRecentActivities(limitNum);
    return { success: true, activities };
  }
}
