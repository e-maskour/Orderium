/**
 * Notifications Module - Service Layer
 * API communication for notification management
 */

import type {
  Notification,
  NotificationFilters,
  NotificationStats,
  NotificationPreferences,
  PaginationParams,
  PaginatedResponse,
} from './notifications.interface';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class NotificationsService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const token = localStorage.getItem('adminToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get paginated notifications with filters
   */
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
    const response = await this.request<{
      success: boolean;
      data: Notification[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/notifications${queryString ? `?${queryString}` : ''}`);

    return {
      data: response.data,
      total: response.total,
      page: response.page,
      limit: response.limit,
      totalPages: response.totalPages,
    };
  }

  /**
   * Get notification by ID
   */
  async getNotification(id: number): Promise<Notification> {
    const response = await this.request<{ success: boolean; notification: Notification }>(
      `/api/notifications/${id}`
    );
    return response.notification;
  }

  /**
   * Get notification statistics
   */
  async getStats(): Promise<NotificationStats> {
    const response = await this.request<{ success: boolean; stats: NotificationStats }>(
      '/api/notifications/stats'
    );
    return response.stats;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/api/notifications/unread-count');
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: number): Promise<Notification> {
    const response = await this.request<{ success: boolean; notification: Notification }>(
      `/api/notifications/${id}/read`,
      { method: 'PATCH' }
    );
    return response.notification;
  }

  /**
   * Mark multiple notifications as read
   */
  async markManyAsRead(ids: number[]): Promise<{ updated: number }> {
    return this.request<{ updated: number }>('/api/notifications/mark-many-read', {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(filters?: NotificationFilters): Promise<{ updated: number }> {
    return this.request<{ updated: number }>('/api/notifications/mark-all-read', {
      method: 'PATCH',
      body: JSON.stringify(filters || {}),
    });
  }

  /**
   * Archive notification
   */
  async archive(id: number): Promise<Notification> {
    const response = await this.request<{ success: boolean; notification: Notification }>(
      `/api/notifications/${id}/archive`,
      { method: 'PATCH' }
    );
    return response.notification;
  }

  /**
   * Archive multiple notifications
   */
  async archiveMany(ids: number[]): Promise<{ updated: number }> {
    return this.request<{ updated: number }>('/api/notifications/archive-many', {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * Delete notification
   */
  async delete(id: number): Promise<void> {
    await this.request<{ success: boolean; message: string }>(
      `/api/notifications/${id}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Delete multiple notifications
   */
  async deleteMany(ids: number[]): Promise<{ deleted: number }> {
    return this.request<{ deleted: number }>('/api/notifications/delete-many', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/api/notifications/preferences');
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/api/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  }

  /**
   * Test notification
   */
  async sendTestNotification(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/notifications/test', {
      method: 'POST',
    });
  }
}

export const notificationsService = new NotificationsService();
