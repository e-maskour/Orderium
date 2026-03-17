import { Module } from '@nestjs/common';
import { PDFController } from './pdf.controller';
import { PDFService } from './pdf.service';
import { TenantModule } from '../tenant/tenant.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [
    TenantModule,
    ConfigurationsModule,
    ImagesModule,
  ],
  controllers: [PDFController],
  providers: [PDFService],
  exports: [PDFService],
})
export class PDFModule { }
