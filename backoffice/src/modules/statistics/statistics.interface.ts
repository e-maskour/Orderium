export interface IStatistics {
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
}

export interface IDailyStats {
  date: string;
  orders: number;
  revenue: number;
  newOrders: number;
  delivered: number;
  cancelled: number;
}

export interface ITopProduct {
  productId: number;
  productName: string;
  sales: number;
  revenue: number;
}

export interface IComprehensiveStatistics {
  overview: IStatistics;
  dailyStats: IDailyStats[];
  topProducts: ITopProduct[];
}

export interface IRecentActivity {
  type: 'order' | 'customer' | 'product' | 'revenue';
  title: string;
  description: string;
  timestamp: string;
  value?: number;
  orderId?: number;
  customerId?: number;
  productId?: number;
}

export interface StatisticsFilters {
  startDate?: Date;
  endDate?: Date;
}
