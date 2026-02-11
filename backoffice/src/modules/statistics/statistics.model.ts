import { Statistics as IStatistics } from './statistics.interface';

export class Statistics implements IStatistics {
  TotalRevenue?: number;
  TotalOrders?: number;
  TotalCustomers?: number;
  AverageOrderValue?: number;
  PendingOrders?: number;
  InDeliveryOrders?: number;
  DeliveredOrders?: number;
  CancelledOrders?: number;
  ActiveDeliveryPersons?: number;
  [key: string]: any;

  constructor(data: IStatistics) {
    Object.assign(this, data);
  }

  // Getters
  get displayTotalRevenue(): string {
    return this.TotalRevenue ? this.TotalRevenue.toFixed(2) : '0.00';
  }

  get displayAverageOrderValue(): string {
    return this.AverageOrderValue ? this.AverageOrderValue.toFixed(2) : '0.00';
  }

  get hasData(): boolean {
    return this.TotalOrders !== undefined && this.TotalOrders > 0;
  }

  // Methods
  calculateGrowth(previousValue: number, currentValue: number): number {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  // Static factory method
  static fromApiResponse(data: any): Statistics {
    return new Statistics({
      TotalRevenue: data.totalRevenue !== undefined ? parseFloat(data.totalRevenue) : undefined,
      TotalOrders: data.totalOrders !== undefined ? parseInt(data.totalOrders.toString()) : undefined,
      TotalCustomers: data.totalCustomers !== undefined ? parseInt(data.totalCustomers.toString()) : undefined,
      AverageOrderValue: data.averageOrderValue !== undefined ? parseFloat(data.averageOrderValue) : undefined,
      PendingOrders: data.pendingOrders !== undefined ? parseInt(data.pendingOrders.toString()) : undefined,
      InDeliveryOrders: data.inDeliveryOrders !== undefined ? parseInt(data.inDeliveryOrders.toString()) : undefined,
      DeliveredOrders: data.deliveredOrders !== undefined ? parseInt(data.deliveredOrders.toString()) : undefined,
      CancelledOrders: data.cancelledOrders !== undefined ? parseInt(data.cancelledOrders.toString()) : undefined,
      ActiveDeliveryPersons: data.activeDeliveryPersons !== undefined ? parseInt(data.activeDeliveryPersons.toString()) : undefined,
      ...data,
    });
  }
}
