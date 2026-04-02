import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BulkService } from './bulk.service';
import { BulkController } from './bulk.controller';
import { BulkQueueProcessor } from './bulk.queue.processor';
import { TenantModule } from '../tenant/tenant.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ProductsModule } from '../products/products.module';
import { ImagesModule } from '../images/images.module';
import { QueueName } from '../../common/queues/queue.constants';

@Module({
  imports: [
    TenantModule,
    ImagesModule,
    OrdersModule,
    InvoicesModule,
    ProductsModule,
    BullModule.registerQueue({ name: QueueName.BULK_OPERATIONS }),
    BullBoardModule.forFeature({
      name: QueueName.BULK_OPERATIONS,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [BulkController],
  providers: [BulkService, BulkQueueProcessor],
})
export class BulkModule {}
