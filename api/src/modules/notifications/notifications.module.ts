import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './push-notification.service';
import { OrderNotificationService } from './order-notification.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushNotificationService,
    OrderNotificationService,
  ],
  exports: [
    NotificationsService,
    PushNotificationService,
    OrderNotificationService,
  ],
})
export class NotificationsModule { }
