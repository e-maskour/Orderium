import { Statistics } from './statistics.model';
import type { ComprehensiveStatistics, RecentActivity } from './statistics.interface';

const API_URL = '/api';

export class StatisticsService {
  async getStatistics(startDate?: Date, endDate?: Date): Promise<Statistics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/statistics${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch statistics');
    const data = await response.json();
    return Statistics.fromApiResponse(data.stats);
  }

  async getComprehensiveStats(days: number = 7): Promise<ComprehensiveStatistics> {
    const response = await fetch(`${API_URL}/statistics/comprehensive?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch comprehensive statistics');
    const data = await response.json();
    return {
      overview: Statistics.fromApiResponse(data.stats.overview),
      dailyStats: data.stats.dailyStats,
      topProducts: data.stats.topProducts,
    };
  }

  async getRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
    const response = await fetch(`${API_URL}/statistics/recent-activities?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch recent activities');
    const data = await response.json();
    return data.activities;
  }
}

export const statisticsService = new StatisticsService();
