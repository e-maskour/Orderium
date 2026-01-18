import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice, InvoiceItem } from './entities/invoice.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationsModule } from '../configurations/configurations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem, Product]),
    ConfigurationsModule
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
