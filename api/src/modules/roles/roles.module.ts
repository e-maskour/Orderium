import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TenantModule } from '../tenant/tenant.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [TenantModule, PermissionsModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
