import { Statistics } from './statistics.model';
import type { IComprehensiveStatistics, IRecentActivity } from './statistics.interface';
import { apiClient, API_ROUTES } from '../../common';

export class StatisticsService {
  async getStatistics(startDate?: Date, endDate?: Date): Promise<Statistics> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    const response = await apiClient.get<any>(API_ROUTES.STATISTICS.OVERVIEW, { params });
    return Statistics.fromApiResponse(response.data);
  }

  async getComprehensiveStats(days: number = 7): Promise<IComprehensiveStatistics> {
    const response = await apiClient.get<any>(API_ROUTES.STATISTICS.COMPREHENSIVE, { params: { days } });
    return {
      overview: Statistics.fromApiResponse(response.data.overview),
      dailyStats: response.data.dailyStats,
      topProducts: response.data.topProducts,
    };
  }

  async getRecentActivities(limit: number = 10): Promise<IRecentActivity[]> {
    const response = await apiClient.get<IRecentActivity[]>(API_ROUTES.STATISTICS.RECENT_ACTIVITIES, { params: { limit } });
    return response.data;
  }
}

export const statisticsService = new StatisticsService();
