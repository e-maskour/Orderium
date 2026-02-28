/**
 * Notifications Module - TypeScript Interfaces
 * Professional notification system for Orderium backoffice
 */

export enum NotificationType {
  NEW_ORDER = 'new_order',
  ORDER_ASSIGNED = 'order_assigned',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  DELIVERY_STATUS_UPDATE = 'delivery_status_update',
  ORDER_CANCELLED = 'order_cancelled',
  PAYMENT_RECEIVED = 'payment_received',
  LOW_STOCK = 'low_stock',
  SYSTEM = 'system',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface INotification {
  id: number;
  userId: number;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  isArchived: boolean;
  dateCreated: string;
  
  // Relational data (from data field)
  orderId?: number;
  orderNumber?: string;
  customerId?: number;
  customerName?: string;
}

export interface NotificationFilters {
  type?: NotificationType | NotificationType[];
  priority?: NotificationPriority | NotificationPriority[];
  isRead?: boolean;
  isArchived?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  thisWeek: number;
}

export interface NotificationPreferences {
  userId: number;
  emailEnabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  enabledTypes: NotificationType[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
