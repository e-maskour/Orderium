export interface Notification {
  Id: number;
  UserId?: number;
  DeliveryPersonId?: number;
  CustomerId?: number;
  UserType: 'admin' | 'delivery' | 'customer';
  Title: string;
  Message: string;
  Type: 'order_created' | 'order_assigned' | 'order_status_changed' | 'order_cancelled';
  OrderId?: number;
  OrderNumber?: string;
  IsRead: boolean;
  DateCreated: Date;
  DateRead?: Date;
}

export interface CreateNotificationDTO {
  UserId?: number;
  DeliveryPersonId?: number;
  CustomerId?: number;
  UserType: 'admin' | 'delivery' | 'customer';
  Title: string;
  Message: string;
  Type: 'order_created' | 'order_assigned' | 'order_status_changed' | 'order_cancelled';
  OrderId?: number;
  OrderNumber?: string;
}

export interface MarkAsReadDTO {
  notificationIds: number[];
}
