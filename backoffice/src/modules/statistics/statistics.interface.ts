export interface Statistics {
  totalRevenue?: number;
  totalOrders?: number;
  totalCustomers?: number;
  averageOrderValue?: number;
  [key: string]: any;
}

export interface StatisticsFilters {
  startDate?: Date;
  endDate?: Date;
}
