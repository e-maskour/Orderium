import {
  INotification,
  NotificationType,
  NotificationPriority,
  NOTIFICATION_TYPE_CONFIG,
} from './notifications.interface';

export class Notification implements INotification {
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
  orderId?: number;
  orderNumber?: string;
  customerId?: number;
  customerName?: string;

  constructor(data: INotification) {
    this.id = data.id;
    this.userId = data.userId;
    this.type = data.type;
    this.priority = data.priority;
    this.title = data.title;
    this.message = data.message;
    this.data = data.data;
    this.actionUrl = data.actionUrl;
    this.isRead = data.isRead;
    this.isArchived = data.isArchived;
    this.dateCreated = data.dateCreated;
    this.orderId = data.orderId;
    this.orderNumber = data.orderNumber;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
  }

  get isUnread(): boolean {
    return !this.isRead;
  }

  get isCriticalOrHigh(): boolean {
    return (
      this.priority === NotificationPriority.CRITICAL ||
      this.priority === NotificationPriority.URGENT ||
      this.priority === NotificationPriority.HIGH
    );
  }

  get typeConfig() {
    return NOTIFICATION_TYPE_CONFIG[this.type] ?? {
      emoji: 'ℹ️',
      bgClass: 'bg-gray-100',
      colorClass: 'text-gray-600',
      borderClass: 'border-gray-400',
    };
  }

  get resolvedActionUrl(): string | undefined {
    if (this.actionUrl) return this.actionUrl;
    if (this.orderId) return `/orders/${this.orderId}`;
    return undefined;
  }

  static fromApiResponse(data: any): Notification {
    return new Notification({
      id: data.id,
      userId: data.userId,
      type: data.type,
      priority: data.priority === 'urgent' ? 'critical' : data.priority,
      title: data.title,
      message: data.message,
      data: data.data,
      actionUrl: data.actionUrl ?? data.data?.actionUrl,
      isRead: data.isRead ?? false,
      isArchived: data.isArchived ?? false,
      dateCreated: data.dateCreated,
      orderId: data.orderId ?? data.data?.orderId,
      orderNumber: data.orderNumber ?? data.data?.orderNumber,
      customerId: data.customerId ?? data.data?.customerId,
      customerName: data.customerName ?? data.data?.customerName,
    });
  }

  toJSON(): INotification {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      priority: this.priority,
      title: this.title,
      message: this.message,
      data: this.data,
      actionUrl: this.actionUrl,
      isRead: this.isRead,
      isArchived: this.isArchived,
      dateCreated: this.dateCreated,
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      customerId: this.customerId,
      customerName: this.customerName,
    };
  }
}
