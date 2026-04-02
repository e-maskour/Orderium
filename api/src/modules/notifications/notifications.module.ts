import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './push-notification.service';
import { OrderNotificationService } from './order-notification.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationTemplatesController } from './notification-templates.controller';
import { ScheduledNotificationsService } from './scheduled-notifications.service';
import { NotificationsQueueService } from './notifications.queue.service';
import { NotificationsQueueProcessor } from './notifications.queue.processor';
import { TenantModule } from '../tenant/tenant.module';
import { QueueName } from '../../common/queues/queue.constants';

@Module({
  imports: [
    TenantModule,
    BullModule.registerQueue({ name: QueueName.NOTIFICATIONS }),
    BullBoardModule.forFeature({
      name: QueueName.NOTIFICATIONS,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [NotificationsController, NotificationTemplatesController],
  providers: [
    NotificationsService,
    PushNotificationService,
    OrderNotificationService,
    NotificationTemplateService,
    ScheduledNotificationsService,
    NotificationsQueueService,
    NotificationsQueueProcessor,
  ],
  exports: [
    NotificationsService,
    PushNotificationService,
    OrderNotificationService,
    NotificationTemplateService,
    NotificationsQueueService,
  ],
})
export class NotificationsModule {}
