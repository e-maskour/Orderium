import { Module } from '@nestjs/common';
import { PDFController } from './pdf.controller';
import { PDFService } from './pdf.service';
import { OrdersModule } from '../orders/orders.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice, InvoiceItem } from '../invoices/entities/invoice.entity';
import { Quote, QuoteItem } from '../quotes/entities/quote.entity';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { Order, OrderItem } from '../orders/entities/order.entity';

@Module({
  imports: [
    OrdersModule,
    TypeOrmModule.forFeature([Invoice, InvoiceItem, Quote, QuoteItem, Order, OrderItem]),
    ConfigurationsModule,
  ],
  controllers: [PDFController],
  providers: [PDFService],
  exports: [PDFService]
})
export class PDFModule {}