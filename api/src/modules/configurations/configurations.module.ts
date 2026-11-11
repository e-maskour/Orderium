import { Module } from '@nestjs/common';
import { ConfigurationsController } from './configurations.controller';
import { ConfigurationsService } from './configurations.service';
import { TenantModule } from '../tenant/tenant.module';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [TenantModule, ImagesModule],
  controllers: [ConfigurationsController],
  providers: [ConfigurationsService],
  exports: [ConfigurationsService],
})
export class ConfigurationsModule {}
