import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { PDFController } from './pdf.controller';
import { PDFService } from './pdf.service';
import { PdfQueueService } from './pdf.queue.service';
import { PdfQueueProcessor } from './pdf.queue.processor';
import { TenantModule } from '../tenant/tenant.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { ImagesModule } from '../images/images.module';
import { QueueName } from '../../common/queues/queue.constants';

@Module({
  imports: [
    TenantModule,
    ConfigurationsModule,
    ImagesModule,
    BullModule.registerQueue({ name: QueueName.PDF_GENERATION }),
    BullBoardModule.forFeature({
      name: QueueName.PDF_GENERATION,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [PDFController],
  providers: [PDFService, PdfQueueService, PdfQueueProcessor],
  exports: [PDFService, PdfQueueService],
})
export class PDFModule {}
