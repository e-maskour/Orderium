import { Statistics as IStatistics } from './statistics.interface';

export class Statistics implements IStatistics {
  totalRevenue?: number;
  totalOrders?: number;
  totalCustomers?: number;
  averageOrderValue?: number;
  [key: string]: any;

  constructor(data: IStatistics) {
    Object.assign(this, data);
  }

  // Getters
  get displayTotalRevenue(): string {
    return this.totalRevenue ? this.totalRevenue.toFixed(2) : '0.00';
  }

  get displayAverageOrderValue(): string {
    return this.averageOrderValue ? this.averageOrderValue.toFixed(2) : '0.00';
  }

  get hasData(): boolean {
    return this.totalOrders !== undefined && this.totalOrders > 0;
  }

  // Methods
  calculateGrowth(previousValue: number, currentValue: number): number {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  // Static factory method
  static fromApiResponse(data: any): Statistics {
    return new Statistics({
      totalRevenue: data.totalRevenue ? parseFloat(data.totalRevenue) : undefined,
      totalOrders: data.totalOrders ? parseInt(data.totalOrders) : undefined,
      totalCustomers: data.totalCustomers ? parseInt(data.totalCustomers) : undefined,
      averageOrderValue: data.averageOrderValue ? parseFloat(data.averageOrderValue) : undefined,
      ...data,
    });
  }
}
