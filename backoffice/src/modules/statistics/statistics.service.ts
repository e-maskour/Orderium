import { Statistics } from './statistics.model';

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
}

export const statisticsService = new StatisticsService();
