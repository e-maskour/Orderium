import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './push-notification.service';
import { OrderNotificationService } from './order-notification.service';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { Portal } from '../portal/entities/portal.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderDelivery } from '../delivery/entities/delivery.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      DeviceToken,
      Portal,
      Order,
      OrderDelivery,
    ]),
  ],
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
export class NotificationsModule {}
