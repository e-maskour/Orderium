import { notificationRepo } from './notification.repo';
import type { Notification, CreateNotificationDTO } from './notification.model';

class NotificationService {
  async create(data: CreateNotificationDTO): Promise<Notification> {
    return notificationRepo.create(data);
  }

  async getForAdmin(limit = 50): Promise<Notification[]> {
    return notificationRepo.getForAdmin(limit);
  }

  async getForDeliveryPerson(deliveryPersonId: number, limit = 50): Promise<Notification[]> {
    return notificationRepo.getForDeliveryPerson(deliveryPersonId, limit);
  }

  async getForCustomer(customerId: number, limit = 50): Promise<Notification[]> {
    return notificationRepo.getForCustomer(customerId, limit);
  }

  async getUnreadCountForAdmin(): Promise<number> {
    return notificationRepo.getUnreadCountForAdmin();
  }

  async getUnreadCountForDeliveryPerson(deliveryPersonId: number): Promise<number> {
    return notificationRepo.getUnreadCountForDeliveryPerson(deliveryPersonId);
  }

  async getUnreadCountForCustomer(customerId: number): Promise<number> {
    return notificationRepo.getUnreadCountForCustomer(customerId);
  }

  async markAsRead(notificationId: number): Promise<boolean> {
    return notificationRepo.markAsRead(notificationId);
  }

  async markMultipleAsRead(notificationIds: number[]): Promise<number> {
    return notificationRepo.markMultipleAsRead(notificationIds);
  }

  async markAllAsReadForAdmin(): Promise<number> {
    return notificationRepo.markAllAsReadForAdmin();
  }

  async markAllAsReadForDeliveryPerson(deliveryPersonId: number): Promise<number> {
    return notificationRepo.markAllAsReadForDeliveryPerson(deliveryPersonId);
  }

  async markAllAsReadForCustomer(customerId: number): Promise<number> {
    return notificationRepo.markAllAsReadForCustomer(customerId);
  }
}

export const notificationService = new NotificationService();
