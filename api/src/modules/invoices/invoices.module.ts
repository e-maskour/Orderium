import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice, InvoiceItem } from './entities/invoice.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { PDFModule } from '../pdf/pdf.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem, Product]),
    ConfigurationsModule,
    PDFModule,
    InventoryModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
