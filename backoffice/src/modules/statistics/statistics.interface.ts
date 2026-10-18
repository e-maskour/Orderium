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

export type DashboardPeriod = 'mtd' | 'ytd';

export interface IDashboardKpi {
  value: number;
  previous: number;
  /** % change vs the previous period, null when there is no baseline */
  change: number | null;
}

export interface IDashboardSeriesPoint {
  /** Bucket start date, YYYY-MM-DD */
  date: string;
  revenue: number;
  orders: number;
}

export interface IDashboardStats {
  period: DashboardPeriod;
  range: { start: string; end: string };
  kpis: {
    sales: IDashboardKpi;
    revenue: IDashboardKpi;
    cost: IDashboardKpi;
    profit: IDashboardKpi;
  };
  breakdown: {
    revenue: number;
    collected: number;
    outstanding: number;
    cost: number;
    profit: number;
    margin: number;
    salesCount: number;
  };
  salesSeries: {
    daily: IDashboardSeriesPoint[];
    weekly: IDashboardSeriesPoint[];
    monthly: IDashboardSeriesPoint[];
  };
  inventory: { qtyInHand: number; incoming: number };
  partners: { customers: number; suppliers: number };
  stock: { lowStock: number; outOfStock: number; categories: number; products: number };
  customerSeries: { month: string; new: number; returning: number }[];
  purchases: { count: number; cost: number; cancelledSales: number; returns: number };
  recentSales: {
    id: number;
    documentNumber: string;
    customerName: string | null;
    date: string;
    total: number;
    paidAmount: number;
    status: string;
  }[];
  lowStockProducts: {
    id: number;
    name: string;
    code: string | null;
    imageUrl: string | null;
    stock: number;
    threshold: number;
  }[];
}
