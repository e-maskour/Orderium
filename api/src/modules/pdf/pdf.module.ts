import { Module } from '@nestjs/common';
import { PDFController } from './pdf.controller';
import { PDFService } from './pdf.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [PDFController],
  providers: [PDFService],
  exports: [PDFService]
})
export class PDFModule {}