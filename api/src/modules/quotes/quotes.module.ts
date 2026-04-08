import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { TenantModule } from '../tenant/tenant.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { PDFModule } from '../pdf/pdf.module';
import { SequencesModule } from '../sequences/sequences.module';

@Module({
  imports: [TenantModule, ConfigurationsModule, PDFModule, SequencesModule],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
