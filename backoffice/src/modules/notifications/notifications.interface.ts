/**
 * Notifications Module — TypeScript Interfaces
 */

export enum NotificationType {
  NEW_ORDER = 'new_order',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_DELIVERED = 'order_delivered',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  NEW_USER = 'new_user',
  USER_DEACTIVATED = 'user_deactivated',
  SYSTEM_UPDATE = 'system_update',
  BACKUP_DONE = 'backup_done',
  // Legacy types (backward compat)
  ORDER_ASSIGNED = 'order_assigned',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  DELIVERY_STATUS_UPDATE = 'delivery_status_update',
  SYSTEM = 'system',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  // Legacy alias
  URGENT = 'urgent',
}

export type NotificationTab = 'all' | 'unread' | 'orders' | 'stock' | 'payments' | 'team';

export const NOTIFICATION_TAB_TYPES: Record<NotificationTab, NotificationType[] | null> = {
  all: null,
  unread: null,
  orders: [
    NotificationType.NEW_ORDER,
    NotificationType.ORDER_CANCELLED,
    NotificationType.ORDER_DELIVERED,
    NotificationType.ORDER_ASSIGNED,
    NotificationType.ORDER_STATUS_CHANGED,
    NotificationType.DELIVERY_STATUS_UPDATE,
  ],
  stock: [NotificationType.LOW_STOCK, NotificationType.OUT_OF_STOCK],
  payments: [NotificationType.PAYMENT_RECEIVED, NotificationType.PAYMENT_FAILED],
  team: [NotificationType.NEW_USER, NotificationType.USER_DEACTIVATED],
};

export interface NotificationTypeConfig {
  emoji: string;
  bgClass: string;
  colorClass: string;
  borderClass: string;
}

export const NOTIFICATION_TYPE_CONFIG: Record<string, NotificationTypeConfig> = {
  [NotificationType.NEW_ORDER]:           { emoji: '📦', bgClass: 'bg-blue-50',   colorClass: 'text-blue-600',   borderClass: 'border-blue-400' },
  [NotificationType.ORDER_CANCELLED]:     { emoji: '❌', bgClass: 'bg-red-50',    colorClass: 'text-red-600',    borderClass: 'border-red-400' },
  [NotificationType.ORDER_DELIVERED]:     { emoji: '✅', bgClass: 'bg-green-50',  colorClass: 'text-green-600',  borderClass: 'border-green-400' },
  [NotificationType.LOW_STOCK]:           { emoji: '⚠️', bgClass: 'bg-orange-50', colorClass: 'text-orange-600', borderClass: 'border-orange-400' },
  [NotificationType.OUT_OF_STOCK]:        { emoji: '🚨', bgClass: 'bg-red-100',   colorClass: 'text-red-700',    borderClass: 'border-red-500' },
  [NotificationType.PAYMENT_RECEIVED]:    { emoji: '💰', bgClass: 'bg-green-50',  colorClass: 'text-green-600',  borderClass: 'border-green-400' },
  [NotificationType.PAYMENT_FAILED]:      { emoji: '⛔', bgClass: 'bg-red-50',    colorClass: 'text-red-600',    borderClass: 'border-red-400' },
  [NotificationType.NEW_USER]:            { emoji: '👤', bgClass: 'bg-purple-50', colorClass: 'text-purple-600', borderClass: 'border-purple-400' },
  [NotificationType.USER_DEACTIVATED]:    { emoji: '🔒', bgClass: 'bg-gray-100',  colorClass: 'text-gray-600',   borderClass: 'border-gray-400' },
  [NotificationType.SYSTEM_UPDATE]:       { emoji: '🔄', bgClass: 'bg-sky-50',    colorClass: 'text-sky-600',    borderClass: 'border-sky-400' },
  [NotificationType.BACKUP_DONE]:         { emoji: '💾', bgClass: 'bg-teal-50',   colorClass: 'text-teal-600',   borderClass: 'border-teal-400' },
  // Legacy fallbacks
  [NotificationType.ORDER_ASSIGNED]:      { emoji: '👤', bgClass: 'bg-blue-50',   colorClass: 'text-blue-600',   borderClass: 'border-blue-400' },
  [NotificationType.ORDER_STATUS_CHANGED]:{ emoji: '📦', bgClass: 'bg-amber-50',  colorClass: 'text-amber-600',  borderClass: 'border-amber-400' },
  [NotificationType.DELIVERY_STATUS_UPDATE]:{ emoji: '🚚', bgClass: 'bg-purple-50', colorClass: 'text-purple-600', borderClass: 'border-purple-400' },
  [NotificationType.SYSTEM]:              { emoji: '⚙️', bgClass: 'bg-gray-100',  colorClass: 'text-gray-600',   borderClass: 'border-gray-400' },
  [NotificationType.INFO]:               { emoji: 'ℹ️', bgClass: 'bg-sky-50',    colorClass: 'text-sky-600',    borderClass: 'border-sky-400' },
  [NotificationType.WARNING]:            { emoji: '⚠️', bgClass: 'bg-amber-50',  colorClass: 'text-amber-600',  borderClass: 'border-amber-400' },
  [NotificationType.ERROR]:              { emoji: '🚨', bgClass: 'bg-red-50',    colorClass: 'text-red-600',    borderClass: 'border-red-400' },
};

export interface INotification {
  id: number;
  userId: number;
  type: NotificationType | string;
  priority: NotificationPriority | string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  isRead: boolean;
  isArchived: boolean;
  dateCreated: string;

  // Relational data
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
  channels?: NotificationChannelSettings;
}

export interface NotificationChannelSettings {
  orders:   { inApp: boolean; email: boolean; sms: boolean };
  stock:    { inApp: boolean; email: boolean; sms: boolean };
  payments: { inApp: boolean; email: boolean; sms: boolean };
  team:     { inApp: boolean; email: boolean; sms: boolean };
  system:   { inApp: boolean; email: boolean; sms: boolean };
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
