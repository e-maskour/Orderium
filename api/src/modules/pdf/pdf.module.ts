import { Module } from '@nestjs/common';
import { PDFController } from './pdf.controller';
import { PDFService } from './pdf.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice, InvoiceItem } from '../invoices/entities/invoice.entity';
import { Quote, QuoteItem } from '../quotes/entities/quote.entity';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { Order, OrderItem } from '../orders/entities/order.entity';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Quote,
      QuoteItem,
      Order,
      OrderItem,
    ]),
    ConfigurationsModule,
    ImagesModule,
  ],
  controllers: [PDFController],
  providers: [PDFService],
  exports: [PDFService],
})
export class PDFModule {}
