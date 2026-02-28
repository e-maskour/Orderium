import {
    INotification,
    NotificationType,
    NotificationPriority,
} from './notifications.interface';

export class Notification implements INotification {
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
        this.isRead = data.isRead;
        this.isArchived = data.isArchived;
        this.dateCreated = data.dateCreated;
        this.orderId = data.orderId;
        this.orderNumber = data.orderNumber;
        this.customerId = data.customerId;
        this.customerName = data.customerName;
    }

    // Getters
    get isUnread(): boolean {
        return !this.isRead;
    }

    get isUrgent(): boolean {
        return this.priority === NotificationPriority.URGENT;
    }

    get isHighPriority(): boolean {
        return (
            this.priority === NotificationPriority.HIGH ||
            this.priority === NotificationPriority.URGENT
        );
    }

    get isOrderRelated(): boolean {
        return !!this.orderId || !!this.orderNumber;
    }

    get relativeTime(): string {
        const now = new Date();
        const created = new Date(this.dateCreated);
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    get displayDate(): string {
        return new Date(this.dateCreated).toLocaleDateString();
    }

    get priorityColor(): string {
        switch (this.priority) {
            case NotificationPriority.URGENT: return 'red';
            case NotificationPriority.HIGH: return 'orange';
            case NotificationPriority.MEDIUM: return 'yellow';
            default: return 'gray';
        }
    }

    get typeIcon(): string {
        switch (this.type) {
            case NotificationType.NEW_ORDER: return '🛒';
            case NotificationType.ORDER_ASSIGNED: return '👤';
            case NotificationType.ORDER_STATUS_CHANGED: return '🔄';
            case NotificationType.DELIVERY_STATUS_UPDATE: return '🚚';
            case NotificationType.ORDER_CANCELLED: return '❌';
            case NotificationType.PAYMENT_RECEIVED: return '💳';
            case NotificationType.LOW_STOCK: return '📦';
            case NotificationType.WARNING: return '⚠️';
            case NotificationType.ERROR: return '🚨';
            default: return 'ℹ️';
        }
    }

    get typeLabel(): string {
        switch (this.type) {
            case NotificationType.NEW_ORDER: return 'New Order';
            case NotificationType.ORDER_ASSIGNED: return 'Order Assigned';
            case NotificationType.ORDER_STATUS_CHANGED: return 'Status Changed';
            case NotificationType.DELIVERY_STATUS_UPDATE: return 'Delivery Update';
            case NotificationType.ORDER_CANCELLED: return 'Order Cancelled';
            case NotificationType.PAYMENT_RECEIVED: return 'Payment Received';
            case NotificationType.LOW_STOCK: return 'Low Stock';
            case NotificationType.SYSTEM: return 'System';
            case NotificationType.INFO: return 'Info';
            case NotificationType.WARNING: return 'Warning';
            case NotificationType.ERROR: return 'Error';
            default: return this.type;
        }
    }

    get isCustomerRelated(): boolean {
        return !!this.customerId;
    }

    get isArchivable(): boolean {
        return !this.isArchived;
    }

    // Static factory method
    static fromApiResponse(data: any): Notification {
        return new Notification({
            id: data.id,
            userId: data.userId,
            type: data.type,
            priority: data.priority,
            title: data.title,
            message: data.message,
            data: data.data,
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
