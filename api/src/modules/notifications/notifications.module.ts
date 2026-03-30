import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './push-notification.service';
import { OrderNotificationService } from './order-notification.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationTemplatesController } from './notification-templates.controller';
import { ScheduledNotificationsService } from './scheduled-notifications.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [NotificationsController, NotificationTemplatesController],
  providers: [
    NotificationsService,
    PushNotificationService,
    OrderNotificationService,
    NotificationTemplateService,
    ScheduledNotificationsService,
  ],
  exports: [
    NotificationsService,
    PushNotificationService,
    OrderNotificationService,
    NotificationTemplateService,
  ],
})
export class NotificationsModule { }
