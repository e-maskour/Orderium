import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  StatisticsService,
  OrderStatistics,
  DailyStats,
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
}
