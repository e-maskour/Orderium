import type {
  UpdateNotificationTemplateDTO,
  SendCustomNotificationDTO,
} from './notification-templates.interface';
import { NotificationTemplate } from './notification-templates.model';
import { apiClient, API_ROUTES } from '../../common';

class NotificationTemplatesService {
  async getAll(): Promise<NotificationTemplate[]> {
    const response = await apiClient.get<Record<string, unknown>[]>(
      API_ROUTES.NOTIFICATION_TEMPLATES.LIST,
    );
    return (response.data || []).map((t) => NotificationTemplate.fromApiResponse(t));
  }

  async getByKey(key: string): Promise<NotificationTemplate> {
    const response = await apiClient.get<Record<string, unknown>>(
      API_ROUTES.NOTIFICATION_TEMPLATES.DETAIL(key),
    );
    return NotificationTemplate.fromApiResponse(response.data);
  }

  async update(key: string, dto: UpdateNotificationTemplateDTO): Promise<NotificationTemplate> {
    const response = await apiClient.patch<Record<string, unknown>>(
      API_ROUTES.NOTIFICATION_TEMPLATES.UPDATE(key),
      dto,
    );
    return NotificationTemplate.fromApiResponse(response.data);
  }

  async toggle(key: string, enabled: boolean): Promise<NotificationTemplate> {
    const response = await apiClient.patch<Record<string, unknown>>(
      API_ROUTES.NOTIFICATION_TEMPLATES.TOGGLE(key),
      { enabled },
    );
    return NotificationTemplate.fromApiResponse(response.data);
  }

  async resetOne(key: string): Promise<NotificationTemplate> {
    const response = await apiClient.post<Record<string, unknown>>(
      API_ROUTES.NOTIFICATION_TEMPLATES.RESET(key),
      {},
    );
    return NotificationTemplate.fromApiResponse(response.data);
  }

  async resetAll(): Promise<void> {
    await apiClient.post(API_ROUTES.NOTIFICATION_TEMPLATES.RESET_ALL, {});
  }

  async sendCustom(dto: SendCustomNotificationDTO): Promise<void> {
    await apiClient.post(API_ROUTES.NOTIFICATION_TEMPLATES.SEND_CUSTOM, dto);
  }
}

export const notificationTemplatesService = new NotificationTemplatesService();
