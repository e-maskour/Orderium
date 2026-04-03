import type { INotificationTemplate } from './notification-templates.interface';

export class NotificationTemplate implements INotificationTemplate {
  id: number;
  key: string;
  category: INotificationTemplate['category'];
  portal: INotificationTemplate['portal'];
  titleFr: string;
  bodyFr: string;
  titleAr: string;
  bodyAr: string;
  description: string;
  enabled: boolean;
  priority: string;
  dateCreated: string;
  dateUpdated: string;

  constructor(data: INotificationTemplate) {
    this.id = data.id;
    this.key = data.key;
    this.category = data.category;
    this.portal = data.portal;
    this.titleFr = data.titleFr;
    this.bodyFr = data.bodyFr;
    this.titleAr = data.titleAr;
    this.bodyAr = data.bodyAr;
    this.description = data.description;
    this.enabled = data.enabled ?? true;
    this.priority = data.priority ?? 'medium';
    this.dateCreated = data.dateCreated || data.date_created;
    this.dateUpdated = data.dateUpdated || data.date_updated;
  }

  static fromApiResponse(data: Record<string, unknown>): NotificationTemplate {
    return new NotificationTemplate({
      id: data['id'] as number,
      key: data['key'] as string,
      category: data['category'] as INotificationTemplate['category'],
      portal: data['portal'] as INotificationTemplate['portal'],
      titleFr: data['titleFr'] as string,
      bodyFr: data['bodyFr'] as string,
      titleAr: data['titleAr'] as string,
      bodyAr: data['bodyAr'] as string,
      description: (data['description'] as string) || '',
      enabled: (data['enabled'] as boolean) ?? true,
      priority: (data['priority'] as string) || 'medium',
      dateCreated: (data['dateCreated'] || data['date_created']) as string,
      dateUpdated: (data['dateUpdated'] || data['date_updated']) as string,
    });
  }
}
