import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { ApiRes } from '../../common/api-response';
import { STT } from '../../common/response-codes';

@ApiTags('Statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
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
  @ApiResponse({ status: 200, description: 'Order statistics retrieved successfully' })
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
  @ApiResponse({ status: 200, description: 'Daily statistics retrieved successfully' })
  async getDailyStats(@Query('days') days?: string) {
    const daysNum = Math.min(365, Math.max(1, parseInt(days ?? '7', 10) || 7));
    const stats = await this.statisticsService.getDailyStats(daysNum);
    return ApiRes(STT.DAILY, stats);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top products retrieved successfully' })
  async getTopProducts(@Query('limit') limit?: string) {
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '5', 10) || 5),
    );
    const products = await this.statisticsService.getTopProducts(limitNum);
    return ApiRes(STT.TOP_PRODUCTS, products);
  }

  @Get('comprehensive')
  @ApiOperation({ summary: 'Get comprehensive statistics' })
  @ApiResponse({ status: 200, description: 'Comprehensive statistics retrieved successfully' })
  async getComprehensiveStats(@Query('days') days?: string) {
    const daysNum = Math.min(365, Math.max(1, parseInt(days ?? '7', 10) || 7));
    const stats = await this.statisticsService.getComprehensiveStats(daysNum);
    return ApiRes(STT.COMPREHENSIVE, stats);
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'Get recent activities' })
  @ApiResponse({ status: 200, description: 'Recent activities retrieved successfully' })
  async getRecentActivities(@Query('limit') limit?: string) {
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );
    const activities =
      await this.statisticsService.getRecentActivities(limitNum);
    return ApiRes(STT.RECENT_ACTIVITIES, activities);
  }
}
