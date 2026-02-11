export interface Statistics {
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

export interface DailyStats {
  date: string;
  orders: number;
  revenue: number;
  newOrders: number;
  delivered: number;
  cancelled: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  sales: number;
  revenue: number;
}

export interface ComprehensiveStatistics {
  overview: Statistics;
  dailyStats: DailyStats[];
  topProducts: TopProduct[];
}

export interface RecentActivity {
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
