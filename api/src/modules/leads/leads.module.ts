import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadsService } from './leads.service';
import {
  AdminLeadsController,
  PublicLeadsController,
} from './leads.controller';
import { TenantModule } from '../tenant/tenant.module';

/** Landing-page leads (master database). TenantModule provides SuperAdminGuard. */
@Module({
  imports: [TypeOrmModule.forFeature([Lead], 'master'), TenantModule],
  controllers: [PublicLeadsController, AdminLeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
