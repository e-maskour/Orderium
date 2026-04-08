import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { TenantModule } from '../tenant/tenant.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { PDFModule } from '../pdf/pdf.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SequencesModule } from '../sequences/sequences.module';

@Module({
  imports: [TenantModule, ConfigurationsModule, PDFModule, InventoryModule, SequencesModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule { }
