/**
 * Notifications Module - Service Layer
 * API communication for notification management
 */

import type {
  NotificationFilters,
  NotificationStats,
  NotificationPreferences,
  PaginationParams,
  PaginatedResponse,
} from './notifications.interface';
import { Notification } from './notifications.model';
import { apiClient, API_ROUTES } from '../../common';

class NotificationsService {

  async getNotifications(
    filters?: NotificationFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Notification>> {
    const params = new URLSearchParams();
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.limit) params.append('limit', pagination.limit.toString());
    if (pagination?.sortBy) params.append('sortBy', pagination.sortBy);
    if (pagination?.sortOrder) params.append('sortOrder', pagination.sortOrder);
    if (filters?.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      types.forEach((type) => params.append('type', type));
    }
    if (filters?.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      priorities.forEach((priority) => params.append('priority', priority));
    }
    if (filters?.isRead !== undefined) params.append('isRead', filters.isRead.toString());
    if (filters?.isArchived !== undefined) params.append('isArchived', filters.isArchived.toString());
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = queryString ? `${API_ROUTES.NOTIFICATIONS.LIST}?${queryString}` : API_ROUTES.NOTIFICATIONS.LIST;
    const response = await apiClient.get<any[]>(url);
    const total = (response.metadata as any)?.total || 0;
    const limit = (response.metadata as any)?.limit || pagination?.limit || 25;
    return {
      data: (response.data || []).map((n: any) => Notification.fromApiResponse(n)),
      total,
      page: pagination?.page || 1,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getNotification(id: number): Promise<Notification> {
    const response = await apiClient.get<any>(API_ROUTES.NOTIFICATIONS.DETAIL(id));
    return Notification.fromApiResponse(response.data);
  }

  async getStats(): Promise<NotificationStats> {
    const response = await apiClient.get<NotificationStats>(API_ROUTES.NOTIFICATIONS.STATS);
    return response.data;
  }

  async getUnreadCount(): Promise<{ count: number }> {
    const response = await apiClient.get<{ count: number }>(API_ROUTES.NOTIFICATIONS.UNREAD_COUNT);
    return { count: response.data.count };
  }

  async markAsRead(id: number): Promise<Notification> {
    const response = await apiClient.patch<any>(API_ROUTES.NOTIFICATIONS.MARK_READ(id));
    return Notification.fromApiResponse(response.data);
  }

  async markManyAsRead(ids: number[]): Promise<{ updated: number }> {
    const response = await apiClient.patch<{ updated: number }>(API_ROUTES.NOTIFICATIONS.MARK_MANY_READ, { ids });
    return response.data;
  }

  async markAllAsRead(filters?: NotificationFilters): Promise<{ updated: number }> {
    const response = await apiClient.patch<{ updated: number }>(API_ROUTES.NOTIFICATIONS.MARK_ALL_READ, filters || {});
    return response.data;
  }

  async archive(id: number): Promise<Notification> {
    const response = await apiClient.patch<any>(API_ROUTES.NOTIFICATIONS.ARCHIVE(id));
    return Notification.fromApiResponse(response.data);
  }

  async archiveMany(ids: number[]): Promise<{ updated: number }> {
    const response = await apiClient.patch<{ updated: number }>(API_ROUTES.NOTIFICATIONS.ARCHIVE_MANY, { ids });
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(API_ROUTES.NOTIFICATIONS.DELETE(id));
  }

  async deleteMany(ids: number[]): Promise<{ deleted: number }> {
    const response = await apiClient.delete<{ deleted: number }>(API_ROUTES.NOTIFICATIONS.DELETE_MANY, { ids });
    return response.data;
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get<NotificationPreferences>(API_ROUTES.NOTIFICATIONS.PREFERENCES);
    return response.data;
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await apiClient.patch<NotificationPreferences>(API_ROUTES.NOTIFICATIONS.PREFERENCES, preferences);
    return response.data;
  }

  async sendTestNotification(): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(API_ROUTES.NOTIFICATIONS.TEST);
    return response.data;
  }
}

export const notificationsService = new NotificationsService();
